pipeline {
  agent any
  tools { nodejs 'NodeJS-18' }

  parameters {
    choice(
      name: 'DEPLOY_TARGET',
      choices: ['auto', 'staging', 'production', 'none'],
      description: 'Override déploiement: auto = develop→staging, master/main→production'
    )
  }

  environment {
    APP_NAME      = 'mon-app-js'
    BUILD_DIR     = 'dist'
    ARTIFACT_DIR  = 'artifacts'
    STAGING_DIR   = '/var/www/staging/mon-app'
    PROD_DIR      = '/var/www/html/mon-app'
    STAGING_URL   = ''   // ex: http://staging.host/health
    PROD_URL      = ''   // ex: http://prod.host/health
    JEST_JUNIT_OUTPUT = 'reports/junit/jest-results.xml'

    CURRENT_BRANCH = ''
    RESOLVED_TARGET = ''   // staging | production | none
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
          // Essaie les env Jenkins (multibranch), sinon détecte côté Git
          def br = (env.BRANCH_NAME ?: env.GIT_BRANCH ?: '').replaceFirst(/^origin\//, '')
          if (!br?.trim() || br == 'HEAD') {
            // Cherche la 1ère branche distante pointant exactement sur HEAD
            br = sh(
              script: "git for-each-ref --format='%(refname:short)' --points-at HEAD refs/remotes | head -n1 | sed 's#^origin/##'",
              returnStdout: true
            ).trim()
          }
          // Fallback ultime: si on trouve origin/master ou origin/main
          if (!br?.trim()) {
            br = sh(
              script: "(git rev-parse --verify --quiet origin/master >/dev/null && echo master) || (git rev-parse --verify --quiet origin/main >/dev/null && echo main) || echo ''",
              returnStdout: true
            ).trim()
          }
          env.CURRENT_BRANCH = br ?: ''
          echo ">> Branche détectée: ${env.CURRENT_BRANCH ?: 'inconnue'}"
        }
      }
    }

    stage('Decide Deploy Target') {
      steps {
        script {
          def target = params.DEPLOY_TARGET ?: 'auto'
          if (target == 'auto') {
            if (env.CURRENT_BRANCH == 'develop') {
              target = 'staging'
            } else if (env.CURRENT_BRANCH in ['master','main']) {
              target = 'production'
            } else {
              target = 'none'
            }
          }
          env.RESOLVED_TARGET = target
          echo ">> DEPLOY_TARGET=${params.DEPLOY_TARGET} → Résolu: ${env.RESOLVED_TARGET}"
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
          mkdir -p "$ARTIFACT_DIR"
          ARTIFACT="${APP_NAME}-${BUILD_NUMBER}.tar.gz"
          echo ">> Packaging $ARTIFACT"
          tar -czf "$ARTIFACT_DIR/$ARTIFACT" -C "$BUILD_DIR" .
          ls -la "$ARTIFACT_DIR" || true
        '''
        archiveArtifacts artifacts: 'artifacts/*.tar.gz', fingerprint: true
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

    /************** STAGING **************/
    stage('Deploy to Staging') {
      when { expression { env.RESOLVED_TARGET == 'staging' } }
      steps {
        echo 'Déploiement vers STAGING…'
        sh '''
          set -e
          ARTIFACT="${APP_NAME}-${BUILD_NUMBER}.tar.gz"
          mkdir -p "$STAGING_DIR"
          tar -xzf "$ARTIFACT_DIR/$ARTIFACT" -C "$STAGING_DIR"
        '''
        echo 'Staging: déploiement terminé'
      }
    }

    stage('Health Check (Staging)') {
      when { expression { env.RESOLVED_TARGET == 'staging' } }
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

    /************** PRODUCTION **************/
    stage('Deploy to Production') {
      when { expression { env.RESOLVED_TARGET == 'production' } }
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
      when { expression { env.RESOLVED_TARGET == 'production' } }
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
    }
    success { echo 'Pipeline exécuté avec succès!' }
    failure { echo 'Le pipeline a échoué!' }
    unstable { echo 'Build instable - avertissements détectés' }
  }
}
