/* eslint-disable babel/no-invalid-this */
import { computed, autorun, observable } from 'mobx';

import { isOnable } from './onable';
import toMobx from './to-mobx';

const mobxSymbol = Symbol('observer');
const computedSymbol = Symbol('computed');
export const doneSymbol = Symbol('done');
export default async function createDocument() {
  /* Make properties mobx observables */
  this[mobxSymbol] = {};
  this[doneSymbol] = observable.box(false);

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

  /* Actual computed work */
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
    await new Promise((resolve, reject) => {
      let error;
      let timeout;
      disposer = autorun(() => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          throw error;
        }, 2500);
        try {
          while (properties.length) {
            const [key] = properties[0];
            let val = this[key];
            if (isOnable(val)) {
              val = val.current();
              if (val === undefined) {
                throw Error(`Computed ${key} not resolved`);
              }
              const computedProperty = this[computedSymbol][key];
              let lastVal;
              this[computedSymbol][key] = {
                get: () => {
                  const val = computedProperty.get().current();
                  if (val === undefined) return lastVal;
                  return (lastVal = val);
                }
              };
            }
            properties.shift();
          }
          resolve();
          clearTimeout(timeout);
        } catch (e) {
          error = e;
        }
      });
    });
    disposer();
  }
  this[doneSymbol].set(true);
  this[doneSymbol] = { get: () => true };
  /* End actual computed work */
}
