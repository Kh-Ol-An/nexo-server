import { Request, Response, NextFunction } from 'express';
import ApiError from '@/exceptions/api-error';
import TokenService from '@/services/token';

/**
 * Middleware для перевірки авторизації користувача через токен доступу.
 */
export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    try {
        const authorizationHeader = req.headers.authorization;
        if (!authorizationHeader) {
            return next(ApiError.UnauthorizedError(req.t('not_auth')));
        }

        const accessToken = authorizationHeader.split(' ')[1];
        if (!accessToken) {
            return next(ApiError.UnauthorizedError(req.t('not_auth')));
        }

        const userData = TokenService.validateAccessToken(accessToken);
        if (!userData) {
            return next(ApiError.UnauthorizedError(req.t('not_auth')));
        }

        // Додаємо користувача в об'єкт `req` для подальшого використання
        (req as any).user = userData;
        next();
    } catch (error) {
        next(ApiError.UnauthorizedError(req.t('not_auth')));
    }
};
