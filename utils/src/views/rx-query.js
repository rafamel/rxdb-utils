import * as Rx from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';
import flattenDeep from 'lodash.flattendeep';
import hash from 'object-hash';
import createSubject from './create-subject';
import { ENSURE_CLEANUP_TIMEOUT, ENSURE_SYMBOL } from './constants';

export default function RxQuery(proto) {
  Object.assign(proto, {
    ensure$(...properties) {
      if (!this.collection.options || !this.collection.options.views) {
        throw Error(
          'RxQuery.ensure$() can only be used on collection with defined views'
        );
      }
      properties = flattenDeep(properties);
      if (!properties.length) properties = this.collection._views;

      const ensureHash = hash(properties, { unorderedArrays: true });

      let ensures = this[ENSURE_SYMBOL];
      if (!ensures) ensures = this[ENSURE_SYMBOL] = {};

      let obs = ensures[ensureHash];
      if (!obs) obs = ensures[ensureHash] = createEnsure(this.$, properties);

      return obs;
    }
  });
}

function createEnsure(observable, properties) {
  let unensureFns = {};
  let lastDocs;

  const obs = observable.pipe(
    switchMap((ans) => {
      if (!ans) return Rx.of(ans);

      const docs = Array.isArray(ans) ? ans : [ans];
      const rxArr = [];
      lastDocs = docs;

      docs.forEach((doc) => {
        const primary = doc.primary;
        if (unensureFns[primary]) return;

        const unensure = doc[ENSURE_SYMBOL](properties);
        unensureFns[primary] = unensure;
        properties.forEach((property) => {
          rxArr.push(doc[property].$);
        });
      });

      return rxArr.length
        ? Rx.combineLatest(...rxArr).pipe(
            take(1),
            map(() => ans)
          )
        : Rx.of(ans);
    })
  );

  let interval;
  let lastCleanupDocs;

  return createSubject(obs, {
    onInit() {
      // Periodic cleanup of ensured docs that are not part of the
      // query response anymore
      interval = setInterval(() => {
        if (!lastDocs || lastCleanupDocs === lastDocs) return;

        lastCleanupDocs = lastDocs;
        const primaries = lastCleanupDocs.reduce((acc, doc) => {
          acc[doc.primary] = true;
          return acc;
        }, {});

        Object.keys(unensureFns).forEach((key) => {
          if (primaries[key]) return;

          unensureFns[key]();
          delete unensureFns[key];
        });
      }, ENSURE_CLEANUP_TIMEOUT);
    },
    onTeardown() {
      const fns = unensureFns;
      unensureFns = {};
      lastDocs = null;
      lastCleanupDocs = null;
      clearInterval(interval);
      Object.values(fns).forEach((fn) => fn());
    }
  });
}
