const fs = require('fs');
const path = require('path');
const registerSx = (sx, _ = (global.SX = {})) =>
  Object.keys(sx).forEach((key) => (global.SX[key] = sx[key]));
const sx = (name) => `node -r ./package-scripts.js -e "global.SX.${name}()"`;
const scripts = (x) => ({ scripts: x });
const exit0 = (x) => `${x} || shx echo `;
const series = (x) => `(${x.join(') && (')})`;
// const intrim = (x) => x.replace(/\n/g, ' ').replace(/ {2,}/g, ' ');

const OUT_DIR = 'build';

process.env.LOG_LEVEL = 'disable';
module.exports = scripts({
  build: series([
    'nps validate',
    exit0(`shx rm -r ${OUT_DIR}`),
    `shx mkdir ${OUT_DIR}`,
    sx('package'),
    `babel src --out-dir ${OUT_DIR}`
  ]),
  publish: `nps build && cd ${OUT_DIR} && npm publish`,
  watch: 'onchange "./src/**/*.{js,jsx,ts}" -i -- nps private.watch',
  fix: `prettier --write "./**/*.{js,jsx,ts,json,scss}"`,
  lint: {
    default: 'eslint ./src --ext .js',
    test: 'eslint ./test --ext .js',
    md: 'markdownlint *.md --config markdown.json'
  },
  test: {
    default: 'nps lint.test && jest ./test/.*.test.js',
    watch:
      'onchange "./{test,src}/**/*.{js,jsx,ts}" -i -- nps private.test_watch'
  },
  validate: 'nps fix lint lint.test lint.md test private.validate_last',
  update: 'npm update --save/save-dev && npm outdated',
  clean: `${exit0(`shx rm -r ${OUT_DIR} coverage`)} && shx rm -rf node_modules`,
  // Private
  private: {
    watch: `${sx('clear')} && nps lint && babel src --out-dir ${OUT_DIR}`,
    test_watch: `${sx('clear')} && nps test`,
    validate_last: `npm outdated || ${sx('countdown')}`
  }
});

registerSx({
  clear: () => console.log('\x1Bc'),
  countdown: (i = 8) => {
    if (!process.env.MSG) return;
    console.log('');
    const t = setInterval(() => {
      process.stdout.write('\r' + process.env.MSG + ' ' + i);
      !i-- && (clearInterval(t) || true) && console.log('\n');
    }, 1000);
  },
  package: () => {
    // Copy all files
    fs.readdirSync(__dirname)
      .filter((x) => !fs.lstatSync(path.join(__dirname, x)).isDirectory())
      .forEach((x) => {
        if (x === 'package.json') return;
        fs.createReadStream(path.join(__dirname, x)).pipe(
          fs.createWriteStream(path.join(__dirname, OUT_DIR, x))
        );
      });

    // Modify package.json
    const plain = fs.readFileSync(path.join(__dirname, 'package.json'));
    const package = JSON.parse(plain);

    package.main = './index.js';
    delete package.scripts.prepublishOnly;
    delete package.scripts.publish;

    fs.writeFileSync(
      path.join(__dirname, OUT_DIR, 'package.json'),
      JSON.stringify(package, null, 2)
    );
  }
});
