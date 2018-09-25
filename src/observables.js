import { map, take } from 'rxjs/operators';

// TODO document
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
            const subs = $.apply(this, args);
            return {
              // eslint-disable-next-line babel/no-invalid-this
              $: get ? subs.pipe(map((obj) => get.call(this, obj))) : subs,
              exec: () => {
                return subs
                  .pipe(
                    take(1),
                    // eslint-disable-next-line babel/no-invalid-this
                    get ? map((obj) => get.call(this, obj)) : (x) => x
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
