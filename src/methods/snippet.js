const got = require('got');

module.exports = async (req, res) => {
  try {

    // Загружаем файл на write.as

    if (req.method === 'POST') {
      if (req.files?.data?.data) {
        const {body} = await got.post('https://write.as/api/posts', {
          json: {
            body: req.files.data.data.toString(),
          },
          responseType: 'json',
        });

        if (body.code === 201) {
          return res.send({
            key: body.data.id,
          });
        }

        return res.sendStatus(502);
      }

      return res.sendStatus(400);
    }

    // Отдаем данные из write.as

    if (req.query?.key) {
      return res.send((await got(`https://write.as/api/posts/${encodeURIComponent(req.query.key)}`, {responseType: 'json'}))?.body?.data?.body);
    }

    return res.sendStatus(400);
  }
  catch (e) {
    console.error(e);
    return res.sendStatus(500);
  }
};
