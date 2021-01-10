const isAbsoluteUrl = require('is-absolute-url');
const got = require('got');
const url = require('url');
const path = require('path');

const stream = require('stream');
const {promisify} = require('util');
const pipeline = promisify(stream.pipeline);

const geoJSON = require('../helpers/geojson');
const toGPX = require('togpx');
const toKML = require('tokml');

const turf = require('@turf/turf');

module.exports = (req, res) => {
  const download = async (source, from, data) => {
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
        if (data) {
          return res.send(data);
        }

        return await pipeline(got.stream(source), res);
      }

      if (['kml', 'gpx'].includes(from) && ['kml', 'gpx', 'json'].includes(to)) {
        let geoData = geoJSON(data || (await got(source)).body, from);

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
    catch (e) {
      console.error(e);
      return res.sendStatus(500);
    }
  };

  // ----------

  for (const kind of ['gpx', 'kml', 'jpg', 'ics']) {
    if (req.method === 'POST') {
      if (req.files?.[kind]?.name) {
        return download(req.files[kind].name, kind, req.files[kind].data);
      }
    }

    if (isAbsoluteUrl(req.query[kind] || '')) {
      return download(req.query[kind], kind);
    }
  }

  // ----------

  res.sendStatus(400);
};
