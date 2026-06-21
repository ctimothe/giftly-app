import { describe, expect, it } from 'vitest';
import { getContributionBounds } from '../src/services/ContributionService';

describe('getContributionBounds', () => {
    it('rejects non-positive contribution amounts', () => {
        expect(() => getContributionBounds({
            requestedAmount: 0,
            price: 100,
            collectedAmount: 20,
        })).toThrow('Contribution amount must be greater than zero');
    });

    it('allows open-ended contributions when item has no target price', () => {
        const result = getContributionBounds({
            requestedAmount: 37.42,
            price: null,
            collectedAmount: 0,
        });

        expect(result.acceptedAmount).toBe(37.42);
        expect(result.willFullyFund).toBe(false);
        expect(result.remainingBefore).toBe(0);
    });

    it('rejects if item is already fully funded', () => {
        expect(() => getContributionBounds({
            requestedAmount: 5,
            price: 50,
            collectedAmount: 50,
        })).toThrow('Item is already fully funded');
    });

    it('rejects contribution above remaining amount', () => {
        expect(() => getContributionBounds({
            requestedAmount: 30,
            price: 50,
            collectedAmount: 40,
        })).toThrow('Contribution exceeds remaining amount. Maximum allowed is $10.00');
    });

    it('marks exact remaining contribution as fully funded', () => {
        const result = getContributionBounds({
            requestedAmount: 10,
            price: 50,
            collectedAmount: 40,
        });

        expect(result.acceptedAmount).toBe(10);
        expect(result.remainingBefore).toBe(10);
        expect(result.remainingAfter).toBe(0);
        expect(result.willFullyFund).toBe(true);
    });

    it('returns accurate remaining amount for partial contribution', () => {
        const result = getContributionBounds({
            requestedAmount: 15,
            price: 120,
            collectedAmount: 20,
        });

        expect(result.acceptedAmount).toBe(15);
        expect(result.remainingBefore).toBe(100);
        expect(result.remainingAfter).toBe(85);
        expect(result.willFullyFund).toBe(false);
    });
});
