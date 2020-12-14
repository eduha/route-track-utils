const express = require('express');
const got = require('got');
const isAbsoluteUrl = require('is-absolute-url');
const url = require('url');
const path = require('path');

const togpx = require('togpx');
const tokml = require('tokml');
const DOMParser = require('xmldom').DOMParser;
const tj = require('@tmcw/togeojson');

if (!process.env.PORT) {
  console.error('No env PORT defined');
  process.exit(1);
}

const app = express();

app.get('/download.:format(gpx|kml)$', (req, res) => {
  const download = async (source, from) => {
    const to = req.params.format;
    const filename = path.basename(url.parse(source).path || `route.${to}`).replace(new RegExp(`${from}$`, 'i'), to);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (from === to) {
      return got.stream(source).pipe(res);
    }

    const doc = new DOMParser().parseFromString((await got(source)).body);

    if (from === 'kml') {
      const converted = tj.kml(doc, {styles: true});

      if (to === 'gpx') {
        return res.send(togpx(converted));
      }
    }

    if (from === 'gpx') {
      const converted = tj.gpx(doc, {styles: true});

      if (to === 'kml') {
        return res.send(tokml(converted));
      }
    }

    // return got.stream(source).pipe(geo.from(from)).pipe(geo.to(to)).pipe(res);

    res.send(400);
  };

  if (isAbsoluteUrl(req.query.gpx || '')) {
    return download(req.query.gpx, 'gpx');
  }

  if (isAbsoluteUrl(req.query.kml || '')) {
    return download(req.query.kml, 'kml');
  }

  res.send(404);
});

app.listen(process.env.PORT);