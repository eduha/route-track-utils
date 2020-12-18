if (!process.env.PORT) {
  console.error('No env PORT defined');
  process.exit(1);
}

const app = (require('express'))();

/**
 * Скачивание в разных форматах
 */
app.get('/download.:format(gpx|kml|jpg)$', require('./methods/download'));

/**
 * Список КП
 */
app.get('/checkpoints.json', require('./methods/checkpoints'));

/**
 * Go
 */
app.listen(process.env.PORT);

