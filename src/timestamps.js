export default {
  rxdb: true,
  prototypes: {
    RxDatabase(proto) {
      const prevCollection = proto.collection;
      Object.assign(proto, {
        async collection(model, ...other) {
          const timestamps = model && model.options && model.options.timestamps;

          const collection = await prevCollection.call(this, model, other);
          if (!timestamps) return collection;

          // Register hooks
          collection.preInsert((doc) => {
            const now = new Date().toISOString();
            if (!doc.createdAt) doc.createdAt = now;
            if (!doc.updatedAt) doc.updatedAt = now;

            return doc;
          });

          collection.preSave((doc) => {
            if (!doc.updatedAt) doc.updatedAt = new Date().toISOString();
            return doc;
          });

          return collection;
        }
      });
    }
  },
  overwritable: {},
  hooks: {
    preCreateRxCollection(model) {
      const timestamps = model && model.options && model.options.timestamps;
      if (!timestamps) return model;

      // Set schema
      if (!model.schema) model.schema = {};
      if (!model.schema.properties) model.schema.properties = {};
      model.schema.properties.createdAt = model.schema.properties.createdAt || {
        format: 'date-time',
        type: 'string'
      };
      model.schema.properties.updatedAt = model.schema.properties.updatedAt || {
        format: 'date-time',
        type: 'string'
      };

      model.schema.required = (model.schema.required || []).concat([
        'createdAt',
        'updatedAt'
      ]);

      return model;
    }
  }
};
