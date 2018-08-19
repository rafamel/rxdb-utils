export default {
  rxdb: true,
  prototypes: {
    RxDatabase(proto) {
      Object.assign(proto, {
        models(models) {
          if (!Array.isArray(models)) models = Object.values(models);
          if (!models.length) return Promise.resolve(this);
          const collections = models.map((model) => this.collection(model));
          return Promise.all(collections).then(() => this);
        }
      });
    }
  },
  overwritable: {},
  hooks: {}
};
