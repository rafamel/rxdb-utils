import fs from 'fs';
import path from 'path';

desc('Modifies package.json in output directory');
task('fixpackage', (OUT_DIR) => {
  const rootDir = path.join(__dirname, '../../../');
  // Copy all files
  fs.readdirSync(rootDir)
    .filter((x) => !fs.lstatSync(path.join(rootDir, x)).isDirectory())
    .forEach((x) => {
      if (x === 'package.json') return;
      fs.createReadStream(path.join(rootDir, x)).pipe(
        fs.createWriteStream(path.join(rootDir, OUT_DIR, x))
      );
    });

  // Modify package.json
  const plain = fs.readFileSync(path.join(rootDir, 'package.json'));
  const packagejson = JSON.parse(plain);

  packagejson.main = './index.js';
  delete packagejson.scripts.prepublishOnly;
  delete packagejson.scripts.publish;

  fs.writeFileSync(
    path.join(rootDir, OUT_DIR, 'package.json'),
    JSON.stringify(packagejson, null, 2)
  );
});
