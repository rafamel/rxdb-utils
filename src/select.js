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
    class SelectObserved extends React.Component {
      static displayName = Component.name
        ? `SelectObserved(${Component.name})`
        : 'SelectObserved';
      selectedProps = false;
      render() {
        const selected = fn(this.props);
        const selectedProps = testSelect(selected);
        if (selectedProps) this.selectedProps = selectedProps;

        return this.selectedProps ? (
          <Component {...this.props} {...this.selectedProps} />
        ) : null;
      }
    }
    return observer(SelectObserved);
  };
}
