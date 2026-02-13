import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
    windowMs: number;
    max: number;
    keyPrefix: string;
    message: string;
}

interface Bucket {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, Bucket>();

const cleanupExpiredBuckets = () => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
            buckets.delete(key);
        }
    }
};

const getClientIp = (req: Request) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
        return forwardedFor.split(',')[0].trim();
    }

    return req.ip || 'unknown';
};

export const createRateLimiter = (options: RateLimitOptions) => {
    return (req: Request, res: Response, next: NextFunction) => {
        cleanupExpiredBuckets();

        const now = Date.now();
        const key = `${options.keyPrefix}:${getClientIp(req)}`;
        const existing = buckets.get(key);

        if (!existing || existing.resetAt <= now) {
            buckets.set(key, {
                count: 1,
                resetAt: now + options.windowMs,
            });
            return next();
        }

        if (existing.count >= options.max) {
            const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
            res.setHeader('Retry-After', Math.max(retryAfterSeconds, 1));
            return res.status(429).json({
                error: options.message,
            });
        }

        existing.count += 1;
        buckets.set(key, existing);
        return next();
    };
};

export const defaultApiLimiter = createRateLimiter({
    windowMs: 60_000,
    max: 300,
    keyPrefix: 'api',
    message: 'Too many requests, please try again in a minute',
});

export const authLimiter = createRateLimiter({
    windowMs: 60_000,
    max: 25,
    keyPrefix: 'auth',
    message: 'Too many auth attempts, please try again shortly',
});

export const mutationLimiter = createRateLimiter({
    windowMs: 60_000,
    max: 80,
    keyPrefix: 'mutation',
    message: 'Too many mutation requests, please slow down',
});