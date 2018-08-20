import React from 'react';
import PropTypes from 'prop-types';

const { Provider: BaseProvider, Consumer } = React.createContext();
Consumer.displayName = `DBConsumer`;

class Provider extends React.Component {
  static displayName = 'DBProvider';
  static propTypes = {
    children: PropTypes.node.isRequired,
    db: PropTypes.any.isRequired,
    onReady: PropTypes.func
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
    this.props.db.then((db) => this._isMounted && this.setState({ db }));
    let hit = false;
    this.interval = setInterval(() => {
      if (!this.state.db) return;
      if (Object.keys(this.remaining).length) return (hit = false);

      if (!hit) hit = true;
      else {
        clearInterval(this.interval);
        if (this.props.onReady) this.props.onReady();
        this.setState({ ready: true });
      }
    }, 15);
  }
  componentWillUnmount() {
    this._isMounted = false;
    clearInterval(this.interval);
  }
  render() {
    const { db, ready } = this.state;

    if (!db) return null;

    return ready ? (
      <BaseProvider value={{ db, _rxdb_mobx_register: () => {} }}>
        {this.props.children}
      </BaseProvider>
    ) : (
      <div style={{ display: 'none' }}>
        <BaseProvider value={{ db, _rxdb_mobx_register: this.register }}>
          {this.props.children}
        </BaseProvider>
      </div>
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
