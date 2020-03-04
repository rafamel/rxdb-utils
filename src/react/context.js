import React from 'react';
import PropTypes from 'prop-types';

const { Provider: BaseProvider, Consumer } = React.createContext();
Consumer.displayName = `DBConsumer`;

class Provider extends React.Component {
  static displayName = 'DBProvider';
  static propTypes = {
    children: PropTypes.node.isRequired,
    db: PropTypes.any,
    hide: PropTypes.bool,
    onMountOrNull: PropTypes.func,
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
  async setDb(db, isMount = false) {
    const { onMountOrNull, onReadyOrUnmount } = this.props;

    const dbObj = await db;
    if (dbObj === this.state.db) return;

    // eslint-disable-next-line
    if (this._isMounted) this.setState({ db: dbObj, ready: false });
    if (dbObj == null && !isMount && onMountOrNull) onMountOrNull();

    let hit = false;
    clearInterval(this.interval);
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
  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setDb(nextProps.db);
  }
  componentDidMount() {
    this._isMounted = true;
    const { onMountOrNull } = this.props;

    if (onMountOrNull) onMountOrNull();
    this.setDb(this.props.db, true);
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
