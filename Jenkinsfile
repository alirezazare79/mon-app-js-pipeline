pipeline {
  agent any
  tools { nodejs 'NodeJS-18' }   // doit correspondre au nom configuré dans NodeJS Tools

  environment {
    APP_NAME      = 'mon-app-js'
    BUILD_DIR     = 'dist'
    ARTIFACT_DIR  = 'artifacts'
    STAGING_DIR   = '/var/www/staging/mon-app'
    PROD_DIR      = '/var/www/html/mon-app'
    JEST_JUNIT_OUTPUT = 'reports/junit/jest-results.xml'
    // Optionnels (laisser vide si pas de check HTTP)
    STAGING_URL   = ''
    PROD_URL      = ''
    // Sera rempli dynamiquement :
    CURRENT_BRANCH = ''
    ARTIFACT       = ''
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
          def br = (env.BRANCH_NAME ?: env.GIT_BRANCH)
          if (br) { br = br.replaceFirst(/^origin\//,'') }
          if (!br?.trim()) {
            br = sh(script: 'git rev-parse --abbrev-ref HEAD', returnStdout: true).trim()
          }
          env.CURRENT_BRANCH = br
          echo ">> Branche détectée: ${env.CURRENT_BRANCH}"
        }
      }
    }

    stage('Prepare Vars') {
      steps {
        script {
          env.ARTIFACT = "${env.APP_NAME}-${env.BUILD_NUMBER}.tar.gz"
          echo ">> Artefact: ${env.ARTIFACT}"
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
        echo 'Exécution des tests...'
        sh 'npm test -- --ci'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'reports/junit/*.xml'
        }
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
          mkdir -p "${ARTIFACT_DIR}"
          tar -czf "${ARTIFACT_DIR}/${ARTIFACT}" -C "${BUILD_DIR}" .
          ls -la "${ARTIFACT_DIR}" || true
        '''
        archiveArtifacts artifacts: "${ARTIFACT_DIR}/${ARTIFACT}", fingerprint: true
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

    stage('Deploy to Staging') {
      when { expression { env.CURRENT_BRANCH == 'develop' } }
      steps {
        echo 'Déploiement vers STAGING…'
        sh '''
          set -e
          mkdir -p "${STAGING_DIR}"
          tar -xzf "${ARTIFACT_DIR}/${ARTIFACT}" -C "${STAGING_DIR}"
        '''
        echo 'Staging: déploiement terminé'
      }
    }

    stage('Health Check (Staging)') {
      when { expression { env.CURRENT_BRANCH == 'develop' } }
      steps {
        echo 'Vérification de santé STAGING…'
        sh '''
          if [ -n "$STAGING_URL" ]; then
            command -v curl >/dev/null 2>&1 && curl -fsS "$STAGING_URL" >/dev/null && echo "OK" || echo "Healthcheck STAGING échoué/ignoré"
          else
            echo "Aucune URL STAGING définie, check ignoré"
          fi
        '''
      }
    }

    stage('Deploy to Production') {
      when { expression { env.CURRENT_BRANCH == 'master' } }   // change en 'main' si besoin
      steps {
        timeout(time: 10, unit: 'MINUTES') {
          input message: 'Confirmer le déploiement en PRODUCTION ?'
        }
        echo 'Déploiement vers PRODUCTION…'
        sh '''
          set -e
          if [ -d "$PROD_DIR" ]; then
            cp -r "$PROD_DIR" "${PROD_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
          fi
          mkdir -p "$PROD_DIR"
          tar -xzf "${ARTIFACT_DIR}/${ARTIFACT}" -C "$PROD_DIR"
          ls -la "$PROD_DIR" || true
        '''
        echo 'Production: déploiement terminé'
      }
    }

    stage('Health Check (Production)') {
      when { expression { env.CURRENT_BRANCH == 'master' } }   // change en 'main' si besoin
      steps {
        echo 'Vérification de santé PRODUCTION…'
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
    }
    success { echo 'Pipeline exécuté avec succès!' }
    failure { echo 'Le pipeline a échoué!' }
    unstable { echo 'Build instable - avertissements détectés' }
  }
}
