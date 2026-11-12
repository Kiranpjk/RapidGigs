import crypto from 'crypto';
import { User } from '../models/User';
import { Job } from '../models/Job';
import { Category } from '../models/Category';
import { hashPassword } from '../utils/password';
import {
  Listing, SourceName, parseSimplify, parseZapply, parseArbeitnow, parseRemotive, parseRemoteOk,
  parseJobicy, parseHimalayas,
} from './jobSources';

export const SYSTEM_EMAIL = 'listings@rapidgig.local'; // every imported job is keyed to this one user
export const DEFAULT_CAP = 3000; // newest listings kept per source

const UA = 'RapidGig-listings/1.0 (+https://rapid-gigs.vercel.app)';
const BROWSER_UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0'; // Remote OK rejects bot-like agents
const PAGE_DELAY_MS = 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A fetch may stop early (a later page failed); `partial` then tells the importer not to delete anything for it.
export type Fetched = Listing[] & { partial?: boolean };
export type ListingSource = { name: SourceName; label: string; creditUrl: string; fetch(): Promise<Fetched> };

// null on any non-200, so callers stop paging. Network errors and timeouts also become null.
async function get(url: string, kind: 'json' | 'text', ua = UA): Promise<any | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000), headers: { 'User-Agent': ua, Accept: kind === 'json' ? 'application/json' : '*/*' } });
    return res.status === 200 ? await (kind === 'json' ? res.json() : res.text()) : null;
  } catch {
    return null;
  }
}

// Pages through a cursor/page API: first page must work (else throws), later failures end the run as partial.
async function paged(maxPages: number, urlFor: (page: number, prev: any) => string | null, parse: (body: any) => Listing[], ua?: string): Promise<Fetched> {
  const out: Fetched = [];
  let prev: any = null;
  for (let page = 1; page <= maxPages; page++) {
    const url = urlFor(page, prev);
    if (!url) break;
    if (page > 1) await sleep(PAGE_DELAY_MS);
    const body = await get(url, 'json', ua);
    if (!body) {
      if (page === 1) throw new Error('first page failed');
      out.partial = true;
      break;
    }
    const items = parse(body);
    out.push(...items);
    prev = body;
    if (!items.length) break;
  }
  return out;
}

export const SOURCES: ListingSource[] = [
  {
    name: 'simplify', label: 'Simplify', creditUrl: 'https://github.com/SimplifyJobs/Summer2027-Internships',
    fetch: async () => {
      const body = await get('https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json', 'json');
      if (!body) throw new Error('download failed');
      return parseSimplify(body); // the 13 MB payload is unreferenced once this returns
    },
  },
  {
    name: 'zapply', label: 'Zapply', creditUrl: 'https://github.com/zapplyjobs/Internships-2027',
    fetch: async () => {
      const text = await get('https://raw.githubusercontent.com/zapplyjobs/Internships-2027/main/README.md', 'text');
      if (!text) throw new Error('download failed');
      return parseZapply(text);
    },
  },
  {
    name: 'arbeitnow', label: 'Arbeitnow', creditUrl: 'https://www.arbeitnow.com',
    fetch: () => paged(5, (p) => `https://www.arbeitnow.com/api/job-board-api?page=${p}`, parseArbeitnow),
  },
  {
    name: 'remotive', label: 'Remotive', creditUrl: 'https://remotive.com',
    fetch: () => paged(1, () => 'https://remotive.com/api/remote-jobs', parseRemotive), // one request per run: they ask for few per day
  },
  {
    name: 'remoteok', label: 'Remote OK', creditUrl: 'https://remoteok.com',
    fetch: () => paged(1, () => 'https://remoteok.com/api', parseRemoteOk, BROWSER_UA),
  },
  {
    name: 'jobicy', label: 'Jobicy', creditUrl: 'https://jobicy.com',
    // Documented maximum is 100 per page; nextCursor is null on the last page.
    fetch: () => paged(3, (p, prev) => {
      if (p === 1) return 'https://jobicy.com/api/v2/remote-jobs?count=100';
      return prev?.nextCursor ? `https://jobicy.com/api/v2/remote-jobs?count=100&cursor=${encodeURIComponent(prev.nextCursor)}` : null;
    }, parseJobicy),
  },
  {
    name: 'himalayas', label: 'Himalayas', creditUrl: 'https://himalayas.app',
    fetch: () => paged(25, (p, prev) => {
      if (p === 1) return 'https://himalayas.app/jobs/api?limit=20';
      return prev?.nextCursor ? `https://himalayas.app/jobs/api?limit=20&cursor=${encodeURIComponent(prev.nextCursor)}` : null;
    }, parseHimalayas),
  },
];

