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

          collection.preInsert((data) => {
            Object.entries(defaultValues).forEach(([key, value]) => {
              if (!Object.hasOwnProperty.call(data, [key])) {
                data[key] = value;
              }
            });
            return data;
          });

          return collection;
        }
      });
    }
  },
  overwritable: {},
  hooks: {}
};
