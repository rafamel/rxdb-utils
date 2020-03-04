import log, { levels as loglevels } from 'loglevel';
const logger = log.getLogger('rxdb-utils');

const isDevelopment =
  (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') ||
  process.env.NODE_ENV === 'development';

function loglevel(level) {
  return logger.setLevel(level);
}

loglevel(isDevelopment ? loglevels.WARN : loglevels.ERROR);

export { logger as default, loglevel, loglevels };
