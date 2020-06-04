import models from './models'
import collections from './collections'
import defaultValues from './default-values'
import timestamps from './timestamps'
import views from './views'
import select from './select'
import observables from './observables'
import hooks from './hooks'
import replication from './replication'

export default function register (addRxPlugin) {
  addRxPlugin(models)
  addRxPlugin(collections)
  addRxPlugin(defaultValues)
  addRxPlugin(timestamps)
  addRxPlugin(views)
  addRxPlugin(select)
  addRxPlugin(observables)
  addRxPlugin(hooks)
  addRxPlugin(replication)
}
