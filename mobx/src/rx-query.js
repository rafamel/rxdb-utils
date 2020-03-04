/* eslint-disable babel/no-invalid-this */
import { autorun } from 'mobx';
import toMobx from './to-mobx';
import { currentSymbol, mobxSymbol } from './symbols';
import { safe, onable } from './onable';

export default function RxQuery(proto) {
  Object.assign(proto, {
    [currentSymbol]() {
      if (!this[mobxSymbol]) this[mobxSymbol] = toMobx(this.$);
      return this[mobxSymbol].get();
    },
    current() {
      return safe.call(this);
    },
    promise() {
      let disposer;
      return new Promise((resolve, reject) => {
        try {
          disposer = autorun(() => {
            const val = this.current();
            if (val !== undefined) resolve(val);
          });
        } catch (e) {
          reject(e);
        }
      }).then((val) => {
        disposer();
        return this.exec().then((x) => (x === undefined ? val : x));
      });
    },
    on(cb) {
      return onable(this, [cb]);
    }
  });
}
