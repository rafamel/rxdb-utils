import { fromResource } from 'mobx-utils';

// Creating it anew from fromResource so we have control over isAlive()
export default function toMobx(rx$, getDefaultValue, callback) {
  function createObserver() {
    let subscription;
    return fromResource(
      (sink) =>
        (subscription = rx$.subscribe(
          callback ? (data) => sink(callback(data)) : sink
        )),
      () => {
        subscription && subscription.complete();
        subscription = null;
      },
      getDefaultValue ? getDefaultValue() : undefined
    );
  }

  let observer;
  return {
    get() {
      if (!observer) {
        observer = createObserver();
        const interval = setInterval(() => {
          if (observer.isAlive()) return;

          // Clear subscription on 10s timeout
          clearInterval(interval);
          observer.dispose();
          observer = null;
        }, 10000);
      }
      return observer.current();
    }
  };
}
