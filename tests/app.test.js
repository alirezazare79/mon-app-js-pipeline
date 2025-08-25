const { addNumbers, subtractNumbers, multiplyNumbers, divideNumbers, isValidNumber } = require('../src/utils.js');

describe('Tests de la calculatrice', () => {
    test('Addition de deux nombres', () => {
        expect(addNumbers(2, 3)).toBe(5);
        expect(addNumbers(-1, 1)).toBe(0);
        expect(addNumbers(0.1, 0.2)).toBeCloseTo(0.3);
    });

    test('Soustraction de deux nombres', () => {
        expect(subtractNumbers(5, 3)).toBe(2);
        expect(subtractNumbers(0, 5)).toBe(-5);
        expect(subtractNumbers(10, 10)).toBe(0);
    });

    test('Multiplication de deux nombres', () => {
        expect(multiplyNumbers(3, 4)).toBe(12);
        expect(multiplyNumbers(-2, 5)).toBe(-10);
        expect(multiplyNumbers(0, 100)).toBe(0);
    });

    test('Division de deux nombres', () => {
        expect(divideNumbers(10, 2)).toBe(5);
        expect(divideNumbers(9, 3)).toBe(3);
        expect(divideNumbers(1, 4)).toBe(0.25);
    });

    test('Validation des nombres', () => {
        expect(isValidNumber(42)).toBe(true);
        expect(isValidNumber(0)).toBe(true);
        expect(isValidNumber(-10)).toBe(true);
        expect(isValidNumber(NaN)).toBe(false);
        expect(isValidNumber(Infinity)).toBe(false);
    });
});