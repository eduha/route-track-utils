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
      }
      catch (e) {
        console.error(e);
        token = req.query?.token;
      }

      if (message?.new_chat_members?.length) {
        const chatId = String(message.chat?.id);
        const messageId = message.message_id;
        const fromId = message.from?.id;

        for (const member of message.new_chat_members) {
          if (member.is_bot) {
            console.log(`new_chat_members: skip bot ${member.id}`);
            continue;
          }

          if (member.id !== fromId) {
            console.log(`new_chat_members: skip member ${member.id}, added by ${fromId}`);
            continue;
          }

          try {
            await got.post(`https://www.randonneurs.kz/api/webhook/telegram-new-member`, {
              json: {
                chatId,
                messageId,
                user: {
                  id: String(member.id),
                  firstName: member.first_name || '',
                  lastName: member.last_name || '',
                  username: member.username || '',
                },
              },
              timeout: {request: 10000},
            });
          }
          catch (e) {
            console.error('Failed to forward new member:', e.message);
          }
        }

        return res.sendStatus(200);
      }

      if (token && message?.text?.trim?.()?.indexOf?.('/chatid') === 0) {
        return res.send({
          method: 'sendMessage',
          chat_id: message?.chat?.id,
          text: String(message?.chat?.id),
          disable_notification: true,
          reply_parameters: {
            message_id: message?.message_id,
            chat_id: message?.chat?.id,
          },
        });
      }

      if (token && message?.document?.file_name) {
        const allowed = ['kml', 'kmz', 'gpx'];
        const match = message.document.file_name?.match?.(new RegExp(`\.(${allowed.join('|')})$`, 'i'));

        if (message?.document && match) {
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

      if (message?.chat?.type === 'private' &&
          (message?.forward_from || message?.forward_sender_name)) {
        const payload = {
          chatId: String(message.chat.id),
          messageId: message.message_id,
        };

        if (message.forward_from) {
          payload.userId = String(message.forward_from.id);
          if (message.forward_from.username) {
            payload.username = message.forward_from.username;
          }
        }

        if (message.forward_sender_name) {
          payload.forwardSenderName = message.forward_sender_name;
        }

        try {
          await got.post('https://www.randonneurs.kz/api/webhook/telegram-whois', {
            json: payload,
            timeout: {request: 10000},
          });
        }
        catch (e) {
          console.error('Failed to forward whois:', e.message);
        }
      }

      if (message?.chat?.type === 'private' &&
          message?.text?.includes?.('t.me/c/')) {
        try {
          await got.post('https://www.randonneurs.kz/api/webhook/telegram-whois', {
            json: {
              chatId: String(message.chat.id),
              messageId: message.message_id,
              messageLink: message.text.trim(),
            },
            timeout: {request: 10000},
          });
        }
        catch (e) {
          console.error('Failed to forward whois link:', e.message);
        }
      }
    }
  }
  catch (e) {
    console.error(e);
  }

  return res.sendStatus(200);
};
