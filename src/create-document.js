/* eslint-disable babel/no-invalid-this */
import { computed, autorun, observable } from 'mobx';
import { mobxSymbol, computedSymbol, currentSymbol } from './symbols';
import toMobx from './to-mobx';
import uuid from 'uuid/v4';

const waitTillDone = {};
export function allCreated() {
  const waitKeys = Object.keys(waitTillDone);
  if (!waitKeys.length) return true;

  for (let i = 0; i < waitKeys.length; i++) {
    const key = waitKeys[i];
    const isDone = waitTillDone[key];
    if (isDone && isDone.get()) delete waitTillDone[key];
    else return false;
  }
  return true;
}

export default function createDocument() {
  const uid = uuid();
  waitTillDone[uid] = observable.box(false);

  /* Make properties mobx observables */
  this[mobxSymbol] = {};
  const subscriberKeys = Object.keys(
    Object.getOwnPropertyDescriptors(this)
  ).filter((x) => x.search(/^[^_].+\$$/) >= 0);

  const subscriberGetters = subscriberKeys.reduce((acc, subscriberKey) => {
    const key = subscriberKey.slice(0, -1);
    acc[key] = {
      get: () => {
        if (!this[mobxSymbol][key]) {
          this[mobxSymbol][key] = toMobx(
            this[subscriberKey],
            // @todo test RxDocument._data contains properties on RxDB
            () => this._data[key]
          );
        }
        return this[mobxSymbol][key].get();
      },
      enumerable: true
    };
    return acc;
  }, {});
  Object.defineProperties(this, subscriberGetters);
  /* End make properties mobx observables */

  /* Computed properties */
  this[computedSymbol] = {};

  const options = this.collection.options;
  if (options && options.computed) {
    const desc = Object.getOwnPropertyDescriptors(options.computed);
    const properties = Object.entries(desc).filter(([_, { get }]) => get);
    const getters = properties.reduce((acc, [key, { get }]) => {
      this[computedSymbol][key] = computed(get.bind(this));
      acc[key] = {
        get: () => this[computedSymbol][key].get(),
        enumerable: true
      };
      return acc;
    }, {});
    Object.defineProperties(this, getters);

    let disposer;
    let error;
    let timeout;
    disposer = autorun(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        throw error;
      }, 5000);
      try {
        while (properties.length) {
          const [key] = properties[0];
          let val = this[key];
          if (val && val[currentSymbol]) {
            val = val[currentSymbol]();
            if (val === undefined) {
              throw Error(`Computed ${key} not resolved`);
            }
            const computedProperty = this[computedSymbol][key];
            let lastVal;
            this[computedSymbol][key] = {
              get: () => {
                const val = computedProperty.get()[currentSymbol]();
                if (val === undefined) return lastVal;
                return (lastVal = val);
              }
            };
          }
          properties.shift();
        }
        waitTillDone[uid] && waitTillDone[uid].set(true);
        clearTimeout(timeout);
        disposer();
      } catch (e) {
        error = e;
      }
    });
  } else {
    waitTillDone[uid].set(true);
  }
  /* End computed properties */
}
