export default {
  rxdb: true,
  prototypes: {},
  overwritable: {},
  hooks: {
    preCreateRxCollection(model = {}) {
      return {
        ...model,
        statics: {
          ...(model.statics || {}),
          collections() {
            return this.database.collections;
          }
        },
        methods: {
          ...(model.methods || {}),
          collections() {
            return this.collection.collections();
          }
        }
      };
    }
  }
};
