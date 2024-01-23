const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const got = require('got');
const polyline = require('@mapbox/polyline');
const turf = require('@turf/turf');
const geoJSON = require('../../helpers/geojson');
const writeAs = require('../../helpers/writeas');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      let {message} = req.body || {};
      let token;

      if (['!track', '/track', 'track', '!трек', '/трек', 'трек', '!трэк', '/трэк', 'трэк'].includes(message?.text?.trim?.()?.toLowerCase?.()) && message?.reply_to_message && message?.reply_to_message?.document) {
        message = message?.reply_to_message;
      }

      try {
        const client = new SecretManagerServiceClient();
        const [secret] = await client.accessSecretVersion({name: `projects/track-utils/secrets/RANDONNEURS_BOT_TOKEN/versions/latest`});
        token = Buffer.from(secret.payload.data).toString();
        console.log({token}, 'secret');
      }
      catch (e) {
        console.error(e);
        token = req.query?.token;
        console.log({token}, 'query');
      }

      const allowed = ['kml', 'kmz', 'gpx'];
      const match = message?.document?.file_name?.match?.(new RegExp(`\.(${allowed.join('|')})$`, 'i'));

      if (token && message?.document && match) {
        const {document} = message;

        const {result} = await got(`https://api.telegram.org/bot${token}/getFile`, {
          searchParams: {
            file_id: document?.file_id,
          },
        }).json();

        const from = match[1].toLowerCase();

        const source = `https://api.telegram.org/file/bot${token}/${result.file_path}`;
        const geoData = await geoJSON((await got(source, {responseType: 'buffer'})).body, from);

        let track, filename, snippet;
        const checkpoints = [];

        geoData?.features?.forEach?.(({properties, geometry}) => {
          if (geometry?.type === 'LineString') {
            track = geometry?.coordinates || [];
            filename = properties?.name || 'track';
          }
          else if (geometry?.type === 'Point') {
            checkpoints.push({
              coordinates: geometry?.coordinates || [],
              name: properties?.name || 'Point',
            });
          }
        });

        do {
          snippet = JSON.stringify({
            n: filename,
            c: checkpoints,
            t: polyline.encode(track, 5).toString(),
          });

          if (snippet.length < 50000) {
            break;
          }

          track = turf.getCoords(turf.simplify(turf.lineString(track), {
            highQuality: true,
            tolerance: 0.00001,
          }));
        }
        while (true);

        const key = await writeAs(snippet);

        if (key) {
          return res.send({
            method: 'sendMessage',
            chat_id: message?.chat?.id,
            text: `https://route.eduha.info/?snippet=${encodeURIComponent(key)}`,
            parse_mode: 'HTML',
            link_preview_options: {
              is_disabled: true,
            },
            disable_notification: true,
            reply_parameters: {
              message_id: message?.message_id,
              chat_id: message?.chat?.id,
            },
          });
        }
      }
    }
  }
  catch (e) {
    console.error(e);
  }

  return res.sendStatus(200);
};
