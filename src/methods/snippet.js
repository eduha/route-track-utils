const got = require('got');
const writeAs = require('../helpers/writeas');

module.exports = async (req, res) => {
  try {
    // Загружаем файл на write.as

    if (req.method === 'POST') {
      if (req.files?.data?.data) {
        const key = await writeAs(req.files.data.data.toString());

        if (key) {
          return res.send({key});
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
