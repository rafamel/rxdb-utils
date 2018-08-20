import RxQuery from './rx-query';
import createDocument from './create-document';

export default {
  rxdb: true,
  prototypes: {
    RxQuery
  },
  overwritable: {},
  hooks: {
    postCreateRxDocument(doc) {
      createDocument.call(doc);
    }
  }
};
