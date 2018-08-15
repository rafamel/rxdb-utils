/* eslint-disable babel/no-invalid-this */
import memoize from 'memoizee';
import { computed } from 'mobx';

const computedSymbol = Symbol('computed');

export default function memoizeDocumentView(key, fn) {
  const fnLength = fn.length;

  return function(...args) {
    if (!this[computedSymbol]) this[computedSymbol] = {};
    if (!this[computedSymbol][key]) {
      const boundFn = fn.bind(this);
      this[computedSymbol][key] = memoize(
        (...innerArgs) => computed(() => boundFn(...innerArgs)),
        { length: fnLength }
      );
    }
    return this[computedSymbol][key](...args).get();
  };
}
