import PouchDB from 'pouchdb-core';
import { observable } from 'mobx';
import { toStream } from 'mobx-utils';
import keyCompression from 'rxdb/plugins/key-compression';

export default {
  rxdb: true,
  prototypes: {},
  overwritable: {
    createKeyCompressor(...args) {
      const ans = keyCompression.overwritable.createKeyCompressor(...args);

      ans._table = {
        ...ans.table,
        rx_model: 'rx_model'
      };

      return ans;
    }
  },
  hooks: {
    createRxDatabase(database) {
      database.replications = [];
      database.replicate = function replicate(...args) {
        const replication = new Replication(database.collections, ...args);

        database.replications.push(replication);
        const index = database.replications.length - 1;
        replication.destroy = async function destroy() {
          await replication.close();
          database.replications = database.replications
            .slice(0, index)
            .concat(database.replications.slice(index + 1));
        };

        return replication;
      };
    },
    preCreateRxCollection(model = {}) {
      const name = model.name;
      if (!name) throw Error('RxCollection(s) must have a name property');

      if (
        model.schema &&
        model.schema.properties &&
        model.schema.properties.rx_model
      ) {
        throw Error('Schema properties cannot be called "rx_model"');
      }

      return {
        ...model,
        schema: {
          ...(model.schema || {}),
          properties: {
            ...((model.schema && model.schema.properties) || {}),
            rx_model: {
              type: 'string',
              enum: [name],
              default: name
            }
          }
        }
      };
    }
  }
};

const isNotProduction = process.env.NODE_ENV !== 'production';
class Replication {
  constructor(collections, remote, collectionNames, direction, options = {}) {
    this.remote = remote;
    this.directon = direction;
    this.options = options;
    this.collections = !collectionNames
      ? collections
      : collectionNames.reduce((acc, key) => {
          if (collections[key]) acc[key] = collections[key];
          return acc;
        }, {});

    this.replicationStates = [];
    this._pReplicationStates = Promise.resolve([]);
    this._subscribers = [];
    this._states = [];
    this._active = observable.box(false);
    this.active$ = toStream(() => this._active.get());
  }
  get active() {
    return this._active.get();
  }
  async connect() {
    await this.close();

    try {
      await this._createFilter(this.remote);
      await this._sync();
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      if (isNotProduction) console.error(e);
      this._interval = setInterval(() => {
        this._createFilter(this.remote)
          .then(() => {
            clearInterval(this._interval);
            this._sync();
          })
          // eslint-disable-next-line no-console
          .catch((e) => isNotProduction && console.error(e));
      }, 5000);
      return false;
    }
  }
  async close() {
    clearInterval(this._interval);

    this._subscribers.forEach((x) => x.unsubscribe());
    this._subscribers = [];
    this._states = [];
    this._checkActive();

    await this._pReplicationStates.then((arr) => {
      return Promise.all(arr.map((x) => x.cancel()));
    });
    this._pReplicationStates = Promise.resolve([]);
    this.replicationStates = [];
  }
  // Private
  async _sync() {
    const collections = this.collections;
    const collectionNames = Object.keys(collections);
    const promises = collectionNames.map((name) => {
      return collections[name].sync({
        remote: this.remote,
        // query: this.collections[name].find().where({ rx_model: { $eq: name } })
        direction: this.direction,
        options: {
          live: this.options.live || true,
          retry: this.options.retry || true,
          filter: 'app/by_model',
          query_params: { rx_model: name }
        }
      });
    });

    this._pReplicationStates = Promise.all(promises)
      .then((arr) => {
        arr.forEach((rep, i) => {
          this._subscribers.push(
            rep.active$.subscribe(() => {
              setTimeout(() => {
                const eventEmitter = rep._pouchEventEmitterObject;
                if (!eventEmitter) {
                  this._states[i] = false;
                  return this._checkActive();
                }

                this._states[i] =
                  eventEmitter.push.state !== 'stopped' &&
                  eventEmitter.pull.state !== 'stopped';
                this._checkActive();
              }, 150);
            })
          );
        });
        return arr;
      })
      .then((arr) => (this.replicationStates = arr));

    await this._pReplicationStates;
  }
  async _createFilter() {
    // https://pouchdb.com/2015/04/05/filtered-replication.html
    const db = new PouchDB(this.remote);
    const doc = {
      version: 0,
      _id: '_design/app',
      filters: {
        by_model: function(doc, req) {
          return (
            doc._id === '_design/app' || doc.rx_model === req.query.rx_model
          );
        }.toString()
      }
    };

    await db
      .get('_design/app')
      .then(({ version, _rev }) => {
        return version < doc.version ? db.put({ ...doc, _rev }) : true;
      })
      .catch(() => db.put(doc));

    return db.close();
  }
  _checkActive() {
    const set = (val) => {
      if (this._active.get() !== val) this._active.set(val);
    };

    if (!this._states.length) return set(false);

    for (let i = 0; i < this._states.length; i++) {
      if (!this._states[i]) return set(false);
    }
    set(true);
  }
}
