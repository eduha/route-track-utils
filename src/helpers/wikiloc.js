const got = require('got');
const {lineString, featureCollection} = require('@turf/helpers');
const wkx = require('wkx');

module.exports = async link => {
  const url = new URL(link);

  if (/wikiloc\.com$/.test(url.hostname)) {
    const {body} = await got(url.toString());

    for (let line of body.split('\n')) {
      if (line.includes('var mapData=')) {
        const data = line.split('var mapData=')[1].trim().replace(/;$/, '');
        const {mapData} = JSON.parse(data);
        const {geom, nom} = mapData[0];
        const name = nom || 'wikiloc';

        const {coordinates} = wkx.Geometry.parseTwkb(new Buffer.from(geom, 'base64')).toGeoJSON();

        if (!coordinates || !coordinates.length) {
          throw 'no coordinates data found';
        }

        const geojson = featureCollection([
          lineString(coordinates, {name}),
        ]);

        return {
          data: JSON.stringify(geojson),
          geojson,
          name,
        };
      }
    }
  }

  throw 'unsupported url';
};
