export function isOnable(obj) {
  if (!obj) return false;
  return obj.current && obj.resolved && obj.promise && true;
}

export function onable(parent, cbArr = []) {
  let resolved = false;
  return {
    current() {
      let ans = parent.current();
      if (!parent.resolved()) return undefined;

      for (let i = 0; i < cbArr.length; i++) {
        const cb = cbArr[i];
        ans = cb(ans);

        // Check if it's returning an onable
        if (isOnable(ans)) {
          const inner = ans.current();
          if (!ans.resolved()) return undefined;
          ans = inner;
        }
      }
      resolved = true;
      return ans;
    },
    resolved() {
      return resolved;
    },
    promise() {
      let promise = parent.promise();

      for (let i = 0; i < cbArr.length; i++) {
        const cb = cbArr[i];
        promise = promise.then(cb).then((ans) => {
          return ans.current && ans.resolved && ans.promise
            ? ans.promise()
            : ans;
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
    current() {
      const currentArr = [];
      for (let i = 0; i < onables.length; i++) {
        const one = onables[i];
        currentArr.push((one.current && one.current()) || one);
      }
      return this.resolved() ? currentArr : undefined;
    },
    resolved() {
      for (let i = 0; i < onables.length; i++) {
        if (!onables[i].resolved) continue;
        if (!onables[i].resolved()) return false;
      }
      return true;
    },
    promise() {
      return Promise.all(onables.map((x) => (x.promise && x.promise()) || x));
    },
    on(cb) {
      return onable(this, [cb]);
    }
  });
}
