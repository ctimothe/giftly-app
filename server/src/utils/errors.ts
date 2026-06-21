import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { randomUUID } from 'crypto';

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: unknown;

    constructor(statusCode: number, code: string, message: string, details?: unknown) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

interface ApiErrorBody {
    error: {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string;
    };
}

export const withRequestId = (req: Request, res: Response, next: NextFunction) => {
    const incomingRequestId = req.headers['x-request-id'];
    const requestId = typeof incomingRequestId === 'string' && incomingRequestId.trim().length > 0
        ? incomingRequestId
        : randomUUID();

    res.locals.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
};

export const notFoundHandler = (req: Request, res: Response) => {
    const payload: ApiErrorBody = {
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.originalUrl} not found`,
            requestId: res.locals.requestId,
        },
    };

    res.status(404).json(payload);
};

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const requestId = res.locals.requestId as string | undefined;

    if (error instanceof AppError) {
        const payload: ApiErrorBody = {
            error: {
                code: error.code,
                message: error.message,
                details: error.details,
                requestId,
            },
        };
        return res.status(error.statusCode).json(payload);
    }

    if (error instanceof ZodError) {
        const payload: ApiErrorBody = {
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request payload',
                details: error.issues,
                requestId,
            },
        };
        return res.status(400).json(payload);
    }

    const payload: ApiErrorBody = {
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected server error occurred',
            requestId,
        },
    };

    return res.status(500).json(payload);
};

export const toAppError = (
    error: unknown,
    fallback: { statusCode: number; code: string; message: string }
) => {
    if (error instanceof AppError || error instanceof ZodError) {
        return error;
    }

    if (error instanceof Error) {
        return new AppError(fallback.statusCode, fallback.code, error.message);
    }

    return new AppError(fallback.statusCode, fallback.code, fallback.message);
};