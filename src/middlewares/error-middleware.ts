import { Request, Response, NextFunction } from 'express';
import ApiError from '@/exceptions/api-error';

export default function errorMiddleware(
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    console.error(err);

    if (err instanceof ApiError) {
        res.status(err.status).json({
            message: err.message,
            errors: err.errors,
        });
    } else {
        res.status(500).json({
            message: req.t?.('unexpected_error') || 'Unexpected error occurred',
        });
    }
}
