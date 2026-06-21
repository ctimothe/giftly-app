interface ContributionBoundsInput {
    requestedAmount: number;
    price: number | null;
    collectedAmount: number;
}

interface ContributionBoundsResult {
    acceptedAmount: number;
    remainingBefore: number;
    remainingAfter: number;
    willFullyFund: boolean;
}

const toCents = (value: number) => Math.round(value * 100);
const fromCents = (value: number) => value / 100;

export const getContributionBounds = (input: ContributionBoundsInput): ContributionBoundsResult => {
    const requestedCents = toCents(input.requestedAmount);
    if (requestedCents <= 0) {
        throw new Error('Contribution amount must be greater than zero');
    }

    // Open-ended contribution for items without a target price.
    if (input.price === null) {
        return {
            acceptedAmount: fromCents(requestedCents),
            remainingBefore: 0,
            remainingAfter: 0,
            willFullyFund: false,
        };
    }

    const priceCents = toCents(input.price);
    const collectedCents = toCents(input.collectedAmount);
    const remainingCents = Math.max(priceCents - collectedCents, 0);

    if (remainingCents <= 0) {
        throw new Error('Item is already fully funded');
    }

    if (requestedCents > remainingCents) {
        throw new Error(`Contribution exceeds remaining amount. Maximum allowed is $${fromCents(remainingCents).toFixed(2)}`);
    }

    const remainingAfterCents = remainingCents - requestedCents;

    return {
        acceptedAmount: fromCents(requestedCents),
        remainingBefore: fromCents(remainingCents),
        remainingAfter: fromCents(remainingAfterCents),
        willFullyFund: remainingAfterCents <= 0,
    };
};
