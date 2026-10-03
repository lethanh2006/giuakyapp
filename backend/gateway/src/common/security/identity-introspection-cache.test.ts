import assert from 'node:assert/strict';
import test from 'node:test';
import { IdentityIntrospectionCache } from './identity-introspection-cache';

test('coalesces concurrent loads and reuses a successful identity until TTL', async () => {
  let now = 0;
  let loads = 0;
  const cache = new IdentityIntrospectionCache<{ role: string }>(
    250,
    10,
    () => now,
  );
  const load = async () => {
    loads += 1;
    await Promise.resolve();
    return { role: 'user' };
  };

  const values = await Promise.all([
    cache.get('token-digest', load),
    cache.get('token-digest', load),
    cache.get('token-digest', load),
  ]);
  assert.equal(loads, 1);
  assert.deepEqual(
    values.map(({ role }) => role),
    ['user', 'user', 'user'],
  );

  await cache.get('token-digest', load);
  assert.equal(loads, 1);

  now = 251;
  await cache.get('token-digest', load);
  assert.equal(loads, 2);
});

test('does not cache rejected introspection results', async () => {
  const cache = new IdentityIntrospectionCache<string>(250);
  let loads = 0;
  const rejected = () => {
    loads += 1;
    return Promise.reject(new Error('Auth unavailable'));
  };

  await assert.rejects(cache.get('token-digest', rejected), /Auth unavailable/);
  await assert.rejects(cache.get('token-digest', rejected), /Auth unavailable/);
  assert.equal(loads, 2);
});

test('keeps cache bounds and rejects excessive TTLs', async () => {
  let now = 0;
  const cache = new IdentityIntrospectionCache<string>(250, 1, () => now);
  await cache.get('first', () => Promise.resolve('a'));
  await cache.get('second', () => Promise.resolve('b'));
  now = 251;
  let loads = 0;
  await cache.get('first', () => {
    loads += 1;
    return Promise.resolve('new');
  });
  assert.equal(loads, 1);
  assert.throws(() => new IdentityIntrospectionCache<string>(1001));
});
