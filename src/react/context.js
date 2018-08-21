import React from 'react';
import PropTypes from 'prop-types';

const { Provider: BaseProvider, Consumer } = React.createContext();
Consumer.displayName = `DBConsumer`;

class Provider extends React.Component {
  static displayName = 'DBProvider';
  static propTypes = {
    children: PropTypes.node.isRequired,
    db: PropTypes.any.isRequired,
    hide: PropTypes.bool,
    onMount: PropTypes.func,
    onReadyOrUnmount: PropTypes.func,
    defaults: PropTypes.shape({
      onMount: PropTypes.func,
      onReadyOrUnmount: PropTypes.func
    })
  };
  static defaultProps = {
    defaults: {}
  };
  state = {
    db: null,
    ready: false
  };
  remaining = {};
  interval = null;
  register = (id, done) => {
    if (!done) this.remaining[id] = true;
    else this.remaining[id] && delete this.remaining[id];
  };
  componentDidMount() {
    this._isMounted = true;
    const { db, onMount, onReadyOrUnmount } = this.props;

    if (onMount) onMount();
    db.then((db) => this._isMounted && this.setState({ db }));
    let hit = false;
    this.interval = setInterval(() => {
      if (!this.state.db) return;
      if (Object.keys(this.remaining).length) return (hit = false);

      if (!hit) hit = true;
      else {
        clearInterval(this.interval);
        if (onReadyOrUnmount) onReadyOrUnmount();
        this.setState({ ready: true });
      }
    }, 15);
  }
  componentWillUnmount() {
    const { onReadyOrUnmount } = this.props;
    clearInterval(this.interval);
    if (!this.state.ready && onReadyOrUnmount) onReadyOrUnmount();
    this._isMounted = false;
  }
  render() {
    const { db, ready } = this.state;
    const { defaults, hide } = this.props;

    if (!db) return null;
    const provider = (
      <BaseProvider
        value={{
          db,
          _rxdb_mobx_defaults: defaults,
          _rxdb_mobx_register: this.register
        }}
      >
        {this.props.children}
      </BaseProvider>
    );

    return ready || !hide ? (
      provider
    ) : (
      <div style={{ display: 'none' }}>{provider}</div>
    );
  }
}

function withDB(Component) {
  // Just render the component with props
  const WithDB = (props) => {
    return (
      <Consumer>{(context) => <Component {...props} {...context} />}</Consumer>
    );
  };
  if (Component.name) {
    WithDB.displayName = `WithDB(${Component.name})`;
  }
  return WithDB;
}

export { Provider, withDB };
