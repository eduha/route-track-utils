const isAbsoluteUrl = require('is-absolute-url');
const got = require('got');
const url = require('url');
const path = require('path');

const geoJSON = require('../helpers/geojson');
const toGPX = require('togpx');
const toKML = require('tokml');

module.exports = (req, res) => {
  const download = async (source, from) => {
    try {
      const to = req.params.format;
      const filename = path.basename(url.parse(source).path || `route.${to}`).replace(new RegExp(`${from}$`, 'i'), to);

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      if (to === 'kml') {
        res.setHeader('Content-type', 'application/vnd.google-earth.kml+xml');
      }
      else if (to === 'gpx') {
        res.setHeader('Content-type', 'application/gpx+xml');
      }
      else if (to === 'jpg') {
        res.setHeader('Content-type', 'image/jpeg');
      }

      if (from === to || from === 'jpg' || to === 'jpg') {
        return got.stream(source).pipe(res);
      }

      const getGeoJSON = async () => geoJSON((await got(source)).body, from);

      if (from === 'kml' && to === 'gpx') {
        return res.send(toGPX(await getGeoJSON(), {
          featureDescription: () => '',
        }));
      }

      if (from === 'gpx' && to === 'kml') {
        return res.send(toKML(await getGeoJSON()));
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
