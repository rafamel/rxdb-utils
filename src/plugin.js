import { RxQuery, RxDocument } from './prototypes';
import memoizeView from './mem-view';

export default {
  rxdb: true,
  prototypes: {
    RxQuery,
    RxDocument
  },
  overwritable: {},
  hooks: {
    preCreateRxCollection(obj) {
      if (!obj.methods) obj.methods = {};
      const options = obj.options || {};

      [obj.methods, obj.options.views || {}].forEach((x) => {
        ['current', 'dispose', 'resolved', 'promise', 'on'].forEach((key) => {
          if (!x[key]) return;
          throw Error(`RxDB methods/properties cannot be called "${key}"`);
        });
      });

      if (options.views) {
        // Add in views/view getters
        if (options.views) {
          Object.entries(
            Object.getOwnPropertyDescriptors(options.views)
          ).forEach(([key, { get, value }]) => {
            const memoized = memoizeView(
              key,
              get || value || obj.options.views[key]
            );
            obj.methods[key] = memoized;
          });
        }
      }
    }
  }
};
