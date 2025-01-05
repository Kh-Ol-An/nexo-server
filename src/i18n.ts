import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';

i18next.use(Backend).init({
    fallbackLng: 'ua', // Мова за замовчуванням
    backend: {
        loadPath: path.join(__dirname, '../../locales/{{lng}}.json'), // Шлях до файлів перекладу
    },
    detection: {
        order: ['querystring', 'cookie', 'header'], // Порядок визначення мови
        caches: ['cookie'], // Кешування в cookie
    },
    // debug: true, // Ввімкніть для пошуку помилок під час розробки
}).finally();

export default i18next;
