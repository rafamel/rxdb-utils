import React from 'react';
import { observer } from 'mobx-react';

function testSelect(selected) {
  const keys = Object.keys(selected);
  let ans = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    ans[key] = selected[key].current();
    if (!selected[key].resolved()) return false;
  }
  return ans;
}

export default function select(fn) {
  if (Array.isArray(fn)) {
    const arr = fn;
    fn = (props) => {
      return arr.reduce((acc, key) => {
        acc[key] = props[key];
        return acc;
      }, {});
    };
  }
  return function selectObserved(Component) {
    const SelectObserved = (props) => {
      const selected = fn(props);
      const selectedProps = testSelect(selected);
      return selectedProps ? <Component {...props} {...selectedProps} /> : null;
    };
    if (Component.name) {
      SelectObserved.displayName = `SelectObserved(${Component.name})`;
    }
    return observer(SelectObserved);
  };
}
