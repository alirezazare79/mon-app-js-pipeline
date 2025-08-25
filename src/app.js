// Application principale
document.addEventListener('DOMContentLoaded', function() {
    updateTimestamp();
    console.log('Application chargée avec succès');
});

function calculate() {
    const num1 = parseFloat(document.getElementById('num1').value);
    const num2 = parseFloat(document.getElementById('num2').value);
    const operation = document.getElementById('operation').value;
    const resultDiv = document.getElementById('result');

    if (isNaN(num1) || isNaN(num2)) {
        resultDiv.innerHTML = 'Erreur: Veuillez entrer des nombres valides';
        resultDiv.className = 'error';
        return;
    }

    let result;
    switch(operation) {
        case 'add':
            result = addNumbers(num1, num2);
            break;
        case 'subtract':
            result = subtractNumbers(num1, num2);
            break;
        case 'multiply':
            result = multiplyNumbers(num1, num2);
            break;
        case 'divide':
            if (num2 === 0) {
                resultDiv.innerHTML = 'Erreur: Division par zéro impossible';
                resultDiv.className = 'error';
                return;
            }
            result = divideNumbers(num1, num2);
            break;
        default:
            result = 'Opération non supportée';
    }

    resultDiv.innerHTML = `Résultat: ${result}`;
    resultDiv.className = 'success';
}

function updateTimestamp() {
    const timestampElement = document.getElementById('timestamp');
    if (timestampElement) {
        timestampElement.textContent = new Date().toLocaleString('fr-FR');
    }
}