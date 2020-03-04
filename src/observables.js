import { from, of as observableOf } from 'rxjs';
import { take, switchMap } from 'rxjs/operators';

export default {
  rxdb: true,
  prototypes: {},
  overwritable: {},
  hooks: {
    createRxCollection(collection) {
      const { options } = collection;
      if (!options || !options.observables) return;

      const getters = Object.entries(options.observables).reduce(
        (acc, [key, value]) => {
          let $, get;
          if (typeof value === 'function') {
            $ = value;
          } else {
            $ = value.$;
            get = value.get;
          }

          function observableMethod(...args) {
            // eslint-disable-next-line babel/no-invalid-this
            const obs = $.apply(this, args);

            let piping;
            if (get) {
              piping = switchMap((obj) => {
                // eslint-disable-next-line babel/no-invalid-this
                const res = get.call(this, obj);
                return res.then ? from(res) : observableOf(res);
              });
            }
            return {
              $: get ? obs.pipe(piping) : obs,
              exec: () => {
                return obs
                  .pipe(
                    take(1),
                    get ? piping : (x) => x
                  )
                  .toPromise();
              }
            };
          }

          acc[key] = {
            get() {
              const method = observableMethod.bind(this);
              method.get = get ? get.bind(this) : undefined;
              return method;
            },
            enumerable: true
          };
          return acc;
        },
        {}
      );

      const proto = collection.getDocumentPrototype();
      Object.defineProperties(proto, getters);
    }
  }
};
