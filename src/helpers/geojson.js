const DOMParser = require('xmldom').DOMParser;
const toGeoJSON = require('@tmcw/togeojson');
const yauzl = require('yauzl');
const {promisify} = require('util');
const streamToBuffer = require('stream-to-buffer');

module.exports = async (body, from) => {
  if (from === 'kmz') {
    try {
      const zipfile = await promisify(yauzl.fromBuffer).bind(yauzl)(Buffer.from(body), {lazyEntries: true});

      from = 'kml';
      body = await new Promise((resolve, reject) => {
        zipfile.readEntry();

        zipfile.on('entry', async entry => {
          if (/\.kml$/i.test(entry.fileName)) {

            try {
              const readStream = await promisify(zipfile.openReadStream).bind(zipfile)(entry);
              resolve(await promisify(streamToBuffer)(readStream));
            }
            catch (e) {
              reject(e);
            }
          }
        });
      });
    }
    catch (e) {
      console.error(e);
      throw new Error('can not read');
    }
  }

  if (from === 'kml' || from === 'gpx') {
    const doc = new DOMParser().parseFromString(body.toString());
    return toGeoJSON[from](doc, {styles: true});
  }

  if (from === 'json') {
    return JSON.parse(body.toString());
  }

  throw new Error('not supported');
};
