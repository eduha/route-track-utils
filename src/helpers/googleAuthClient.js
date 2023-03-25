const common = require('googleapis-common');
const path = require('path');
const os = require('os');
const fs = require('fs');

module.exports = async (key, owner) => {
  const keyFile = path.join(os.tmpdir(), 'google-auth-data.json');
  await fs.promises.writeFile(keyFile, JSON.stringify(key));

  const auth = new (new common.AuthPlus()).GoogleAuth({
    keyFile,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
    clientOptions: {
      subject: owner,
    },
  });

  return await auth.getClient();
};

