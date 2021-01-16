if (!process.env.PORT) {
  console.error('No env PORT defined');
  process.exit(1);
}

require('dotenv').config();

const app = (require('express'))();

app.use((require('cors'))());
app.use((require('express-fileupload'))());

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
 * Go
 */
app.listen(process.env.PORT);

