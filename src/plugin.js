import RxQuery from './rx-query';
import createDocument from './create-document';

const docCreatedSymbol = Symbol('docCreated');
export default {
  rxdb: true,
  prototypes: {
    RxQuery,
    RxCollection(proto) {
      if (!proto._createDocument) {
        throw Error('rxdb-mobx: no RxCollection._createDocument');
      }
      // @todo pass this to the preCreateRxCollection hook once it can be async
      const prevCreate = proto._createDocument;
      Object.assign(proto, {
        async _createDocument(...args) {
          const doc = await prevCreate.apply(this, args);
          if (doc[docCreatedSymbol]) return doc; // Already done for this doc

          doc[docCreatedSymbol] = true;
          await createDocument.call(doc);

          return doc;
        }
      });
    }
  },
  overwritable: {},
  hooks: {
    // preCreateRxCollection(obj) {},
    // postCreateRxDocument(doc) {}
  }
};
