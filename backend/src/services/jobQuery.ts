import { KINDS, SOURCE_NAMES } from './jobSources';

const TYPES = ['Remote', 'On-site', 'Hybrid'];
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v: unknown) => (typeof v === 'string' ? v : '');

// Turns GET /api/jobs query parameters into a Mongo filter, sort and page window. Invalid values are ignored,
// never rejected. The category lookup needs the database, so the route adds categoryId itself.
export function parseJobListQuery(q: Record<string, unknown>) {
  const filter: Record<string, any> = {};
  const type = str(q.type);
  if (TYPES.includes(type)) filter.type = type;
  const kind = str(q.kind);
  if ((KINDS as readonly string[]).includes(kind)) filter.kind = kind;
  const source = str(q.source);
  if ((SOURCE_NAMES as readonly string[]).includes(source)) filter.source = source;
  if (str(q.location)) filter.location = { $regex: escapeRe(str(q.location)), $options: 'i' };
  if (str(q.search)) {
    const re = new RegExp(escapeRe(str(q.search)), 'i');
    filter.$or = [{ title: re }, { company: re }, { description: re }];
  }

  const num = (v: unknown) => (/^\d{1,9}$/.test(str(v)) ? Number(str(v)) : NaN);
  const page = num(q.page) >= 1 ? num(q.page) : 1;
  const limit = num(q.limit) >= 1 ? Math.min(num(q.limit), 100) : 100;
  const sort: Record<string, 1 | -1> = q.sort === 'popular' ? { likes: -1, createdAt: -1 } : { createdAt: -1 };
  return { filter, sort, limit, skip: (page - 1) * limit, page };
}
