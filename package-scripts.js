const registerSx = (sx, _ = (global.SX = {})) =>
  Object.keys(sx).forEach((key) => (global.SX[key] = sx[key]));
const sx = (name) => `node -r ./package-scripts.js -e "global.SX.${name}()"`;
const scripts = (x) => ({ scripts: x });
const exit0 = (x) => `${x} || shx echo `;
const series = (x) => `(${x.join(') && (')})`;
// const intrim = (x) => x.replace(/\n/g, ' ').replace(/ {2,}/g, ' ');

process.env.LOG_LEVEL = 'disable';
module.exports = scripts({
  build: series([
    'nps validate',
    exit0('shx rm -r lib'),
    'shx mkdir lib',
    'babel src --out-dir lib'
  ]),
  watch: 'onchange "./src/**/*.{js,jsx,ts}" -i -- nps private.watch',
  fix: `prettier --write "./**/*.{js,jsx,ts,scss}"`,
  lint: {
    default: 'eslint ./src --ext .js',
    test: 'eslint ./test --ext .js',
    md: 'markdownlint *.md --config markdown.json'
  },
  test: {
    default: 'nps lint.test && jest ./test/.*.test.js --runInBand',
    watch: 'onchange "./**/*.{js,jsx}" -i -- nps private.test_watch'
  },
  validate: 'nps fix lint lint.test lint.md test private.validate_last',
  update: 'npm update --save/save-dev && npm outdated',
  clean: `${exit0('shx rm -r lib coverage')} && shx rm -rf node_modules`,
  // Private
  private: {
    watch: `${sx('clear')} && nps lint`,
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
  }
});
