const isAbsoluteUrl = require('is-absolute-url');
const got = require('got');
const url = require('url');
const path = require('path');
const {transliterate} = require('transliteration');

const stream = require('stream');
const {promisify} = require('util');
const pipeline = promisify(stream.pipeline);

const geoJSON = require('../helpers/geojson');
const strava = require('../helpers/strava');
const alltrails = require('../helpers/alltrails');
const toGPX = require('togpx');
const toKML = require('tokml');

const turf = require('@turf/turf');

module.exports = (req, res) => {
  const download = async (source, from, data) => {
    try {
      const to = req.params.format;
      let filename;

      if (from === 'strava') {
        ({data, name: filename} = await strava(source));
        from = 'json';
        filename = `${filename}.${to}`;
      }
      if (from === 'alltrails') {
        ({data, name: filename} = await alltrails(source));
        from = 'json';
        filename = `${filename}.${to}`;
      }
      else {
        filename = (path.basename(url.parse(source).path || '').replace(/\?.+$/, '') || `route.${to}`).replace(new RegExp(`${from}$`, 'i'), to);
      }

      if (!filename.includes('.')) {
        filename = `route.${to}`;
      }

      const encode = s => encodeURIComponent(decodeURIComponent(s)).replace(/^[0-9a-f]{8}-(brm|\d)/g, '$1');

      res.setHeader('Content-Disposition', `attachment; filename="${encode(transliterate(filename))}"; filename*=UTF-8''${encode(filename)}`);

      const mime = {
        kmz: 'application/vnd.google-earth.kmz; charset=utf-8',
        kml: 'application/vnd.google-earth.kml+xml; charset=utf-8',
        gpx: 'application/gpx+xml; charset=utf-8',
        jpg: 'image/jpeg',
        json: 'application/json; charset=utf-8',
        ics: 'text/calendar; charset=utf-8',
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
          res.setHeader('Content-Disposition', `attachment; filename="${encode(transliterate(filename))}"; filename*=UTF-8''${encode(filename)}`);
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

  const kinds = ['json', 'gpx', 'kml', 'kmz', 'jpg', 'ics'];

  for (const kind of kinds) {
    if (req.method === 'POST') {
      if (req.files?.[kind]?.name) {
        return download(req.files[kind].name, kind, req.files[kind].data);
      }
    }

    if (isAbsoluteUrl(req.query.strava || '')) {
      return download(req.query.strava, 'strava');
    }

    if (isAbsoluteUrl(req.query.alltrails || '')) {
      return download(req.query.alltrails, 'alltrails');
    }

    if (isAbsoluteUrl(req.query.load || '')) {
      const filename = path.basename(url.parse(req.query.load).path || '').replace(/\?.+$/, '') || '';
      if (filename.includes('.')) {
        const ext = filename.split('.').reverse()[0].toLowerCase();

        if (kinds.includes(ext)) {
          return download(req.query.load, ext);
        }
      }
    }

    if (isAbsoluteUrl(req.query[kind] || '')) {
      return download(req.query[kind], kind);
    }
  }

  // ----------

  res.sendStatus(400);
};
