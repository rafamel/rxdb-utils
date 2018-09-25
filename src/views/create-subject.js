import * as Rx from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  CLOSE_SUBSCRIPTION_TIMEOUT,
  CHECK_KEEP_OPEN_TIMEOUT
} from './constants';

const INIT_VAL = {};
export default function createSubject(observable, opts = {}) {
  let options = {
    keepOpenCheck: () => false,
    onInit: () => {},
    onTeardown: () => {}
  };
  Object.assign(options, opts);

  let subject;
  let subscription;
  const lifecycle = {
    init() {
      subject = new Rx.BehaviorSubject(INIT_VAL).pipe(
        filter((x) => x !== INIT_VAL)
      );
      subscription = observable.subscribe(subject);
      options.onInit();
    },
    teardown() {
      const subs = subscription;
      const subj = subject;
      options.onTeardown();
      subs.unsubscribe();
      subj.unsubscribe();
    },
    subscribe(obs) {
      return subject.subscribe(obs);
    },
    unsubscribe(subs) {
      subs.unsubscribe();
    }
  };

  let subscriptions = 0;
  let isAlive = false;
  let interval;
  return Rx.Observable.create((obs) => {
    subscriptions++;
    clearInterval(interval);
    if (!isAlive) (isAlive = true) && lifecycle.init();

    const subs = lifecycle.subscribe(obs);

    return () => {
      subscriptions--;
      lifecycle.unsubscribe(subs);

      if (subscriptions) return;

      setTimeout(() => {
        if (subscriptions || !isAlive) return;

        const kill = () => {
          isAlive = false;
          lifecycle.teardown();
          clearInterval(interval);
        };

        if (!options.keepOpenCheck()) kill();
        else {
          interval = setInterval(() => {
            if (subscriptions || !isAlive) return clearInterval(interval);
            if (!options.keepOpenCheck()) kill();
          }, CHECK_KEEP_OPEN_TIMEOUT);
        }
      }, CLOSE_SUBSCRIPTION_TIMEOUT);
    };
  });
}
