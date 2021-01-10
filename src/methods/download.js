const isAbsoluteUrl = require('is-absolute-url');
const got = require('got');
const url = require('url');
const path = require('path');

const geoJSON = require('../helpers/geojson');
const toGPX = require('togpx');
const toKML = require('tokml');

const turf = require('@turf/turf');

module.exports = (req, res) => {
  const download = async (source, from) => {
    try {
      const to = req.params.format;
      const filename = path.basename(url.parse(source).path || `route.${to}`).replace(new RegExp(`${from}$`, 'i'), to);

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const mime = {
        kml: 'application/vnd.google-earth.kml+xml',
        gpx: 'application/gpx+xml',
        jpg: 'image/jpeg',
        json: 'application/json',
        ics: 'text/calendar',
      };

      if (mime[to]) {
        res.setHeader('Content-type', mime[to]);
      }

      if (from === to || [from, to].includes('jpg')) {
        return got.stream(source).pipe(res);
      }

      if (['kml', 'gpx'].includes(from) && ['kml', 'gpx', 'json'].includes(to)) {
        let geoData = geoJSON((await got(source)).body, from);

        if (req.query.simplify) {
          geoData = turf.simplify(geoData, {
            highQuality: true,
            tolerance: 0.00001
          });
        }

        if (to === 'gpx') {
          return res.send(toGPX(geoData, {featureDescription: () => ''}));
        }

        if (to === 'kml') {
          return res.send(toKML(geoData));
        }

        if (to === 'json') {
          return res.send(geoData);
        }
      }

      return res.sendStatus(400);
    }
    catch {
      return res.sendStatus(500);
    }
  };

  // ----------

  if (isAbsoluteUrl(req.query.gpx || '')) {
    return download(req.query.gpx, 'gpx');
  }

  if (isAbsoluteUrl(req.query.kml || '')) {
    return download(req.query.kml, 'kml');
  }

  if (isAbsoluteUrl(req.query.jpg || '')) {
    return download(req.query.jpg, 'jpg');
  }

  // ----------

  res.sendStatus(400);
};
