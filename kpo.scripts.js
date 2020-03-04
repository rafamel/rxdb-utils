const kpo = require('kpo');
const { scripts } = require('./project.config');

module.exports.scripts = {
  ...scripts,
  build: [scripts.build, kpo.series('npm pack', { cwd: './pkg' })],
  watch: 'onchange ./src --initial --kill -- kpo watch:task',
  'watch:test': 'kpo test -- --watch',

  /* Private */
  ['$watch:task']: [kpo.log`\x1Bc⚡`, 'kpo lint build']
};
