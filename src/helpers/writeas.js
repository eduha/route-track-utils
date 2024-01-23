const got = require('got');

module.exports = async data => {
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
};
