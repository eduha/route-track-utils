if (!process.env.PORT) {
  console.error('No env PORT defined');
  process.exit(1);
}

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
 * Временная
 */
app.use('/storage.json', require('./methods/storage'));

/**
 * Go
 */
app.listen(process.env.PORT);

