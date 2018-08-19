/* eslint-disable babel/no-invalid-this */
import { autorun } from 'mobx';
import { fromResource } from 'mobx-utils';
import { onable } from './onable';

const mobxSymbol = Symbol('observer');
const gettersSymbol = Symbol('gettersSymbol');
const resolvedSymbol = Symbol('resolved');

function setPropertyGetters() {
  if (this[gettersSymbol]) return;

  const properties = Object.entries(
    Object.getOwnPropertyDescriptors(this)
  ).reduce((acc, [key]) => {
    if (key.search(/(^_|_$)/) >= 0) return acc; // Exclude internal properties

    acc[key] = { get: () => this[key], enumerable: true };
    return acc;
  }, {});

  const views = this.collection.options.views;
  const getters = !views
    ? {}
    : Object.entries(
        Object.getOwnPropertyDescriptors(this.collection.options.views)
      )
        .filter(([_, { get }]) => get)
        .reduce((acc, [key]) => {
          acc[key] = { get: () => this[key](), enumerable: true };
          return acc;
        }, {});

  this[gettersSymbol] = Object.defineProperties(
    {},
    Object.assign(properties, getters)
  );
}

export function RxDocument(proto) {
  Object.assign(proto, {
    current() {
      if (!this[mobxSymbol]) {
        setPropertyGetters.call(this);
        const getters = this[gettersSymbol];

        // Mobx Observer
        let subscription;
        this[mobxSymbol] = fromResource(
          (sink) => {
            subscription = this.$.subscribe((_) => {
              return sink(getters);
            });
          },
          () => {
            subscription && subscription.complete() && (subscription = null);
          },
          getters
        );
      }

      return this[mobxSymbol].current();
    },
    resolved() {
      return true;
    },
    promise() {
      setPropertyGetters.call(this);
      const getters = this[gettersSymbol];
      return Promise.resolve(getters);
    },
    dispose() {
      if (!this[mobxSymbol]) return false;
      this[mobxSymbol].dispose();
      this[mobxSymbol] = null;
      return true;
    },
    on(cb) {
      return onable(this, [cb]);
    }
  });
}

export function RxQuery(proto) {
  Object.assign(proto, {
    current() {
      if (!this[mobxSymbol]) {
        let subscription, resolved;
        this[mobxSymbol] = fromResource(
          (sink) => {
            subscription = this.$.subscribe((data) => {
              if (!resolved) this[resolvedSymbol] = true;
              sink(data);
            });
          },
          () => {
            subscription && subscription.complete() && (subscription = null);
          },
          undefined
        );
      }

      const current = this[mobxSymbol].current();

      if (current === undefined) return current;
      return this.op === 'findOne' ? current.current() : current;
    },
    resolved() {
      return this[resolvedSymbol] || false;
    },
    promise() {
      return new Promise((resolve, reject) => {
        try {
          const disposer = autorun(() => {
            const val = this.current();
            if (this.resolved()) {
              resolve(val);
              disposer();
            }
          });
        } catch (e) {
          reject(e);
        }
      });
    },
    dispose() {
      if (!this[mobxSymbol]) return false;
      this[mobxSymbol].dispose();
      this[mobxSymbol] = null;
      return true;
    },
    on(cb) {
      return onable(this, [cb]);
    }
  });
}
