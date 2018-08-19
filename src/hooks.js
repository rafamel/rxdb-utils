export default {
  rxdb: true,
  prototypes: {
    RxDatabase(proto) {
      const prevCollection = proto.collection;
      Object.assign(proto, {
        async collection(model, ...other) {
          const hooks = model && model.options && model.options.hooks;

          const collection = await prevCollection.call(this, model, other);
          if (!hooks) return collection;

          Object.keys(hooks).forEach((hook) => {
            collection[hook](function(doc, ...other) {
              return hooks[hook](doc, collection, ...other);
            });
          });

          return collection;
        }
      });
    }
  },
  overwritable: {},
  hooks: {}
};
