import RxQuery from './rx-query';
import createDocument from './create-document';
import { subscribableSymbol } from './symbols';

export default {
  rxdb: true,
  prototypes: {
    RxQuery
  },
  overwritable: {},
  hooks: {
    createRxCollection(collection) {
      collection[subscribableSymbol] = Object.keys(
        collection.schema.jsonID.properties
      ).filter((key) => !collection.schema.finalFields.includes(key));
    },
    postCreateRxDocument(doc) {
      createDocument.call(doc);
    }
  }
};
