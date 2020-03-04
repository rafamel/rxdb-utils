// TODO: remove when RxDB is updated

export default {
  rxdb: true,
  prototypes: {
    RxDocument(proto) {
      const prevRemove = proto.remove;
      Object.assign(proto, {
        async remove(...args) {
          try {
            return await prevRemove.apply(this, args);
          } catch (e) {
            throw e;
          }
        }
      });
    }
  },
  overwritable: {},
  hooks: {}
};
