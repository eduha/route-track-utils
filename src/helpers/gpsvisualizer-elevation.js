const got = require('got');
const cheerio = require('cheerio');
const FormData = require('form-data');

module.exports = async (gpx_string) => {
  try {
    const instance = got.extend({prefixUrl: 'https://www.gpsvisualizer.com'});

    const form = new FormData();
    form.append('submitted', 'Convert & add elevation');
    form.append('remote_data', '');
    form.append('convert_format', 'gpx');
    form.append('convert_delimiter', 'tab');
    form.append('units', 'metric');
    form.append('add_elevation', 'auto');
    form.append('profile_x', 'distance');
    form.append('profile_y', 'altitude');
    form.append('uploaded_file_1', Buffer.from(gpx_string), {
      filename: 'track.gpx',
      contentType: 'application/gpx+xml',
    });

    const {body} = await instance.post('convert?output_elevation', {
      body: form,
    });

    const $ = cheerio.load(body);
    const link = $('a[href^="/download/convert/"]');

    if (!link || !link.length) {
      throw 'can not fetch elevation link';
    }

    const href = link.attr('href');

    if (!href) {
      throw 'can not fetch elevation link';
    }

    const {body: gpx} = await instance(href.replace(/^\//, ''));

    return gpx;
  }
  catch (e) {
    console.error(e);

    throw 'can not get elevation data';
  }
};
