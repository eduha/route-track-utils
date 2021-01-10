const DOMParser = require('xmldom').DOMParser;
const toGeoJSON = require('@tmcw/togeojson');

module.exports = (body, from) => {
  if (from === 'kml' || from === 'gpx') {
    const doc = new DOMParser().parseFromString(body.toString());
    return toGeoJSON[from](doc, {styles: true});
  }

  if (from === 'json') {
    return JSON.parse(body.toString());
  }

  throw new Error('not supported');
};
