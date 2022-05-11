const got = require('got');
const cheerio = require('cheerio');
const {lineString, featureCollection} = require('@turf/helpers');

module.exports = async link => {
  let name = 'strava';
  let {hostname} = new URL(link);

  if (hostname === 'strava.app.link') {
    const {body} = await got(link);
    const match = /(https:\/\/www\.strava\.com\/activities\/\d+\/)/.exec(body);

    if (match) {
      link = match[1];
    }
  }

  const url = new URL(link);

  if (url.hostname.replace(/^www\./, '') === 'strava.com') {
    const match = /^(\/activities\/(\d+))/.exec(url.pathname);

    if (match) {
      url.pathname = match[1];

      const {body} = await got(url.toString());

      const $ = cheerio.load(body);

      const data = $('div[data-react-props]').attr('data-react-props');

      if (!data) {
        throw 'no data found';
      }

      const {activity} = JSON.parse(data);

      if (!activity) {
        throw 'no activity data found';
      }

      name = activity.name;

      if (name.includes('заезд') || name.toLowerCase().includes('ride') || name.toLowerCase().includes('biking')) {
        name = `${name} ${match[2]}`;
      }

      const {latlng} = activity.streams || {};

      if (!latlng || !latlng.length) {
        throw 'no latlng data found';
      }

      const geojson = featureCollection([
        lineString(latlng.map(([lat, lng]) => [lng, lat]), {name}),
      ]);

      return {
        data: JSON.stringify(geojson),
        geojson,
        name,
      }
    }
  }

  throw 'unsupported url';
};
