import merge from 'lodash.merge';
import flattenDeep from 'lodash.flattendeep';

function parseObj(obj) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (!value) return acc;

    if (Array.isArray(value)) acc[key] = parseProperties(value);
    else if (typeof value === 'object') acc[key] = parseObj(value);
    else if (typeof value === 'string') acc[key] = parseString(value);
    else acc[key] = {};

    return acc;
  }, {});
}

function parseString(str) {
  const all = str.split('.');
  const obj = {};
  let current = obj;
  all.forEach((key) => {
    if (!current[key]) current[key] = {};
    current = current[key];
  });
  return obj;
}

export default function parseProperties(propertiesArr) {
  if (!Array.isArray(propertiesArr)) throw Error('invalid properties');
  propertiesArr = flattenDeep(propertiesArr);

  let properties = {};
  propertiesArr.forEach((property) => {
    switch (typeof property) {
      case 'string':
        return (properties = merge(properties, parseString(property)));
      case 'object':
        return (properties = merge(properties, parseObj(property)));
      default:
        throw Error('invalid properties');
    }
  });

  return properties;
}
