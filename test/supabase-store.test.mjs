import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseStore } from '../supabase-store.mjs';

test('coalesces concurrent Supabase state reads and returns independent snapshots', async () => {
  let stateReads = 0;
  const state = { _revision: 7, classes: [] };
  const fetchImpl = async (url) => {
    const target = String(url);
    if (target.includes('/rest/v1/rpc/portal_initialize')) {
      return new Response(null, { status: 204 });
    }
    if (target.includes('/rest/v1/portal_state?id=eq.1&select=data')) {
      stateReads += 1;
      await new Promise(resolve => setTimeout(resolve, 25));
      return new Response(JSON.stringify([{ data: state }]), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    throw new Error('Unexpected mock request: ' + target);
  };

  const store = await createSupabaseStore({
    url: 'https://example.supabase.co',
    key: 'test-service-role-key',
    initialState: state,
    fetchImpl
  });

  const [first, second] = await Promise.all([store.read(), store.read()]);
  assert.equal(stateReads, 1);
  first.classes.push({ id: 'local-change' });
  assert.equal(second.classes.length, 0);

  const third = await store.read();
  assert.equal(stateReads, 2);
  assert.equal(third.classes.length, 0);
});