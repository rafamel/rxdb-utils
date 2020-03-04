import uuid from 'uuid/v4';
import { take, tap } from 'rxjs/operators';
import createSubject from './create-subject';
import { OBSERVABLES_SYMBOL, ENSURE_SYMBOL } from './constants';

export default function RxDocument(proto, viewsArr) {
  // Define getters for views

  Object.defineProperties(
    proto,
    viewsArr.reduce((acc, [key, { get }]) => {
      acc[key] = {
        get() {
          let ans = this[OBSERVABLES_SYMBOL][key];
          if (ans) return ans;

          const getObs = get.bind(this);
          ans = this[OBSERVABLES_SYMBOL][key] = createView(getObs);
          return ans;
        },
        enumerable: true
      };
      return acc;
    }, {})
  );

  Object.assign(proto, {
    [ENSURE_SYMBOL]: function ensure(propertyNames) {
      if (!propertyNames.length) propertyNames = this.collection._views;

      const unensureFns = [];
      propertyNames.forEach((property) => {
        unensureFns.push(this[property][ENSURE_SYMBOL]());
      });

      function unensure() {
        unensureFns.forEach((fn) => fn());
      }
      return unensure;
    }
  });
}

function createView(getObs) {
  const obj = {};

  let value;
  let observable;
  let ensured = false;
  const ensuredIds = {};
  Object.defineProperties(obj, {
    [ENSURE_SYMBOL]: {
      value: function ensure() {
        const id = uuid();
        ensured = true;
        ensuredIds[id] = true;
        return function unensure() {
          ensured = null;
          delete ensuredIds[id];
        };
      },
      enumerable: true
    },
    ensured: {
      get() {
        if (ensured === null) ensured = Boolean(Object.keys(ensuredIds).length);
        return ensured;
      },
      enumerable: true
    },
    $: {
      get() {
        if (!observable) {
          const obs = getObs().pipe(tap((res) => obj.ensured && (value = res)));
          observable = createSubject(obs, { keepOpenCheck: () => obj.ensured });
        }
        return observable;
      },
      enumerable: true
    },
    promise: {
      get() {
        return obj.$.pipe(take(1)).toPromise();
      },
      enumerable: true
    },
    exec: {
      value: function exec() {
        return getObs()
          .pipe(take(1))
          .toPromise();
      },
      enumerable: true
    },
    value: {
      get() {
        if (!obj.ensured) {
          throw Error(
            'Tried to get an view value for RxDocument not part of an ensure$() query'
          );
        }
        return value;
      },
      enumerable: true
    }
  });

  return obj;
}
