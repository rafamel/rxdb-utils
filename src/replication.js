import { PouchDB } from 'rxdb';
import { BehaviorSubject, Subject } from 'rxjs';
import { overwritable } from 'rxdb/plugins/key-compression';

export default {
  rxdb: true,
  prototypes: {},
  overwritable: {
    createKeyCompressor(schema, ...args) {
      const ans = overwritable.createKeyCompressor(schema, ...args);

      let found = false;
      const entries = Object.entries(schema.normalized.properties);
      for (const [field, value] of entries) {
        if (value && value.rx_model) {
          found = true;
          ans._table = { ...ans.table, [field]: field };
          break;
        }
      }

      /* istanbul ignore next */
      if (!found) {
        throw Error(
          `No field replication field was found on schema normalized properties`
        );
      }

      return ans;
    }
  },
  hooks: {
    createRxDatabase(database) {
      const options = database.options.replication;
      database.options.replication = {
        field: 'rx_model',
        ...options
      };
      database.replications = [];
      database.replicate = function replicate(...args) {
        const replication = new Replication(database, ...args);

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
    preCreateRxCollection(model) {
      const name = model.name;
      if (!name) throw Error('RxCollection(s) must have a "name" property');
      if (!model.schema || !model.schema.properties) {
        throw Error(
          'RxCollection(s) must have a a "schema" property, with a "properties" key'
        );
      }

      const field = model.database.options.replication.field;
      const rxModel = model.schema.properties[field];
      if (rxModel && (rxModel.type !== 'string' || rxModel.default !== name)) {
        throw Error(`Schema property "${field}" is reserved by replication`);
      }
      model.schema.properties[field] = {
        type: 'string',
        enum: [name],
        default: name,
        final: true,
        rx_model: true
      };
    }
  }
};

class Replication {
  constructor(database, remote, collectionNames, direction, options = {}) {
    this.remote = remote;
    this.directon = direction;
    this.options = options;
    this.collections = !collectionNames
      ? database.collections
      : collectionNames.reduce((acc, key) => {
          if (database.collections[key]) acc[key] = database.collections[key];
          return acc;
        }, {});

    this.replicationStates = [];
    this.alive = false;

    this._field = database.options.replication.field;
    this._states = [];
    this._subscribers = [];
    this._aliveSubject = new BehaviorSubject(false);
    this._errorSubject = new Subject();
    this._pReplicationStates = Promise.resolve([]);
  }
  get alive$() {
    return this._aliveSubject.asObservable();
  }
  // TODO: test error subscription
  get error$() {
    return this._errorSubject.asObservable();
  }
  async connect() {
    await this.close();

    try {
      await this._createFilter(this.remote);
      await this._sync();
      return true;
    } catch (e) {
      this._errorSubject.next(e);
      this._interval = setInterval(() => {
        this._createFilter(this.remote)
          .then(() => {
            clearInterval(this._interval);
            this._sync();
          })
          .catch((e) => this._errorSubject.next(e));
      }, 5000);
      return false;
    }
  }
  async close() {
    clearInterval(this._interval);

    this._subscribers.forEach((x) => x.unsubscribe());
    this._subscribers = [];
    this._states = [];

    if (this.alive) {
      this.alive = false;
      this._aliveSubject.next(false);
    }

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
        direction: this.direction,
        options: {
          ...this.options,
          live: this.options.live || true,
          retry: this.options.retry || true,
          // selector: { rx_model: name }
          filter: 'app/by_model',
          query_params: { [this._field]: name }
        }
      });
    });

    const allAlive = promises.map(() => false);
    this._pReplicationStates = Promise.all(promises)
      .then((arr) => {
        arr.forEach((rep, i) => {
          this._subscribers.push(
            rep.alive$.subscribe((val) => {
              const repAlive = allAlive[i];

              if (repAlive === val) return;

              allAlive[i] = val;
              const alive = allAlive.reduce((acc, x) => acc && x, true);

              if (alive === this.alive) return;
              this.alive = alive;
              this._aliveSubject.next(alive);
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
    const field = this._field;
    const remoteIsUrl = typeof this.remote === 'string';
    const db = remoteIsUrl ? new PouchDB(this.remote) : this.remote;
    const doc = {
      version: 0,
      _id: '_design/app',
      filters: {
        // not doing fn.toString() as istambul code
        // on tests breaks it
        by_model: `function(doc, req) {
          return (
            doc._id === '_design/app' || doc["${field}"] === req.query["${field}"]
          );
        }`
      }
    };

    await db
      .get('_design/app')
      .then(({ version, _rev }) => {
        return version < doc.version ? db.put({ ...doc, _rev }) : true;
      })
      .catch(() => db.put(doc));

    if (remoteIsUrl) db.close();
  }
}
