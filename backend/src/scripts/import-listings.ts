import mongoose from 'mongoose';
import { config } from '../config/env';
import { User } from '../models/User';
import { Job } from '../models/Job';
import { SOURCE_NAMES, SourceName } from '../services/jobSources';
import { runListingImport, SYSTEM_EMAIL, DEFAULT_CAP } from '../services/listingImport';

// Usage: npm run import:listings [-- --limit N] [-- --source name] [-- --remove]
// --limit caps the newest listings kept per source (default 3000). The server runs the same import on a schedule.

async function main() {
  const args = process.argv.slice(2);
  const remove = args.includes('--remove');
  const limitArg = args.indexOf('--limit');
  const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : DEFAULT_CAP;
  if (!Number.isInteger(limit) || limit < 1) {
    console.error('--limit must be a positive whole number');
    process.exit(1);
  }
  const sourceArg = args.indexOf('--source');
  const only = sourceArg >= 0 ? args[sourceArg + 1] : undefined;
  if (only && !(SOURCE_NAMES as readonly string[]).includes(only)) {
    console.error(`--source must be one of: ${SOURCE_NAMES.join(', ')}`);
    process.exit(1);
  }

  try {
    await mongoose.connect(config.db.uri, { serverSelectionTimeoutMS: 5000 });
  } catch (e: any) {
    // Not printing e.message: driver errors can echo the connection string.
    console.error(`Could not connect to MongoDB (${e?.name || 'error'}). Check MONGO_URI.`);
    process.exit(1);
  }

  let failed = false;
  try {
    if (remove) {
      // Every delete is scoped to the system user's id and to imported jobs (source set).
      const user = await User.findOne({ email: SYSTEM_EMAIL }).select('_id');
      let removed = 0;
      if (user) {
        removed = (await Job.deleteMany({ postedBy: user._id, source: { $exists: true } })).deletedCount;
        await User.deleteOne({ _id: user._id });
      }
      console.log(`Removed ${removed} imported jobs and the listings user`);
      return;
    }

    const results = await runListingImport({ limit, only: only as SourceName | undefined });
    const total = results.reduce((n, r) => n + r.kept, 0);
    console.log(`Total: ${total} listings from ${results.filter((r) => !r.error).length}/${results.length} sources`);
    failed = results.some((r) => r.error);
  } finally {
    await mongoose.disconnect();
  }
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(`Import failed: ${e?.name || 'error'}`);
  process.exit(1);
});
