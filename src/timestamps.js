const options = (src) => {
  const { timestamps } = Object.assign({}, src.database.options, src.options);
  if (!timestamps) return false;
  let fields = {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };
  if (timestamps !== true) {
    fields = Object.assign(fields, timestamps);
  }
  return fields;
};

export default {
  rxdb: true,
  prototypes: {
    RxDatabase(proto) {
      const prevCollection = proto.collection;
      Object.assign(proto, {
        async collection(model, ...other) {
          const collection = await prevCollection.call(this, model, other);

          const fields = options(collection);
          if (!fields) return collection;

          // Register hooks
          collection.preInsert((data) => {
            const now = new Date().toISOString();
            if (!data[fields.createdAt]) data[fields.createdAt] = now;
            if (!data[fields.updatedAt]) data[fields.updatedAt] = now;

            return data;
          });

          collection.preSave((data, doc) => {
            data[fields.updatedAt] = new Date().toISOString();
            return data;
          });

          return collection;
        }
      });
    }
  },
  overwritable: {},
  hooks: {
    preCreateRxCollection(model) {
      if (!model.schema || !model.schema.properties) {
        throw Error(
          'RxCollection(s) must have a a "schema" property, with a "properties" key'
        );
      }

      const fields = options(model);
      if (!fields) return model;

      // Set schema
      if (!model.schema.properties[fields.createdAt]) {
        model.schema.properties[fields.createdAt] = {
          format: 'date-time',
          type: 'string',
          final: true
        };
      }
      if (!model.schema.properties[fields.updatedAt]) {
        model.schema.properties[fields.updatedAt] = {
          format: 'date-time',
          type: 'string'
        };
      }

      model.schema.required = (model.schema.required || []).concat([
        fields.createdAt,
        fields.updatedAt
      ]);

      return model;
    }
  }
};
