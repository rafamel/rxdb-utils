import createGetter from './create-getter';

const SYMBOL = Symbol('observables');

// TODO: Documentation
// TODO: test
export default {
  rxdb: true,
  prototypes: {},
  overwritable: {},
  hooks: {
    createRxCollection(collection) {
      const { options } = collection;
      if (!options || !options.views) return;

      const desc = Object.getOwnPropertyDescriptors(options.views);
      const properties = Object.entries(desc).filter(([_, { get }]) => get);
      const getters = properties.reduce((acc, [key, { get }]) => {
        acc[key] = {
          get() {
            if (!this[SYMBOL][key]) {
              this[SYMBOL][key] = createGetter.call(this, get);
            }
            return this[SYMBOL][key];
          },
          enumerable: true
        };
        return acc;
      }, {});

      const proto = collection.getDocumentPrototype();
      Object.defineProperties(proto, getters);
    },
    postCreateRxDocument(doc) {
      doc[SYMBOL] = {};
    }
  }
};
