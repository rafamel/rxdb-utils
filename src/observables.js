import { from } from 'rxjs';
import { map, take, switchMap } from 'rxjs/operators';

// TODO test

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
              piping =
                get.constructor.name === 'AsyncFunction'
                  ? // eslint-disable-next-line babel/no-invalid-this
                    switchMap((obj) => from(get.call(this, obj)))
                  : // eslint-disable-next-line babel/no-invalid-this
                    map((obj) => get.call(this, obj));
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
              method.get = get;
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
