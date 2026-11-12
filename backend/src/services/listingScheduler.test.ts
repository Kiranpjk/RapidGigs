import test from 'node:test';
import assert from 'node:assert/strict';
import { autoImportEnabled } from './listingScheduler';

test('auto-import: on in production, on Render, or when asked; off in dev; explicit false wins', () => {
  assert.equal(autoImportEnabled({}), false);
  assert.equal(autoImportEnabled({ NODE_ENV: 'development' }), false);
  assert.equal(autoImportEnabled({ NODE_ENV: 'production' }), true);
  assert.equal(autoImportEnabled({ RENDER: 'true' }), true);
  assert.equal(autoImportEnabled({ LISTINGS_AUTO_IMPORT: 'true' }), true);
  assert.equal(autoImportEnabled({ RENDER: 'true', NODE_ENV: 'production', LISTINGS_AUTO_IMPORT: 'false' }), false);
});
