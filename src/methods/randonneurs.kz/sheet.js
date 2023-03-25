const drive = require('@googleapis/drive');
const googleAuthClient = require('../../helpers/googleAuthClient');

module.exports = async (req, res) => {
  try {
    // Создаем таблицу в гуглдоксах

    if (req.method === 'POST') {
      const {body} = req;
      const {date, post_id, title, folder, share, key, owner} = body;

      if (key) {
        const authClient = await googleAuthClient(key, owner);

        const driveClient = await drive.drive({
          version: 'v3',
          auth: authClient,
        });

        const {data} = await driveClient.files.list({
          q: `'${folder}' in parents and trashed=false`,
        });

        if (data.files) {
          let source;

          for (let {name, id} of data.files) {
            if (new RegExp(`# ${post_id}$`).test(name)) {
              return res.send({id});
            }

            if (name === 'Шаблон BRM') {
              source = id;
            }
          }

          if (source) {
            const name = `${date} ${title} # ${post_id}`;

            const {data} = await driveClient.files.copy({
              fileId: source,
              requestBody: {
                name,
              },
            });

            if (data.id) {
              if (Array.isArray(share)) {
                await Promise.allSettled(share.map(async mail => await driveClient.permissions.create({
                  fileId: data.id,
                  requestBody: {
                    role: 'writer',
                    type: 'user',
                    emailAddress: mail,
                  },
                })));
              }

              return res.send({
                id: data.id,
              });
            }
          }
        }
      }
    }

    return res.sendStatus(400);
  }
  catch (e) {
    console.error(e);
    return res.sendStatus(500);
  }
};
