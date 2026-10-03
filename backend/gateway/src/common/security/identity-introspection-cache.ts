import { performance } from 'node:perf_hooks';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** Bounded, per-process cache for successful identity introspection results. */
export class IdentityIntrospectionCache<T> {
  private readonly pending = new Map<string, Promise<T>>();
  private readonly cached = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 10_000,
    private readonly now: () => number = () => performance.now(),
  ) {
    if (
      !Number.isInteger(ttlMs) ||
      ttlMs < 0 ||
      ttlMs > 1000 ||
      !Number.isInteger(maxEntries) ||
      maxEntries < 1
    ) {
      throw new Error('Invalid identity introspection cache bounds');
    }
  }

  get(key: string, load: () => Promise<T>): Promise<T> {
    const entry = this.cached.get(key);
    if (entry && entry.expiresAt > this.now()) {
      return Promise.resolve(entry.value);
    }
    this.cached.delete(key);

    const existing = this.pending.get(key);
    if (existing !== undefined) return existing;

    const pending = Promise.resolve().then(load);
    this.pending.set(key, pending);
    const release = () => {
      if (this.pending.get(key) === pending) this.pending.delete(key);
    };
    void pending.then((value) => {
      if (this.pending.get(key) !== pending) return;
      release();
      if (this.ttlMs === 0) return;
      if (this.cached.size >= this.maxEntries) {
        const oldest = this.cached.keys().next();
        if (!oldest.done) this.cached.delete(oldest.value);
      }
      this.cached.set(key, { value, expiresAt: this.now() + this.ttlMs });
    }, release);
    return pending;
  }
}
