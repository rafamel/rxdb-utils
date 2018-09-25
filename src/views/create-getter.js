import * as Rx from 'rxjs';
import { take, filter } from 'rxjs/operators';

const CLOSE_SUBSCRIPTION_TIMEOUT = 10000; // 10s
const INIT_VAL = {};

export default function createGetter(get) {
  const obj = {};
  let observable;
  Object.defineProperties(obj, {
    $: {
      get: () => {
        if (!observable) {
          const subject = new Rx.BehaviorSubject(INIT_VAL);
          // eslint-disable-next-line babel/no-invalid-this
          const subscription = get.call(this).subscribe(subject);
          observable = subject
            .pipe(filter((x) => x !== INIT_VAL))
            .asObservable();

          // Clean up if not in use (check every 10s)
          const interval = setInterval(() => {
            if (subject.observers.length) return;
            clearInterval(interval);
            subscription.unsubscribe();
            subject.unsubscribe();
            observable = null;
          }, CLOSE_SUBSCRIPTION_TIMEOUT);
        }
        return observable;
      },
      enumerable: true
    },
    exec: {
      value: function exec() {
        return get
          .call(this)
          .pipe(take(1))
          .toPromise();
        // eslint-disable-next-line babel/no-invalid-this
      }.bind(this),
      enumerable: true
    }
  });
  return obj;
}