export type SourceResult = { source: SourceName; kept: number; created: number; updated: number; removed: number; error?: string };
export type ImportOptions = { only?: SourceName; limit?: number; log?: (line: string) => void; sources?: ListingSource[] };

const BATCH = 500;

// Fetches each source in turn, upserts in bulk and removes that source's rows that left the feed.
// A source that fails or yields nothing is skipped and nothing is deleted for it. Needs an open mongoose connection.
export async function runListingImport(options: ImportOptions = {}): Promise<SourceResult[]> {
  const log = options.log || ((l: string) => console.log(l));
  const cap = options.limit && options.limit > 0 ? options.limit : DEFAULT_CAP;
  const sources = (options.sources || SOURCES).filter((s) => !options.only || s.name === options.only);

  // Random, unrecorded password: nobody can log in as this user. Set on insert only.
  const password = await hashPassword(crypto.randomBytes(32).toString('hex'));
  const user = await User.findOneAndUpdate(
    { email: SYSTEM_EMAIL },
    {
      $setOnInsert: { email: SYSTEM_EMAIL, password, permissions: [] },
      $set: { name: 'Job listings', role: 'recruiter', isRecruiter: true, isStudent: false, isActive: true },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  const results: SourceResult[] = [];
  for (const src of sources) {
    const t0 = Date.now();
    const r: SourceResult = { source: src.name, kept: 0, created: 0, updated: 0, removed: 0 };
    try {
      const fetched = await src.fetch();
      const byId = new Map<string, Listing>();
      for (const l of fetched) byId.set(l.externalId, l);
      const kept = [...byId.values()].sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime()).slice(0, cap);
      if (!kept.length) throw new Error('parsed 0 listings');

      const names = [...new Set(kept.map((l) => l.categoryName))];
      await Category.collection.bulkWrite(
        names.map((name) => ({ updateOne: { filter: { name }, update: { $setOnInsert: { name, createdAt: new Date(), updatedAt: new Date(), __v: 0 } }, upsert: true } }))
      );
      const cats = new Map((await Category.find({ name: { $in: names } }).select('name')).map((c) => [c.name, c._id]));

      const now = new Date();
      for (let i = 0; i < kept.length; i += BATCH) {
        // Driver-level write: mongoose treats createdAt as immutable, but we want the source's real posted date.
        const res = await Job.collection.bulkWrite(
          kept.slice(i, i + BATCH).map((l) => ({
            updateOne: {
              filter: { source: l.source, externalId: l.externalId },
              update: {
                $set: {
                  title: l.title, company: l.company, location: l.location, type: l.type, kind: l.kind, applyUrl: l.applyUrl,
                  description: l.summary, pay: l.pay, status: 'Open', maxSlots: 1,
                  categoryId: cats.get(l.categoryName), postedBy: user!._id, createdAt: l.postedAt, updatedAt: now,
                },
                $setOnInsert: { likes: 0, comments: 0, shares: 0, filledSlots: 0, videoGenStatus: 'Pending', videoGenProgress: 0, videoGenStage: '', __v: 0 },
              },
              upsert: true,
            },
          })),
          { ordered: false }
        );
        r.created += res.upsertedCount;
        r.updated += res.matchedCount;
      }
      r.kept = kept.length;
      // Only after the upserts, and never after a partial fetch: drop this source's rows that fell out of the kept set.
      if (!fetched.partial) {
        r.removed = (await Job.deleteMany({ source: src.name, postedBy: user!._id, externalId: { $nin: kept.map((l) => l.externalId) } })).deletedCount;
      }
      log(`${src.name}: ${kept.length} listings (${r.created} created, ${r.updated} updated, ${r.removed} stale removed${fetched.partial ? '; partial fetch, no cleanup' : ''}) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } catch (e: any) {
      // Not printing e.message: driver errors can echo the connection string.
      r.error = e?.name === 'Error' ? e.message : e?.name || 'error';
      log(`${src.name}: skipped, nothing changed (${r.error})`);
    }
    results.push(r);
  }
  return results;
}
