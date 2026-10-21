/** Share in-flight work and a bounded snapshot across visitors in this process. */
export function cachedLoader<T>(load: () => Promise<T>, ttlMs: number, now = Date.now) {
  let snapshot: { value: T; expiresAt: number } | undefined;
  let pending: Promise<T> | undefined;
  return function get(): Promise<T> {
    if (snapshot && now() < snapshot.expiresAt) return Promise.resolve(snapshot.value);
    if (pending) return pending;
    pending = Promise.resolve().then(load).then(value => {
      snapshot = { value, expiresAt: now() + ttlMs };
      return value;
    }).finally(() => { pending = undefined; });
    return pending;
  };
}
