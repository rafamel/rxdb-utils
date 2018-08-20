/* eslint-disable babel/no-invalid-this */
import { autorun } from 'mobx';
import toMobx from './to-mobx';
import { onable } from './onable';
import { doneSymbol } from './create-document';

const mobxSymbol = Symbol('observer');
export default function RxQuery(proto) {
  Object.assign(proto, {
    current() {
      if (!this[mobxSymbol]) {
        const mbx = { it: 0, last: [-1, true] };
        mbx.obs = toMobx(this.$, undefined, (data) => {
          mbx.it++;
          return data;
        });
        this[mobxSymbol] = mbx;
      }
      const { obs, it, last } = this[mobxSymbol];
      const data = obs.get();
      if (!data || (it === last[0] && last[1])) return data;

      const arr = Array.isArray(data) ? data : [data];
      for (let i = 0; i < arr.length; i++) {
        const doc = arr[i];
        if (!doc[doneSymbol].get()) {
          this[mobxSymbol].last = [it, false];
          return undefined;
        }
      }
      this[mobxSymbol].last = [it, true];
      return data;
    },
    promise() {
      return new Promise((resolve, reject) => {
        try {
          const disposer = autorun(() => {
            const val = this.current();
            if (val !== undefined) {
              resolve(val);
              disposer();
            }
          });
        } catch (e) {
          reject(e);
        }
      });
    },
    on(cb) {
      return onable(this, [cb]);
    }
  });
}
