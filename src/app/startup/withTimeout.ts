// src/app/startup/withTimeout.ts
export function withTimeout<T>(
  promise: Promise<T>,
  ms = 3500,
  label = 'startup'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let done = false;
    const id = setTimeout(() => {
      if (!done) {
        console.warn(`[startup] timeout after ${ms}ms: ${label}`);
        // Resolve with undefined for non-critical steps; reject only for truly critical ones.
        // We'll resolve with undefined here; callers can handle default/fallback.
        // @ts-ignore
        resolve(undefined);
      }
    }, ms);
    promise
      .then((v) => {
        done = true;
        clearTimeout(id);
        resolve(v);
      })
      .catch((e) => {
        done = true;
        clearTimeout(id);
        console.warn(`[startup] error in ${label}:`, e);
        // Resolve undefined so UI can continue; log for telemetry.
        // @ts-ignore
        resolve(undefined);
      });
  });
}
