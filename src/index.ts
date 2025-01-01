import express, { Request, Response } from 'express';

const app = express();
const PORT = 5000;

// Middleware для парсингу JSON
app.use(express.json());

// Привітальний маршрут
app.get('/', (req: Request, res: Response) => {
    res.send('Hello, TypeScript with Express!');
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
