import { currentSymbol } from './symbols';
import { allCreated } from './create-document';

export function safe() {
  try {
    // eslint-disable-next-line
    const ans = this[currentSymbol].call(this);
    return allCreated() ? ans : undefined;
  } catch (e) {
    if (allCreated()) throw e;
  }
}

export function isOnable(obj) {
  if (!obj) return false;
  return obj[currentSymbol] && true;
}

export function onable(parent, cbArr = []) {
  return {
    [currentSymbol]() {
      let ans = parent[currentSymbol]();
      if (ans === undefined) return undefined;

      for (let i = 0; i < cbArr.length; i++) {
        const cb = cbArr[i];
        ans = cb(ans);

        // Check if it's returning an onable
        if (isOnable(ans)) {
          const inner = ans[currentSymbol]();
          if (inner === undefined) return undefined;
          return inner;
        }
      }
      return ans;
    },
    current() {
      return safe.call(this);
    },
    promise() {
      let promise = parent.promise();

      for (let i = 0; i < cbArr.length; i++) {
        const cb = cbArr[i];
        promise = promise.then(cb).then((ans) => {
          return isOnable(ans) ? ans.promise() : ans;
        });
      }

      return promise;
    },
    on(cb) {
      return onable(parent, cbArr.concat(cb));
    }
  };
}

export function on(onables) {
  if (!Array.isArray(onables)) onables = [onables];

  return onable({
    [currentSymbol]() {
      const currentArr = [];
      for (let i = 0; i < onables.length; i++) {
        let one = onables[i];
        if (one.current) {
          one = one[currentSymbol]();
          if (one === undefined) return undefined;
        }
        currentArr.push(one);
      }
      return currentArr;
    },
    current() {
      return safe.call(this);
    },
    promise() {
      return Promise.all(onables.map((x) => (x.promise ? x.promise() : x)));
    },
    on(cb) {
      return onable(this, [cb]);
    }
  });
}
