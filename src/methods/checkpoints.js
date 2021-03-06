const isAbsoluteUrl = require('is-absolute-url');
const got = require('got');
const geoJSON = require('../helpers/geojson');
const toKilometers = require('../helpers/toKilometers');
const trackStats = require('../helpers/trackStats');

module.exports = (req, res) => {
  const checkpoints = async (source, from) => {
    try {
      const start_date = req.query.start_date;
      const {total, checkpoints, brmDistance} = await trackStats(await geoJSON((await got(source)).body, from), start_date);

      const times = object => {
        if (start_date) {
          return {
            date: object.date.toISOString().replace(/\..*$/, '').replace('T', ' '),
            time: object.time
          };
        }

        return object.time;
      };

      // Выводим

      const output = {
        total: toKilometers(total),
        brmDistance,
        checkpoints: checkpoints.map(checkpoint => ({
          name: checkpoint.name,
          distance: toKilometers(checkpoint.distance),
          open: times(checkpoint.open),
          close: times(checkpoint.close),
        })),
      };

      return res.send(output);
    }
    catch (e) {
      return res.sendStatus(500);
    }
  };

  // ----------

  if (isAbsoluteUrl(req.query.gpx || '')) {
    return checkpoints(req.query.gpx, 'gpx');
  }

  if (isAbsoluteUrl(req.query.kml || '')) {
    return checkpoints(req.query.kml, 'kml');
  }

  res.sendStatus(400);
};
