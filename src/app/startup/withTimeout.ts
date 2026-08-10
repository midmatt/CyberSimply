// src/app/startup/withTimeout.ts

export type WithTimeoutOptions = {
  /** When true, timeouts/errors are logged at debug level only (no LogBox). */
  quiet?: boolean;
};

/**
 * Race a promise against a timeout. Always resolves (never rejects) so
 * non-critical startup work cannot block the UI. Expected timeouts should
 * pass `{ quiet: true }` to avoid LogBox yellow boxes in development.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms = 3500,
  label = 'startup',
  options: WithTimeoutOptions = {}
): Promise<T | undefined> {
  const { quiet = false } = options;

  return new Promise<T | undefined>((resolve) => {
    let done = false;
    const id = setTimeout(() => {
      if (!done) {
        done = true;
        if (quiet) {
          if (__DEV__) {
            console.log(`[startup] timeout after ${ms}ms: ${label} (non-critical)`);
          }
        } else {
          console.warn(`[startup] timeout after ${ms}ms: ${label}`);
        }
        resolve(undefined);
      }
    }, ms);

    promise
      .then((v) => {
        if (done) return;
        done = true;
        clearTimeout(id);
        resolve(v);
      })
      .catch((e) => {
        if (done) return;
        done = true;
        clearTimeout(id);
        if (quiet) {
          if (__DEV__) {
            console.log(`[startup] error in ${label} (non-critical):`, e);
          }
        } else {
          console.warn(`[startup] error in ${label}:`, e);
        }
        resolve(undefined);
      });
  });
}
