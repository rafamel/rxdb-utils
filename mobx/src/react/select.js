import React from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import uuid from 'uuid/v4';
import { isOnable } from '../onable';
import { withDB } from './context';

function testSelect(selected) {
  const keys = Object.keys(selected);
  let ans = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    let res = selected[key];
    if (isOnable(selected[key])) {
      res = selected[key].current();
      if (res === undefined) return false;
    }
    ans[key] = res;
  }
  return ans;
}

function getFn(fn) {
  if (!fn || !Array.isArray(fn)) return fn;

  const arr = fn;
  return (props) => {
    return arr.reduce((acc, key) => {
      acc[key] = props[key];
      return acc;
    }, {});
  };
}

export default function select(fn, onMount, onReadyOrUnmount, onUpdate) {
  // fn and holdFn can be a function or an array of strings
  fn = getFn(fn);

  return function selectConsumer(Component) {
    class SelectConsumer extends React.Component {
      static displayName = Component.name
        ? `SelectConsumer(${Component.name})`
        : 'SelectConsumer';
      static propTypes = {
        _rxdb_mobx_register: PropTypes.func.isRequired,
        _rxdb_mobx_defaults: PropTypes.shape({
          onMount: PropTypes.func,
          onReadyOrUnmount: PropTypes.func
        })
      };
      selectedProps = false;
      onMount = null;
      onReadyOrUnmount = null;
      called = false;
      componentDidMount() {
        const { _rxdb_mobx_defaults: defaults } = this.props;
        this.onMount = () => {
          defaults.onMount && defaults.onMount();
          onMount && onMount();
        };
        this.onReadyOrUnmount = () => {
          defaults.onReadyOrUnmount && defaults.onReadyOrUnmount();
          onReadyOrUnmount && onReadyOrUnmount();
        };

        this.onMount();
        this.selectedProps && this.onReadyOrUnmount();
        this.called = true;
      }
      componentWillUnmount() {
        if (this.id) this.props._rxdb_mobx_register(this.id, true);
        if (!this.selectedProps && this.called) this.onReadyOrUnmount();
      }
      render() {
        const {
          _rxdb_mobx_register: _register,
          // eslint-disable-next-line
          _rxdb_mobx_defaults,
          ...other
        } = this.props;

        if (!fn) return <Component {...other} />;

        if (!this.id) _register((this.id = uuid()), false);

        const selected = fn(other);
        const selectedProps = testSelect(selected);
        if (selectedProps) {
          if (!this.selectedProps) {
            _register(this.id, true);
            this.called && this.onReadyOrUnmount();
          }
          onUpdate && onUpdate.call();
          this.selectedProps = selectedProps;
        }

        return this.selectedProps || !fn ? (
          <Component {...other} {...this.selectedProps} />
        ) : null;
      }
    }
    return withDB(fn ? observer(SelectConsumer) : SelectConsumer);
  };
}
