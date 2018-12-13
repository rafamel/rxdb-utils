const scripts = (x) => ({ scripts: x });
const exit0 = (x) => `${x} || shx echo `;
const series = (x) => `(${x.join(') && (')})`;

const OUT_DIR = 'build';
const DOCS_DIR = 'docs';

process.env.LOG_LEVEL = 'disable';
module.exports = scripts({
  build: series([
    'nps validate',
    exit0(`shx rm -r ${OUT_DIR}`),
    `shx mkdir ${OUT_DIR}`,
    `jake fixpackage["${OUT_DIR}"]`,
    `shx cp -r typings ${OUT_DIR}/typings`,
    `babel src --out-dir ${OUT_DIR}`
  ]),
  publish: `nps build && cd ${OUT_DIR} && npm publish`,
  watch: 'onchange "./src/**/*.{js,jsx,ts}" -i -- nps private.watch',
  fix: `prettier --write "./**/*.{js,jsx,ts,json,scss}"`,
  lint: {
    default: 'eslint ./src --ext .js',
    test: 'eslint ./test --ext .js',
    md: 'markdownlint *.md --config markdown.json',
    scripts: 'jake lintscripts',
    typings: 'tslint ./typings/**/*'
  },
  test: {
    default: 'nps lint.test && jest ./test/.*.test.js',
    watch:
      'onchange "./{test,src}/**/*.{js,jsx,ts}" -i -- nps private.test_watch'
  },
  validate:
    'nps fix lint lint.test lint.md lint.scripts lint.typings test private.validate_last',
  update: 'npm update --save/save-dev && npm outdated',
  clean: series([
    exit0(`shx rm -r ${OUT_DIR} ${DOCS_DIR} coverage`),
    exit0(`shx rm log.txt config.json`),
    'shx rm -rf node_modules'
  ]),
  docs: series([
    'nps lint.typings',
    exit0(`shx rm -r ${DOCS_DIR}`),
    `typedoc --out ${DOCS_DIR} ./typings/`
  ]),
  // Private
  private: {
    watch: `jake clear && nps lint && babel src --out-dir ${OUT_DIR}`,
    test_watch: `jake clear && nps test`,
    validate_last: `npm outdated || jake countdown`
  }
});
