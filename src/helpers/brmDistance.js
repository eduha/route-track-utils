module.exports = total => {
  for (let test of [1800, 1200, 1000, 600, 400, 300]) {
    if (total >= test) {
      return test;
    }
  }

  return 200;
};
