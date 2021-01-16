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
      let filename = (path.basename(url.parse(source).path || '').replace(/\?.+$/, '') || `route.${to}`).replace(new RegExp(`${from}$`, 'i'), to);

      if (!filename.includes('.')) {
        filename = `route.${to}`;
      }

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(decodeURIComponent(filename))}"`);

      const mime = {
        kmz: 'application/vnd.google-earth.kmz',
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

      const allowed = ['kml', 'kmz', 'gpx', 'json'];

      if (allowed.includes(from) && allowed.includes(to)) {
        let geoData = await geoJSON(data || (await got(source, {responseType: 'buffer'})).body, from);

        if (filename === `route.${to}` && geoData?.meta?.name) {
          filename = `${geoData.meta.name}.${to}`;
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(decodeURIComponent(filename))}"`);
        }

        if (req.query.simplify) {
          geoData = turf.simplify(geoData, {
            highQuality: true,
            tolerance: 0.00001
          });
        }

        if (to === 'gpx') {
          return res.send(toGPX(geoData, {featureDescription: el => el.description || ''}));
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

  for (const kind of ['json', 'gpx', 'kml', 'kmz', 'jpg', 'ics']) {
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
