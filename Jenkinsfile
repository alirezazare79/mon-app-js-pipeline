pipeline {
  agent any
  tools { nodejs 'NodeJS-18' }

  environment {
    APP_NAME      = 'mon-app-js'
    BUILD_DIR     = 'dist'
    ARTIFACT_DIR  = 'artifacts'

    // ⚠️ Si /var/www n'est pas accessible: remplace par /var/jenkins_home/deploy/...
    STAGING_DIR   = '/var/www/staging/mon-app'
    PROD_DIR      = '/var/www/html/mon-app'

    JEST_JUNIT_OUTPUT = 'reports/junit/jest-results.xml'
    STAGING_URL   = ''
    PROD_URL      = ''
    CURRENT_BRANCH = ''

    // Slack (à adapter)
    SLACK_TEAM    = 'votre-workspace'          // ex: mycompany
    SLACK_CHANNEL = '#ci'                      // ex: #ci
    SLACK_TOKEN_ID = 'slack-bot-token'         // ID du credential Jenkins (Secret text)
  }

  stages {
    stage('Checkout') {
      steps {
        echo 'Récupération du code source...'
        checkout scm
      }
    }

    stage('Detect Branch') {
      steps {
        script {
          def br = (env.BRANCH_NAME ?: env.GIT_BRANCH ?: '').replaceFirst(/^origin\//,'')
          if (!br?.trim() || br == 'HEAD') {
            br = sh(
              script: "git for-each-ref --format='%(refname:short)' --points-at HEAD refs/remotes | sed -n 's#^origin/##p' | head -n1",
              returnStdout: true
            ).trim()
          }
          if (!br?.trim()) {
            br = sh(
              script: "git branch -r --contains HEAD | sed -n 's# *origin/##p' | head -n1",
              returnStdout: true
            ).trim()
          }
          env.CURRENT_BRANCH = br ?: ''
          echo ">> Branche détectée: ${env.CURRENT_BRANCH ?: 'inconnue'}"
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        echo 'Installation des dépendances Node.js...'
        sh '''
          set -e
          node -v
          npm -v
          if [ -f package-lock.json ]; then npm ci; else npm install; fi
        '''
      }
    }

    stage('Run Tests') {
      steps {
        echo 'Exécution des tests + couverture...'
        sh 'npm test -- --ci --coverage'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'reports/junit/*.xml'
        }
      }
    }

    stage('Publish Coverage') {
      steps {
        echo 'Publication de la couverture...'
        // Nécessite Code Coverage API plugin
        publishCoverage(
          adapters: [coberturaAdapter('coverage/cobertura-coverage.xml')],
          sourceFileResolver: sourceFiles('STORE_LAST_BUILD'),
          // Seuils Jenkins (en plus de jest.coverageThreshold)
          failUnhealthy: true,
          failUnstable: true,
          healthyTarget:    [lineCoverage: 80, conditionalCoverage: 70],
          unhealthyTarget:  [lineCoverage: 50, conditionalCoverage: 40]
        )
        // Lien HTML (si plugin HTML Publisher installé)
        publishHTML(target: [
          reportDir: 'coverage/lcov-report',
          reportFiles: 'index.html',
          reportName: 'Coverage Report',
          keepAll: true,
          alwaysLinkToLastBuild: true
        ])
      }
    }

    stage('Code Quality Check') {
      steps {
        echo 'Vérification de la qualité du code...'
        sh '''
          echo "Vérification de la syntaxe JavaScript…"
          find src -name "*.js" -print0 | xargs -0 -I{} node --check {}
          echo "OK"
        '''
      }
    }

    stage('Build') {
      steps {
        echo 'Construction de l’application...'
        sh '''
          set -e
          npm run build
          mkdir -p "$ARTIFACT_DIR"
          ARTIFACT="${APP_NAME}-${BUILD_NUMBER}.tar.gz"
          echo ">> Packaging $ARTIFACT"
          tar -czf "$ARTIFACT_DIR/$ARTIFACT" -C "$BUILD_DIR" .
          ls -la "$ARTIFACT_DIR" || true
        '''
        // 🔒 Archivage du paquet et du build
        archiveArtifacts artifacts: 'artifacts/*.tar.gz, dist/**', fingerprint: true, allowEmptyArchive: true
        // 🔒 Archivage des rapports de couverture
        archiveArtifacts artifacts: 'coverage/**', fingerprint: false, allowEmptyArchive: true
      }
    }

    stage('Security Scan') {
      steps {
        echo 'Analyse de sécurité…'
        sh '''
          mkdir -p reports
          npm audit --audit-level=high > reports/npm-audit.txt || true
        '''
        archiveArtifacts artifacts: 'reports/npm-audit.txt', allowEmptyArchive: true
      }
    }

    /* -------- STAGING (develop) -------- */
    stage('Deploy to Staging') {
      when { expression { env.CURRENT_BRANCH == 'develop' } }
      steps {
        echo 'Déploiement vers STAGING…'
        sh '''
          set -e
          ARTIFACT="${APP_NAME}-${BUILD_NUMBER}.tar.gz"
          mkdir -p "$STAGING_DIR"
          tar -xzf "$ARTIFACT_DIR/$ARTIFACT" -C "$STAGING_DIR"
          ls -la "$STAGING_DIR" || true
        '''
        echo 'Staging: déploiement terminé'
      }
    }

    stage('Health Check (Staging)') {
      when { expression { env.CURRENT_BRANCH == 'develop' } }
      steps {
        sh '''
          if [ -n "$STAGING_URL" ]; then
            command -v curl >/dev/null 2>&1 && curl -fsS "$STAGING_URL" >/dev/null && echo "OK" || echo "Healthcheck STAGING échoué/ignoré"
          else
            echo "Aucune URL STAGING définie, check ignoré"
          fi
        '''
      }
    }

    /* -------- PRODUCTION (master/main) -------- */
    stage('Deploy to Production') {
      when { expression { env.CURRENT_BRANCH in ['master','main'] } }
      steps {
        timeout(time: 10, unit: 'MINUTES') {
          input message: 'Confirmer le déploiement en PRODUCTION ?'
        }
        echo 'Déploiement vers PRODUCTION…'
        sh '''
          set -e
          ARTIFACT="${APP_NAME}-${BUILD_NUMBER}.tar.gz"
          if [ -d "$PROD_DIR" ]; then
            cp -r "$PROD_DIR" "${PROD_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
          fi
          mkdir -p "$PROD_DIR"
          tar -xzf "$ARTIFACT_DIR/$ARTIFACT" -C "$PROD_DIR"
          ls -la "$PROD_DIR" || true
        '''
        echo 'Production: déploiement terminé'
      }
    }

    stage('Health Check (Production)') {
      when { expression { env.CURRENT_BRANCH in ['master','main'] } }
      steps {
        sh '''
          if [ -n "$PROD_URL" ]; then
            command -v curl >/dev/null 2>&1 && curl -fsS "$PROD_URL" >/dev/null && echo "OK" || echo "Healthcheck PROD échoué/ignoré"
          else
            echo "Aucune URL PROD définie, check ignoré"
          fi
        '''
      }
    }
  }

  post {
    always {
      echo 'Nettoyage…'
      sh 'rm -rf node_modules/.cache || true'
      script {
        // 🔔 Slack générique (ne casse pas le build si non configuré)
        try {
          slackSend teamDomain: env.SLACK_TEAM, tokenCredentialId: env.SLACK_TOKEN_ID,
                    channel: env.SLACK_CHANNEL, color: '#AAAAAA',
                    message: "ℹ️ ${env.JOB_NAME} #${env.BUILD_NUMBER} terminé avec statut: ${currentBuild.currentResult} (${env.CURRENT_BRANCH}) — ${env.BUILD_URL}"
        } catch (e) { echo "Slack non configuré: ${e.message}" }
      }
    }
    success {
      script {
        try {
          slackSend teamDomain: env.SLACK_TEAM, tokenCredentialId: env.SLACK_TOKEN_ID,
                    channel: env.SLACK_CHANNEL, color: 'good',
                    message: "✅ SUCCESS — ${env.JOB_NAME} #${env.BUILD_NUMBER} (${env.CURRENT_BRANCH}) — ${env.BUILD_URL}"
        } catch (e) { /* ignore */ }
      }
    }
    unstable {
      script {
        try {
          slackSend teamDomain: env.SLACK_TEAM, tokenCredentialId: env.SLACK_TOKEN_ID,
                    channel: env.SLACK_CHANNEL, color: 'warning',
                    message: "🟠 UNSTABLE — ${env.JOB_NAME} #${env.BUILD_NUMBER} (${env.CURRENT_BRANCH}) — ${env.BUILD_URL}"
        } catch (e) { /* ignore */ }
      }
    }
    failure {
      script {
        try {
          slackSend teamDomain: env.SLACK_TEAM, tokenCredentialId: env.SLACK_TOKEN_ID,
                    channel: env.SLACK_CHANNEL, color: 'danger',
                    message: "❌ FAILURE — ${env.JOB_NAME} #${env.BUILD_NUMBER} (${env.CURRENT_BRANCH}) — ${env.BUILD_URL}"
        } catch (e) { /* ignore */ }
      }
    }
  }
}
