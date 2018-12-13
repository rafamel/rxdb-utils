require('@babel/register');
const fs = require('fs');
const path = require('path');

const run = (dir) =>
  fs.readdirSync(dir).forEach((name) => {
    const item = path.join(dir, name);

    if (fs.statSync(item).isDirectory()) {
      if (name === 'root') run(item);
      else namespace(name, () => run(item));
    } else if (/\.jake\.(js|ts)$/.exec(item)) {
      require(item);
    }
  });

run(__dirname);
