const DOMParser = require('xmldom').DOMParser;
const toGeoJSON = require('@tmcw/togeojson');

module.exports = (body, from) => {
  const doc = new DOMParser().parseFromString(body.toString());

  if (from === 'kml' || from === 'gpx') {
    return toGeoJSON[from](doc, {styles: true});
  }

  throw new Error('not supported');
};
