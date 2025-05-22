module.exports = total => {
  for (let test of [1800, 1200, 1000, 600, 400, 350, 300]) {
    if (total >= (test - 10)) {
      return test;
    }
  }

  return 200;
};
