const express = require('express');
const got = require('got');
const isAbsoluteUrl = require('is-absolute-url');
const url = require('url');
const path = require('path');

const DOMParser = require('xmldom').DOMParser;
const toGPX = require('togpx');
const toKML = require('tokml');
const toGeoJSON = require('@tmcw/togeojson');

const turf = require('@turf/turf');
const distance = require('turf-vincenty-inverse');

if (!process.env.PORT) {
  console.error('No env PORT defined');
  process.exit(1);
}

const app = express();

const geoJSON = async (url, from) => {
  const doc = new DOMParser().parseFromString((await got(url)).body);

  if (from === 'kml') {
    return toGeoJSON.kml(doc, {styles: true});
  }

  if (from === 'gpx') {
    return toGeoJSON.gpx(doc, {styles: true});
  }

  throw new Error('not supported');
};

/**
 * Скачивание в разных форматах
 */
app.get('/download.:format(gpx|kml|jpg)$', (req, res) => {
  const download = async (source, from) => {
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

    if (from === 'kml' && to === 'gpx') {
      return res.send(toGPX(await geoJSON(source, from), {
        featureDescription: () => '',
      }));
    }

    if (from === 'gpx' && to === 'kml') {
      return res.send(toKML(await geoJSON(source, from)));
    }

    res.send(400);
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

  res.send(400);
});

/**
 * Список КП
 */
app.get('/checkpoints.json', (req, res) => {
  const checkpoints = async (source, from) => {
    const data = await geoJSON(source, from);

    const track = (data?.features || []).reduce((accumulator, feature) => {
      if (feature?.geometry?.type === 'LineString') {
        return feature.geometry;
      }

      return accumulator;
    }, {});

    const points = (data?.features || []).reduce((accumulator, feature) => {
      if (feature?.geometry?.type === 'Point' && feature?.properties?.name) {
        accumulator.push(feature);
      }

      return accumulator;
    }, []);

    const checkpoints = points.map(feature => {
      const point = turf.nearestPointOnLine(track, feature.geometry);
      const circle = turf.circle(point, 0.002, {steps: 8});

      return {
        name: feature.properties.name,
        point,
        circle,
        original: feature,
        distance: 0,
      };
    });

    const total = turf.segmentReduce(track, (accumulator, segment) => {
      const unit = 'radians'; // В библиотеке есть баг с единицами изменения - вместо радианов придут метры
      const points = turf.explode(segment).features;

      if (points.length === 2) {
        checkpoints.forEach(checkpoint => {
          const intersect = turf.lineIntersect(segment, checkpoint.circle);

          if (intersect.features.length) {
            checkpoint.distance = accumulator + parseFloat(distance(points[0], intersect.features[0], unit));
          }
        });

        accumulator += parseFloat(distance(points[0], points[1], unit));
      }

      return accumulator;
    }, 0);

    const round = v => Math.round(v / 100) / 10;

    const output = {
      total: round(total),
      checkpoints: checkpoints.map(checkpoint => ({
        name: checkpoint.name,
        distance: round(checkpoint.distance),
      })),
    };

    res.send(output);
  };

  // ----------

  if (isAbsoluteUrl(req.query.gpx || '')) {
    return checkpoints(req.query.gpx, 'gpx');
  }

  if (isAbsoluteUrl(req.query.kml || '')) {
    return checkpoints(req.query.kml, 'kml');
  }

  // ----------

  res.send(400);
});

/**
 * Go
 */
app.listen(process.env.PORT);

// TODO remove
got(`http://localhost:${process.env.PORT}/checkpoints.json?kml=http://localhost:888/test.kml`);