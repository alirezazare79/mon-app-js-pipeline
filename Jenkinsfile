pipeline {
  agent any

  tools {
    nodejs 'NodeJS-18'   // ==> correspond EXACTEMENT au Name configuré
  }

  environment {
    APP_NAME   = 'mon-app-js'
    DEPLOY_DIR = '/var/www/html/mon-app'
    // Pour le rapport JUnit de Jest :
    JEST_JUNIT_OUTPUT = 'reports/junit/jest-results.xml'
  }

  stages {
    stage('Checkout') {
      steps {
        echo 'Récupération du code source...'
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        echo 'Installation des dépendances Node.js...'
        sh '''
          node --version
          npm --version
          if [ -f package-lock.json ]; then
            npm ci
          else
            npm install
          fi
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
          // Remplace publishTestResults par le step standard :
          junit allowEmptyResults: true, testResults: 'reports/junit/*.xml'
        }
      }
    }

    stage('Code Quality Check') {
      steps {
        echo 'Vérification de la qualité du code...'
        sh '''
          echo "Vérification de la syntaxe JavaScript..."
          find src -name "*.js" -print0 | xargs -0 -I{} node --check {}
          echo "Vérification terminée"
        '''
      }
    }

    stage('Build') {
      steps {
        echo 'Construction de l\'application...'
        sh '''
          npm run build
          ls -la dist/ || true
        '''
        archiveArtifacts artifacts: 'dist/**', fingerprint: true, allowEmptyArchive: true
      }
    }

    stage('Security Scan') {
      steps {
        echo 'Analyse de sécurité...'
        sh '''
          mkdir -p reports
          npm audit --audit-level=high > reports/npm-audit.txt || true
        '''
        archiveArtifacts artifacts: 'reports/npm-audit.txt', allowEmptyArchive: true
      }
    }

    // Ajuste les branches à ta réalité : tes logs montrent "master"
    stage('Deploy to Staging') {
      when { branch 'develop' } // laisse si tu as bien une branche develop
      steps {
        echo 'Déploiement vers l\'environnement de staging...'
        sh '''
          echo "Déploiement staging simulé"
          mkdir -p staging
          cp -r dist/* staging/ || true
        '''
      }
    }

    stage('Deploy to Production') {
      when { branch 'master' } // <= ton repo actuel
      steps {
        echo 'Déploiement vers la production...'
        sh '''
          echo "Sauvegarde de la version précédente..."
          if [ -d "${DEPLOY_DIR}" ]; then
            cp -r ${DEPLOY_DIR} ${DEPLOY_DIR}_backup_$(date +%Y%m%d_%H%M%S)
          fi

          echo "Déploiement de la nouvelle version..."
          mkdir -p ${DEPLOY_DIR}
          cp -r dist/* ${DEPLOY_DIR}/ || true

          echo "Vérification du déploiement..."
          ls -la ${DEPLOY_DIR} || true
        '''
      }
    }

    stage('Health Check') {
      steps {
        echo 'Vérification de santé de l\'application...'
        script {
          try {
            sh '''
              echo "Test de connectivité..."
              # Simulation d'un health check
              echo "Application déployée avec succès"
            '''
          } catch (Exception e) {
            currentBuild.result = 'UNSTABLE'
            echo "Warning: Health check failed: ${e.getMessage()}"
          }
        }
      }
    }
  }

  post {
    always {
      echo 'Nettoyage des ressources temporaires...'
      sh '''
        rm -rf node_modules/.cache || true
        rm -rf staging || true
      '''
    }
    success {
      echo 'Pipeline exécuté avec succès!'
      script {
        def toAddr = (env.CHANGE_AUTHOR_EMAIL ?: '').trim()
        if (toAddr) {
          emailext (
            subject: "Build Success: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
            body: """Le déploiement de ${env.JOB_NAME} s'est terminé avec succès.
Build: ${env.BUILD_NUMBER}
Branch: ${env.BRANCH_NAME}
Voir les détails: ${env.BUILD_URL}""",
            to: toAddr
          )
        } else {
          echo 'Aucun CHANGE_AUTHOR_EMAIL -> aucun email envoyé.'
        }
      }
    }
    failure {
      echo 'Le pipeline a échoué!'
      script {
        def toAddr = (env.CHANGE_AUTHOR_EMAIL ?: '').trim()
        if (toAddr) {
          emailext (
            subject: "Build Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
            body: """Le déploiement de ${env.JOB_NAME} a échoué.
Build: ${env.BUILD_NUMBER}
Branch: ${env.BRANCH_NAME}
Voir les détails: ${env.BUILD_URL}""",
            to: toAddr
          )
        } else {
          echo 'Aucun CHANGE_AUTHOR_EMAIL -> aucun email envoyé.'
        }
      }
    }
    unstable {
      echo 'Build instable - des avertissements ont été détectés'
    }
  }
}
