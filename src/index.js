import models from './models';
import collections from './collections';
import views from './views';
import defaultValues from './default-values';
import timestamps from './timestamps';
import hooks from './hooks';
import replication from './replication';

export default function register(RxDB) {
  RxDB.plugin(models);
  RxDB.plugin(collections);
  RxDB.plugin(views);
  RxDB.plugin(defaultValues);
  RxDB.plugin(timestamps);
  RxDB.plugin(hooks);
  RxDB.plugin(replication);
}
