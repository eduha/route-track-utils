const isAbsoluteUrl = require('is-absolute-url');
const got = require('got');
const geoJSON = require('../helpers/geojson');
const toKilometers = require('../helpers/toKilometers');
const trackStats = require('../helpers/trackStats');

module.exports = (req, res) => {
  const checkpoints = async (source, from) => {
    try {
      const {total, checkpoints} = await trackStats(geoJSON((await got(source)).body, from));

      // Выводим

      const output = {
        total: toKilometers(total),
        checkpoints: checkpoints.map(checkpoint => ({
          name: checkpoint.name,
          distance: toKilometers(checkpoint.distance),
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
