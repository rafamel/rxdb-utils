import React from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import uuid from 'uuid/v4';
import { withDB } from './context';

function testSelect(selected) {
  const keys = Object.keys(selected);
  let ans = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const res = selected[key].current();
    if (res === undefined) return false;
    ans[key] = res;
  }
  return ans;
}

export default function select(fn) {
  // fn can be a function or an array of strings
  if (fn && Array.isArray(fn)) {
    const arr = fn;
    fn = (props) => {
      return arr.reduce((acc, key) => {
        acc[key] = props[key];
        return acc;
      }, {});
    };
  }
  return function selectConsumer(Component) {
    class SelectConsumer extends React.Component {
      static displayName = Component.name
        ? `SelectConsumer(${Component.name})`
        : 'SelectConsumer';
      static propTypes = {
        _rxdb_mobx_register: PropTypes.func.isRequired
      };
      selectedProps = false;
      componentWillUnmount() {
        if (this.id) this.props._rxdb_mobx_register(this.id, true);
      }
      render() {
        const { _rxdb_mobx_register: _register, ...other } = this.props;
        if (!fn) return <Component {...other} />;

        if (!this.id) _register((this.id = uuid()), false);

        const selected = fn(other);
        const selectedProps = testSelect(selected);
        if (selectedProps) {
          (this.selectedProps = selectedProps) && _register(this.id, true);
        }

        return this.selectedProps || !fn ? (
          <Component {...other} {...this.selectedProps} />
        ) : null;
      }
    }
    return withDB(fn ? observer(SelectConsumer) : SelectConsumer);
  };
}
