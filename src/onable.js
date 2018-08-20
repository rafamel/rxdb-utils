export function isOnable(obj) {
  if (!obj) return false;
  return obj.current && obj.promise && obj.on && true;
}

export function onable(parent, cbArr = []) {
  return {
    current() {
      let ans = parent.current();
      if (ans === undefined) return undefined;

      for (let i = 0; i < cbArr.length; i++) {
        const cb = cbArr[i];
        ans = cb(ans);

        // Check if it's returning an onable
        if (isOnable(ans)) {
          const inner = ans.current();
          if (inner === undefined) return undefined;
          return inner;
        }
      }
      return ans;
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
    current() {
      const currentArr = [];
      for (let i = 0; i < onables.length; i++) {
        let one = onables[i];
        if (one.current) {
          one = one.current();
          if (one === undefined) return undefined;
        }
        currentArr.push(one);
      }
      return currentArr;
    },
    promise() {
      return Promise.all(onables.map((x) => (x.promise ? x.promise() : x)));
    },
    on(cb) {
      return onable(this, [cb]);
    }
  });
}
