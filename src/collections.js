export default {
  rxdb: true,
  prototypes: {},
  overwritable: {},
  hooks: {
    preCreateRxCollection(model) {
      if (!model.statics) model.statics = {};
      if (!model.methods) model.methods = {};

      model.statics.collections = function collections() {
        return this.database.collections;
      };

      model.methods.collections = function collections() {
        return this.collection.collections();
      };

      return model;
    }
  }
};
