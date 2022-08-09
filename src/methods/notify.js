const got = require('got');
const FormData = require('form-data');

module.exports = async (req, res) => {
  try {

    // Загружаем файл на write.as

    if (req.method === 'POST') {

      const {body} = req;
      body.pairs = body.pairs || {};

      if (body.pairs['Телефон']) {
        body.pairs['Телефон'] = body.pairs['Телефон'].trim().replace(/^8/, '+7');
      }

      if (body.pairs['Контакт']) {
        body.pairs['Контакт'] = body.pairs['Контакт'].trim().replace(/^8/, '+7');
      }

      Promise.allSettled([
        (async () => {
          // Сообщение
          try {
            let message = `Регистрация <b>${body.title || '?'}</b>\n`;
            Object.entries(body.pairs || {}).forEach(([key, value]) => {
              message += `${key}: <i>${value}</i>\n`;
            });

            const form = new FormData();
            form.append('chat_id', body.chat_id);
            form.append('text', message.trim());
            form.append('parse_mode', 'HTML');
            form.append('disable_web_page_preview', 1);

            await got.post({
              url: `https://api.telegram.org/bot${body.bot_token}/sendMessage`,
              body: form,
            });
          }
          catch (e) {
            console.error(e);
          }
        })(),

        // Контакт
        (async () => {
          try {
            const vcard = [
              `BEGIN:VCARD`,
              `VERSION:3.0`,
              `FN:${body.pairs['Имя'] || ''} ${body.pairs['Фамилия'] || ''} BRM`,
              `N:${body.pairs['Фамилия'] || ''};${body.pairs['Имя'] || ''};BRM`,
              `EMAIL;TYPE=INTERNET:${body.pairs['Email'] || ''}`,
              `TEL;TYPE=cell, voice, pref, msg:${body.pairs['Телефон'] || ''}`,
              `END:VCARD`,
            ].join('\n');

            const form = new FormData();
            form.append('chat_id', body.chat_id);
            form.append('phone_number', body.pairs['Телефон'] || '');
            form.append('first_name', body.pairs['Имя'] || '');
            form.append('last_name', body.pairs['Фамилия'] || '');
            form.append('vcard', vcard);

            await got.post({
              url: `https://api.telegram.org/bot${body.bot_token}/sendContact`,
              body: form,
            });
          }
          catch (e) {
            console.error(e.response );
          }
        })(),

        // Zapier
        (async () => {
          try {
            if (body.zapier_url) {
              const form = new FormData();

              Object.entries(body.pairs || {}).forEach(([key, value]) => {
                if (['Телефон', 'Контакт'].includes(key)) {
                  value = `'` + value.trim().replace(/^\+7/, '8');
                }

                form.append(key, value);
              });

              await got.post({
                url: body.zapier_url,
                body: form,
              });
            }
          }
          catch (e) {
            console.error(e);
          }
        })(),
      ]).then();

      return res.sendStatus(200);
    }

    return res.sendStatus(400);
  }
  catch (e) {
    console.error(e);
    return res.sendStatus(500);
  }
};
