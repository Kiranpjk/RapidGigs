import mongoose from 'mongoose';
import { runListingImport } from './listingImport';

const DUE_MS = 12 * 3600e3; // refresh when the last successful run is older than this
const STALE_LOCK_MS = 30 * 60e3;
const FIRST_CHECK_MS = 60e3;
const CHECK_EVERY_MS = 3600e3;

export const autoImportEnabled = (env: NodeJS.ProcessEnv = process.env) =>
  env.LISTINGS_AUTO_IMPORT === 'false' ? false : env.LISTINGS_AUTO_IMPORT === 'true' || env.NODE_ENV === 'production';

// One tiny document keeps lastRunAt and the runningSince lock, so several instances or a restart loop
// cannot import concurrently or more often than DUE_MS. Returns true when this call ran an import.
export async function checkAndRunImport(now = new Date()): Promise<boolean> {
  const col = mongoose.connection.collection('listingimportstate');
  const due = new Date(now.getTime() - DUE_MS);
  const stale = new Date(now.getTime() - STALE_LOCK_MS);
  try {
    // Matches only when due and unlocked (or the lock is stale). Otherwise the upsert tries to insert
    // the same _id and fails with a duplicate-key error, which means "not now".
    await col.updateOne(
      {
        _id: 'listings' as any,
        $and: [
          { $or: [{ lastRunAt: { $exists: false } }, { lastRunAt: { $lt: due } }] },
          { $or: [{ runningSince: null }, { runningSince: { $lt: stale } }] },
        ],
      },
      { $set: { runningSince: now } },
      { upsert: true }
    );
  } catch (e: any) {
    if (e?.code === 11000) return false;
    throw e;
  }
  let ok = false;
  try {
    const results = await runListingImport();
    ok = results.some((r) => !r.error);
  } finally {
    await col.updateOne({ _id: 'listings' as any }, { $set: { runningSince: null, ...(ok ? { lastRunAt: new Date() } : {}) } });
  }
  return true;
}

// Call once after the database is connected and the server is listening. Never throws, never blocks startup.
export function startListingScheduler() {
  if (!autoImportEnabled()) {
    console.log('Listing auto-import is off (set LISTINGS_AUTO_IMPORT=true to enable outside production)');
    return;
  }
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      if (await checkAndRunImport()) console.log('Listing auto-import finished');
    } catch (e: any) {
      console.error(`Listing auto-import failed (${e?.name || 'error'})`);
    } finally {
      busy = false;
    }
  };
  setTimeout(() => {
    void tick();
    setInterval(tick, CHECK_EVERY_MS).unref();
  }, FIRST_CHECK_MS).unref();
  console.log('Listing auto-import enabled: first check in 60s, then hourly');
}
