import fs from 'fs';
import path from 'path';
import nps from '~/../package-scripts';
import packageJson from '~/../package.json';

desc('Checks nps scripts are available as npm run scripts');
task('lintscripts', (fix) => {
  const scripts = nps.scripts;
  const packageScripts = packageJson.scripts;
  const names = {};

  const traverse = (obj, path = '') => {
    if (typeof obj !== 'object') {
      path = path.slice(1).replace(/:default$/, '');
      return (names[path] = 'nps ' + path.replace(/:/g, '.'));
    }

    Object.entries(obj).forEach(([key, value]) => {
      if (key !== 'private') traverse(value, path + ':' + key);
    });
  };
  traverse(scripts);

  if (!fix) {
    const namesKeys = Object.keys(names);
    for (let i = 0; i < namesKeys.length; i++) {
      const key = namesKeys[i];
      const value = names[key];
      if (
        !packageScripts.hasOwnProperty(key) ||
        !packageScripts[key] === value
      ) {
        throw Error(
          `NPM scripts (package.json) lacks nps script ${key} with value ${value}`
        );
      }
    }
    return;
  }

  const obj = { ...packageJson, scripts: { ...packageJson.scripts, ...names } };
  fs.writeFileSync(
    path.join(__dirname, '../../../package.json'),
    JSON.stringify(obj, null, 2)
  );
});
