const got = require('got');
const cheerio = require('cheerio');
const polyline = require('@mapbox/polyline');
const {lineString, featureCollection} = require('@turf/helpers');

module.exports = async link => {
  let name = 'alltrails';
  let {hostname} = new URL(link);

  const url = new URL(link);

  if (url.hostname.replace(/^www\./, '') === 'alltrails.com') {
    const match = /^(\/activities\/(\d+))/.exec(url.pathname);

    if (/^\/explore\/map\//.test(url.pathname)) {
      const {body} = await got(url.toString());

      const $ = cheerio.load(body);

      const data = $('div[data-react-class="SearchApp"][data-react-props]').attr('data-react-props');

      if (!data) {
        throw 'no data found';
      }

      const {initialExploreMap} = JSON.parse(data);

      const pointsData = initialExploreMap?.routes?.[0]?.lineSegments?.[0]?.polyline?.pointsData;

      if (!pointsData) {
        throw 'no activity data found';
      }

      name = initialExploreMap.name;

      const latlng = polyline.decode(pointsData);

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
