// Fonctions utilitaires pour les calculs
function addNumbers(a, b) {
    return a + b;
}

function subtractNumbers(a, b) {
    return a - b;
}

function multiplyNumbers(a, b) {
    return a * b;
}

function divideNumbers(a, b) {
    return a / b;
}

// Fonction de validation
function isValidNumber(value) {
    return !isNaN(value) && isFinite(value);
}

// Export pour les tests (si environnement Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addNumbers,
        subtractNumbers,
        multiplyNumbers,
        divideNumbers,
        isValidNumber
    };
}