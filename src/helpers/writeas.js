const got = require('got');
const promiseLimit = require('promise-limit');
const limit = promiseLimit(1);

module.exports = async data => {
  return await limit(async () => {
    if (typeof data !== 'string') {
      data = JSON.stringify(data);
    }

    const {body} = await got.post('https://write.as/api/posts', {
      json: {
        body: data,
      },
      responseType: 'json',
    });

    if (body.code === 201 && body?.data?.id) {
      return body.data.id;
    }

    throw 'no write.as id';
  });
};
