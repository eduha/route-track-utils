const files = new Map();

module.exports = (req, res) => {

  if (req.method === 'POST') {
    if (req.files?.file) {
      files.set(req.files.file.md5, req.files.file);
      return res.send({key: req.files.file.md5});
    }

    return res.sendStatus(400);
  }

  if (req.query.key) {
    if (files.has(req.query.key)) {
      const file = files.get(req.query.key);

      res.setHeader('Content-type', file.mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      res.send(file.data);

      files.delete(req.query.key);
      return;
    }

    return res.sendStatus(404);
  }

  return res.sendStatus(400);
};
