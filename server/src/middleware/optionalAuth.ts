// Optional authentication middleware
// Parses JWT if present but does NOT reject unauthenticated requests
// Sets req.user to the decoded payload or undefined

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface UserPayload {
    id: string;
    email: string;
}

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
            req.user = decoded;
        } catch {
            // Invalid token — treat as guest, don't reject
            req.user = undefined;
        }
    }

    next();
};
