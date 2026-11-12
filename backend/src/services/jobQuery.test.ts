import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseJobListQuery } from './jobQuery';

test('defaults keep existing callers working', () => {
  const r = parseJobListQuery({});
  assert.deepEqual({ filter: r.filter, limit: r.limit, skip: r.skip, sort: r.sort }, { filter: {}, limit: 100, skip: 0, sort: { createdAt: -1 } });
});

test('paging: page is 1-based, limit capped at 100, invalid values ignored', () => {
  assert.equal(parseJobListQuery({ page: '3', limit: '24' }).skip, 48);
  assert.equal(parseJobListQuery({ limit: '500' }).limit, 100);
  for (const bad of ['0', '-5', 'abc', '1.5', '', ['1', '2']]) {
    const r = parseJobListQuery({ page: bad, limit: bad });
    assert.equal(r.limit, 100);
    assert.equal(r.skip, 0);
  }
});

test('filters: kind, source and type validated; search and location escaped', () => {
  const r = parseJobListQuery({ kind: 'Working student', source: 'arbeitnow', type: 'Remote', search: 'c++ (dev)', location: 'a.b', sort: 'popular' });
  assert.equal(r.filter.kind, 'Working student');
  assert.equal(r.filter.source, 'arbeitnow');
  assert.equal(r.filter.type, 'Remote');
  assert.equal(r.filter.location.$regex, 'a\\.b');
  assert.ok(r.filter.$or[0].title.test('Senior C++ (Dev)'));
  assert.deepEqual(r.sort, { likes: -1, createdAt: -1 });
  const bad = parseJobListQuery({ kind: 'nope', source: 'nope', type: { $ne: 'x' }, search: { a: 1 } });
  assert.deepEqual(bad.filter, {});
});
