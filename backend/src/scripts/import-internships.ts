import crypto from 'crypto';
import mongoose from 'mongoose';
import { config } from '../config/env';
import { User } from '../models/User';
import { Job } from '../models/Job';
import { Category } from '../models/Category';
import { hashPassword } from '../utils/password';
import { Listing, parseSimplify, parseZapply } from '../services/internshipSources';

// Usage: npm run import:internships [-- --limit 40] [-- --remove]. Everything is keyed to this one user.
const SYSTEM_EMAIL = 'listings@rapidgig.local';

const SOURCES = {
  simplify: {
    url: 'https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json',
    parse: async (res: Response) => parseSimplify(await res.json()),
    credit: 'the Simplify and Pitt CSC Summer 2027 internship list',
  },
  zapply: {
    url: 'https://raw.githubusercontent.com/zapplyjobs/Internships-2027/main/README.md',
    parse: async (res: Response) => parseZapply(await res.text()),
    credit: 'the Zapply 2027 internships list',
  },
} as const;

const describe = (l: Listing) =>
  `Summer 2027 internship at ${l.company} in ${l.location}. Listed on ${SOURCES[l.source].credit}. Applications are handled on the company's own site.`;

async function main() {
  const args = process.argv.slice(2);
  const remove = args.includes('--remove');
  const limitArg = args.indexOf('--limit');
  const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : 40;
  if (!Number.isInteger(limit) || limit < 1) {
    console.error('--limit must be a positive whole number');
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

    // Random, unrecorded password: nobody can log in as this user. Set on insert only.
    const password = await hashPassword(crypto.randomBytes(32).toString('hex'));
    const user = await User.findOneAndUpdate(
      { email: SYSTEM_EMAIL },
      {
        $setOnInsert: { email: SYSTEM_EMAIL, password, permissions: [] },
        $set: { name: 'Internship listings', role: 'recruiter', isRecruiter: true, isStudent: false, isActive: true },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    for (const [source, src] of Object.entries(SOURCES) as [Listing['source'], (typeof SOURCES)[Listing['source']]][]) {
      let kept: Listing[];
      try {
        const res = await fetch(src.url, { signal: AbortSignal.timeout(60_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        kept = (await src.parse(res)).sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime()).slice(0, limit);
      } catch (e: any) {
        console.error(`${source}: download or parse failed (${e?.name || 'error'}); skipped, nothing changed`);
        failed = true;
        continue;
      }
      if (!kept.length) {
        console.error(`${source}: parsed 0 listings; skipped, nothing changed`);
        failed = true;
        continue;
      }

      let created = 0;
      let updated = 0;
      for (const l of kept) {
        const category = await Category.findOneAndUpdate(
          { name: l.categoryName },
          { $setOnInsert: { name: l.categoryName } },
          { upsert: true, new: true }
        );
        const res = await Job.updateOne(
          { source, externalId: l.externalId },
          {
            $set: {
              title: l.title, company: l.company, location: l.location, type: l.type, applyUrl: l.applyUrl,
              description: describe(l), pay: 'See listing', status: 'Open', maxSlots: 1,
              categoryId: category!._id, postedBy: user!._id,
            },
            $setOnInsert: { createdAt: l.postedAt },
          },
          { upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        if (res.upsertedCount) created++;
        else updated++;
      }
      // Only after a successful upsert: drop this source's imported jobs that fell out of the kept set.
      const stale = await Job.deleteMany({
        source,
        postedBy: user!._id,
        externalId: { $nin: kept.map((l) => l.externalId) },
      });
      console.log(`${source}: ${kept.length} listings (${created} created, ${updated} updated, ${stale.deletedCount} stale removed)`);
    }
  } finally {
    await mongoose.disconnect();
  }
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(`Import failed: ${e?.name || 'error'}`);
  process.exit(1);
});
