import * as Rx from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import parseProperties from './parse-properties';

export default function RxDocument(proto) {
  Object.assign(proto, {
    select$(...properties) {
      properties = parseProperties(properties);

      // Properties not specified. Get all first level properties,
      // including views from views plugin (if they exist)
      if (!Object.keys(properties).length) {
        const viewsKeys = this.collection._views;
        return viewsKeys && viewsKeys.length
          ? Rx.combineLatest(
              this.$,
              ...viewsKeys.map((key) => this[key].$)
            ).pipe(
              map((all) => ({
                ...all[0],
                ...viewsKeys.reduce(
                  (acc, key, i) => {
                    acc[key] = all[i + 1];
                    return acc;
                  },
                  { _: this }
                )
              }))
            )
          : this.$.pipe(map((res) => ({ ...res, _: this })));
      }

      // Properties specified, parse
      return createCombinedObservable(Rx.of(this), properties);
    }
  });
}

function createCombinedObservable(obs, properties) {
  const keys = Object.keys(properties);

  const getObs = [];
  return obs.pipe(
    switchMap((res) => {
      if (!getObs.length) {
        keys.forEach((key) => {
          if (res[key + '$']) return getObs.push((x) => x[key + '$']);

          const value = res[key];
          if (value && value.$) return getObs.push((x) => x[key].$);

          return getObs.push((x) => x[key]);
        });
      }

      return Rx.combineLatest(
        ...getObs.map((getObsFn, i) => {
          const nextProperties = properties[keys[i]];
          return Object.keys(nextProperties).length
            ? createCombinedObservable(getObsFn(res), nextProperties)
            : getObsFn(res);
        })
      ).pipe(
        map((all) => {
          return all.reduce(
            (acc, val, i) => {
              acc[keys[i]] = val;
              return acc;
            },
            { _: res }
          );
        })
      );
    })
  );
}
