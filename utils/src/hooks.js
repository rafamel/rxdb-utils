function registerHooks(collection, hooks) {
  if (!hooks) return collection;

  Object.keys(hooks).forEach((hook) => {
    if (hook !== 'preInsert') collection[hook](hooks[hook]);
    else {
      // Add collection arg to preInsert
      collection[hook](function(data) {
        // eslint-disable-next-line babel/no-invalid-this
        return hooks[hook].call(this, data, collection);
      });
    }
  });
  return collection;
}

export default {
  rxdb: true,
  prototypes: {
    RxDatabase(proto) {
      const prevCollection = proto.collection;
      Object.assign(proto, {
        async collection(model, ...other) {
          const hooks = model && model.options && model.options.hooks;
          const collection = await prevCollection.call(this, model, other);

          return registerHooks.call(this, collection, hooks);
        }
      });
    },
    RxCollection(proto) {
      const prevInMemory = proto.inMemory;
      Object.assign(proto, {
        async inMemory(...args) {
          const collection = await prevInMemory.apply(this, args);
          const hooks = collection.options && collection.options.hooks;

          return registerHooks.call(this, collection, hooks);
        }
      });
    }
  },
  overwritable: {},
  hooks: {}
};
