import { RxQuery, RxDocument } from './prototypes';
import { computed, autorun } from 'mobx';
import { isOnable } from './onable';

const computedSymbol = Symbol('computed');
export default {
  rxdb: true,
  prototypes: {
    RxQuery,
    RxDocument(proto) {
      RxDocument(proto);

      const prevPopulate = proto.populate;
      Object.assign(proto, {
        populate(...args) {
          const schemaObj = this.collection.schema.getSchemaByObjectPath(
            args[0]
          );
          console.log(schemaObj);
          console.log(args[0]);
          return prevPopulate.apply(this, args);
        }
      });
    },
    RxCollection(proto) {
      if (!proto._createDocument) {
        throw Error('rxdb-mobx: no RxCollection._createDocument');
      }
      // @todo pass this to the preCreateRxCollection hook once it can be async
      const prevCreate = proto._createDocument;
      Object.assign(proto, {
        async _createDocument(...args) {
          const doc = await prevCreate.apply(this, args);
          if (doc[computedSymbol]) return doc;

          /* Actual work */
          doc[computedSymbol] = {};
          const options = doc.collection.options;
          if (options && options.computed) {
            const desc = Object.getOwnPropertyDescriptors(options.computed);
            const properties = Object.entries(desc).filter(
              ([_, { get }]) => get
            );
            const getters = properties.reduce((acc, [key, { get }]) => {
              doc[computedSymbol][key] = computed(get.bind(doc));
              acc[key] = {
                get: () => doc[computedSymbol][key].get(),
                enumerable: true
              };
              return acc;
            }, {});
            Object.defineProperties(doc, getters);

            await new Promise((resolve, reject) => {
              let error;
              let timeout;
              const disposer = autorun(() => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                  throw error;
                }, 2500);
                try {
                  while (properties.length) {
                    const [key] = properties[0];
                    let val = doc[key];
                    if (isOnable(val)) {
                      val.current();
                      if (!val.resolved()) {
                        throw Error(`Computed ${key} not resolved`);
                      }
                      const computedProperty = doc[computedSymbol][key];
                      doc[computedSymbol][key] = {
                        get: () => computedProperty.get().current()
                      };
                    }
                    properties.shift();
                  }
                  resolve();
                  clearTimeout(timeout);
                  disposer();
                } catch (e) {
                  error = e;
                }
              });
            });
          }
          /* End actual work */

          return doc;
        }
      });
    }
  },
  overwritable: {},
  hooks: {
    preCreateRxCollection(obj) {
      if (!obj.methods) obj.methods = {};

      [obj.methods, obj.options.computed || {}].forEach((x) => {
        ['current', 'dispose', 'resolved', 'promise', 'on'].forEach((key) => {
          if (!x[key]) return;
          throw Error(`RxDB methods/properties cannot be called "${key}"`);
        });
      });
    },
    postCreateRxDocument(doc) {}
  }
};
