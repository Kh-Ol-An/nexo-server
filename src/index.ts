import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import cron from 'node-cron';
import i18nextMiddleware from 'i18next-http-middleware';
import 'module-alias/register';
import i18next from '@/i18n';
import router from '@/router';
import errorMiddleware from '@/middlewares/error-middleware';
import UserService from '@/services/user';

dotenv.config();

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || '';
const DB_URL = process.env.DB_URL || '';

const app = express();

// Middleware для i18next
app.use(i18nextMiddleware.handle(i18next));

// Middleware для парсингу JSON
app.use(express.json());

// Middleware для cookie
app.use(cookieParser());

// Middleware для CORS
app.use(
    cors({
        credentials: true,
        origin: CLIENT_URL,
    }),
);

// Додаткові заголовки для CORS
app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header(
        'Access-Control-Allow-Headers',
        'X-Requested-With,Content-Type,token',
    );
    res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
    res.header('Content-Type', 'application/json;charset=utf-8');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

// Middleware для зміни мови
app.use((req: Request, res: Response, next: NextFunction) => {
    const language = req.headers['accept-language'] || 'ua'; // Дефолтна мова
    req.i18n?.changeLanguage(language).finally(() => next());
});

// Основний роутер
app.use('/', router);

// Обробка помилок
app.use(errorMiddleware);

// Налаштування CRON задач
cron.schedule(
    '0 0 * * *', // every day at 00:00
    // '*/2 * * * *', // кожні дві хвилини
    async () => {
        await UserService.deleteInactiveAccounts();
        await UserService.deleteExpiredPasswordResetLink();
    },
    {
        timezone: 'UTC',
    },
);

// Функція старту сервера
const start = async () => {
    try {
        await mongoose.connect(DB_URL);
        app.listen(PORT, () => console.log(`Server started on PORT: ${PORT}`));
    } catch (error) {
        console.error('Error starting server:', error);
    }
};

// Запуск
start().finally();
