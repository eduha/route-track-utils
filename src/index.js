if (!process.env.PORT) {
  console.error('No env PORT defined');
  process.exit(1);
}

require('dotenv').config();

const app = (require('express'))();
const parser = require('body-parser');

app.set('trust proxy', true);

app.use((require('cors'))());
app.use((require('express-fileupload'))());

/**
 * Информация о версии
 */
app.get('/version', (req, res) => {
  res.send(require('../package').version);
});

/**
 * Скачивание в разных форматах
 */
app.use('/download.:format(gpx|kml|jpg|json|ics)$', require('./methods/download'));

/**
 * Список КП
 */
app.get('/checkpoints.json', require('./methods/checkpoints'));

/**
 * Временное хранилище файлов
 */
app.use('/storage.json', require('./methods/storage'));

/**
 * Хранилище сниппетов
 */
app.use('/snippet.json', require('./methods/snippet'));

/**
 * Уведомлялка
 */
app.use('/notify', parser.json());
app.use('/notify', require('./methods/randonneurs.kz/notify'));

/**
 * Работаем с таблицами
 */
app.use('/create-sheet', parser.json());
app.use('/create-sheet', require('./methods/randonneurs.kz/sheet'));

/**
 * Телеграм-бот для конвертации файлов в ссылки на редактор
 */
app.use('/file-convert-bot', parser.json());
app.use('/file-convert-bot', require('./methods/randonneurs.kz/file-convert-bot'));

/**
 * Go
 */
app.listen(process.env.PORT);

