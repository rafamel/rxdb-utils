// TODO: remove when RxDB is updated

export default {
  rxdb: true,
  prototypes: {
    RxDocument(proto) {
      const prevRemove = proto.remove;
      Object.assign(proto, {
        async remove(...args) {
          return await prevRemove.apply(this, args);
        }
      });
    }
  },
  overwritable: {},
  hooks: {}
};
