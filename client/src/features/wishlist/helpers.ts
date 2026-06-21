export const getApiErrorMessage = (error: unknown, fallback: string) => {
    const payload = error as {
        response?: {
            data?: {
                error?: { message?: string } | string;
            };
        };
    };

    const nestedError = payload.response?.data?.error;
    return (typeof nestedError === 'string' ? nestedError : nestedError?.message)
        || fallback;
};

export const toCurrency = (value: number) => Number(value).toFixed(2);
