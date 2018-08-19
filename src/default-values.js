export default {
  rxdb: true,
  prototypes: {
    RxDatabase(proto) {
      const prevCollection = proto.collection;
      Object.assign(proto, {
        async collection(model, ...other) {
          const defaultValues =
            model && model.options && model.options.defaultValues;

          const collection = await prevCollection.call(this, model, other);
          if (!defaultValues) return collection;

          collection.preInsert((doc) => {
            Object.entries(defaultValues).forEach(([key, value]) => {
              if (!doc.hasOwnProperty[key]) doc[key] = value;
            });
            return doc;
          });

          return collection;
        }
      });
    }
  },
  overwritable: {},
  hooks: {}
};
