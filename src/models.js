export default {
  rxdb: true,
  prototypes: {
    RxDatabase(proto) {
      Object.assign(proto, {
        models(models) {
          if (Array.isArray(models)) {
            if (!models.length) return Promise.resolve(this);
          } else {
            if (!models) return Promise.resolve(this);
            else models = [models];
          }

          const collections = models.map((model) => this.collection(model));
          return Promise.all(collections).then(() => this);
        }
      });
    }
  },
  overwritable: {},
  hooks: {}
};
