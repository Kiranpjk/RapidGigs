// Pure parsers for public job lists and APIs. Input is untrusted: nothing is executed,
// and only http(s) apply URLs ever leave this module.
export const SOURCE_NAMES = ['simplify', 'zapply', 'arbeitnow', 'remotive', 'remoteok', 'jobicy', 'himalayas'] as const;
export type SourceName = (typeof SOURCE_NAMES)[number];
export const KINDS = ['Internship', 'Working student', 'Job'] as const;
export type Kind = (typeof KINDS)[number];

export type Listing = {
  source: SourceName;
  externalId: string;
  title: string;
  company: string;
  location: string;
  type: 'Remote' | 'On-site' | 'Hybrid';
  applyUrl: string;
  postedAt: Date;
  categoryName: string;
  kind: Kind;
  pay: string;
  summary: string;
};

const TERM = 'Summer 2027';
const MAX_URL = 2000;
const NO_PAY = 'See listing';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '\u2026', ndash: '\u2013', mdash: '\u2014', rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c' };
const decode = (s: string) =>
  s.replace(/&(?:#(\d{1,6})|#x([0-9a-f]{1,6})|([a-z]+));/gi, (m, dec, hex, name) => {
    const code = dec ? Number(dec) : hex ? parseInt(hex, 16) : NaN;
    if (Number.isFinite(code)) return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
    return ENTITIES[String(name).toLowerCase()] ?? m;
  });

// Strips markdown links/bold and HTML, decodes entities, collapses whitespace.
const clean = (v: unknown, max: number) =>
  decode(
    (typeof v === 'string' ? v : '')
      .replace(/<[^>]*>/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\*\*|__/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

// Plain-text summary of an HTML snippet, at most 500 characters. Never stores the full description.
export const toSummary = (v: unknown): string => {
  const text = decode(
    (typeof v === 'string' ? v : '')
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/?(p|br|li|ul|ol|div|h[1-6]|tr|td|table)\b[^>]*>/gi, ' ')
      .replace(/<[^>]*>/g, '')
  )
    .replace(/<[^>]*>/g, '') // entity-escaped tags that decoded into real ones
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 500 ? text.slice(0, 499).trimEnd() + '\u2026' : text;
};

const safeUrl = (v: unknown) => {
  const url = typeof v === 'string' ? v.trim() : '';
  if (!url || url.length > MAX_URL) return '';
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? url : '';
  } catch {
    return '';
  }
};

// First match wins. Source categories are too broad, so the title is checked first.
const TITLE_HINTS: [RegExp, string][] = [
  [/machine learning|deep learning|\bml\b|\bai\b|artificial intelligence/i, 'Machine Learning'],
  [/data (scien|analy|engineer)|analytics|statistic|quant/i, 'Data Science'],
  [/product manage|program manage|project manage/i, 'Project Management'],
  [/\bux\b|\bui\b|designer|design intern/i, 'UI/UX Design'],
  [/android|\bios\b|mobile/i, 'Mobile Development'],
  [/marketing/i, 'Digital Marketing'],
  [/customer (support|success)/i, 'Customer Support'],
  [/hardware|electrical|mechanical|embedded|firmware|fpga|asic|circuit|manufactur/i, 'Hardware Engineering'],
  [/software|developer|full.?stack|front.?end|back.?end|devops|cloud|\bweb\b/i, 'Software Engineering'],
];
const SOURCE_CATEGORIES: [RegExp, string][] = [
  [/data|quant/i, 'Data Science'],
  [/product/i, 'Project Management'],
  [/hardware/i, 'Hardware Engineering'],
  [/software|devops|sysadmin|develop/i, 'Software Engineering'],
  [/market/i, 'Digital Marketing'],
  [/design/i, 'UI/UX Design'],
  [/customer|support/i, 'Customer Support'],
];

// The internship lists also carry business and healthcare roles, so the fallback is neutral.
const categoryFor = (title: string, kind: Kind, sourceCategory = '') =>
  (TITLE_HINTS.find(([re]) => re.test(title)) || SOURCE_CATEGORIES.find(([re]) => re.test(sourceCategory)))?.[1] ||
  (kind === 'Internship' ? 'Internships' : 'Other');

const typeFor = (location: string): Listing['type'] =>
  /remote/i.test(location) ? 'Remote' : /hybrid/i.test(location) ? 'Hybrid' : 'On-site';

// Working student first (an Arbeitnow "Student college" type counts), then internship, else a plain job.
export const kindFor = (title: string, ...types: unknown[]): Kind => {
  const text = [title, ...types.flat()].filter((t) => typeof t === 'string').join(' | ');
  if (/werkstudent|working[ -]?student|studentische|student college/i.test(text)) return 'Working student';
  if (/\bintern(ship)?s?\b|praktik|\btrainee|\bco-?op\b/i.test(text)) return 'Internship';
  return 'Job';
};

const PERIODS: Record<string, string> = { yearly: 'year', annual: 'year', year: 'year', monthly: 'month', month: 'month', weekly: 'week', week: 'week', daily: 'day', day: 'day', hourly: 'hour', hour: 'hour' };

// "USD 142,000-247,000 per year". Only from numbers the source gave; otherwise "See listing".
export const formatPay = (min: unknown, max: unknown, currency?: unknown, period?: unknown): string => {
  const lo = Number(min) > 0 ? Number(min) : 0;
  const hi = Number(max) > 0 ? Number(max) : 0;
  if (!lo && !hi) return NO_PAY;
  const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
  const range = lo && hi && lo !== hi ? `${fmt(Math.min(lo, hi))}\u2013${fmt(Math.max(lo, hi))}` : fmt(hi || lo);
  const cur = typeof currency === 'string' && /^[A-Za-z]{3}$/.test(currency.trim()) ? currency.trim().toUpperCase() + ' ' : '';
  const per = typeof period === 'string' && PERIODS[period.trim().toLowerCase()];
  return `${cur}${range}${per ? ` per ${per}` : ''}`;
};

// Posted dates: unix seconds or ISO strings (no zone means UTC). Future dates are clamped to now.
const when = (v: unknown): Date | null => {
  let ms = NaN;
  if (typeof v === 'number') ms = v * 1000;
  else if (typeof v === 'string' && v.trim()) {
    const t = v.trim();
    ms = /^\d{9,11}$/.test(t) ? Number(t) * 1000 : Date.parse(/(Z|[+-]\d\d:?\d\d)$/.test(t) ? t : t + 'Z');
  }
  return Number.isFinite(ms) && ms > 0 ? new Date(Math.min(ms, Date.now())) : null;
};

const CREDIT_TEXT = {
  simplify: 'the Simplify and Pitt CSC Summer 2027 internship list',
  zapply: 'the Zapply 2027 internships list',
} as const;
const sentence = (source: 'simplify' | 'zapply', kind: Kind, company: string, location: string) =>
  `${kind === 'Working student' ? 'Working student role' : 'Summer 2027 internship'} at ${company} in ${location}. Listed on ${CREDIT_TEXT[source]}. Applications are handled on the company's own site.`;

export function parseSimplify(items: unknown): Listing[] {
  if (!Array.isArray(items)) return [];
  const out: Listing[] = [];
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const i = it as Record<string, any>;
    if (i.active !== true || i.is_visible !== true || !Array.isArray(i.terms) || !i.terms.includes(TERM)) continue;
    const applyUrl = safeUrl(i.url);
    const title = clean(i.title, 200);
    const company = clean(i.company_name, 100);
    const externalId = typeof i.id === 'string' ? i.id.trim() : '';
    const locations: string[] = Array.isArray(i.locations) ? i.locations.map((l: unknown) => clean(l, 100)).filter(Boolean) : [];
    const posted = Number(i.date_posted);
    if (!applyUrl || !title || !company || !externalId || !Number.isFinite(posted) || posted <= 0) continue;
    const location = locations.length
      ? locations[0] + (locations.length > 1 ? ` +${locations.length - 1} more` : '')
      : 'Not specified';
    const kind: Kind = kindFor(title) === 'Working student' ? 'Working student' : 'Internship';
    out.push({
      source: 'simplify',
      externalId,
      title,
      company,
      location,
      type: typeFor(locations[0] || ''),
      applyUrl,
      postedAt: new Date(posted * 1000),
      categoryName: categoryFor(title, kind, typeof i.category === 'string' ? i.category : ''),
      kind,
      pay: NO_PAY,
      summary: sentence('simplify', kind, company, location),
    });
  }
  return out;
}

const UNIT_MS: Record<string, number> = { m: 60e3, h: 3600e3, d: 86400e3, w: 7 * 86400e3 };

export function parseZapply(markdown: string, now: Date = new Date()): Listing[] {
  const out: Listing[] = [];
  for (const line of String(markdown).split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1);
    if (cells.length < 6) continue;
    const [company, title, location, posted] = cells.map((c) => clean(c, 200));
    const urlMatch = cells[5].match(/\]\(([^)\s]+)\)/);
    const applyUrl = safeUrl(urlMatch?.[1]);
    // Header, separator and "Date unknown" rows fail here: the age must be like 11m, 2h, 3d, 1w.
    const age = posted.match(/^(\d+)([mhdw])$/);
    if (!applyUrl || !age || !company || !title) continue;
    const kind: Kind = kindFor(title) === 'Working student' ? 'Working student' : 'Internship';
    const loc = (location || 'Not specified').slice(0, 100);
    out.push({
      source: 'zapply',
      externalId: applyUrl.match(/\/l\/d\/([^?#]+)/)?.[1] || applyUrl,
      title: title.slice(0, 200),
      company: company.slice(0, 100),
      location: loc,
      type: typeFor(location),
      applyUrl,
      postedAt: new Date(now.getTime() - Number(age[1]) * UNIT_MS[age[2]]),
      categoryName: categoryFor(title, kind),
      kind,
      pay: NO_PAY,
      summary: sentence('zapply', kind, company.slice(0, 100), loc),
    });
  }
  return out;
}

// ---- Live APIs. Each parser takes one already-parsed response body (one page). ----

const list = (v: unknown, key: string): Record<string, any>[] => {
  const a = v && typeof v === 'object' ? (v as Record<string, any>)[key] : undefined;
  return Array.isArray(a) ? a.filter((x) => x && typeof x === 'object') : [];
};
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const id = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, 300) : '');

export function parseArbeitnow(body: unknown): Listing[] {
  const out: Listing[] = [];
  for (const i of list(body, 'data')) {
    const title = clean(i.title, 200);
    const company = clean(i.company_name, 100);
    const applyUrl = safeUrl(i.url);
    const externalId = id(i.slug);
    const postedAt = when(i.created_at);
    if (!title || !company || !applyUrl || !externalId || !postedAt) continue;
    const location = clean(i.location, 100) || 'Germany';
    const kind = kindFor(title, i.job_types);
    out.push({
      source: 'arbeitnow', externalId, title, company, location,
      type: i.remote === true ? 'Remote' : typeFor(location),
      applyUrl, postedAt, categoryName: categoryFor(title, kind, strs(i.tags).join(' ')),
      kind, pay: NO_PAY, summary: toSummary(i.description) || `${title} at ${company}.`,
    });
  }
  return out;
}

export function parseRemotive(body: unknown): Listing[] {
  const out: Listing[] = [];
  for (const i of list(body, 'jobs')) {
    const title = clean(i.title, 200);
    const company = clean(i.company_name, 100);
    const applyUrl = safeUrl(i.url);
    const externalId = id(i.id);
    const postedAt = when(i.publication_date);
    if (!title || !company || !applyUrl || !externalId || !postedAt) continue;
    const kind = kindFor(title, i.job_type);
    out.push({
      source: 'remotive', externalId, title, company,
      location: clean(i.candidate_required_location, 100) || 'Worldwide',
      type: 'Remote', applyUrl, postedAt, categoryName: categoryFor(title, kind, clean(i.category, 100)),
      kind, pay: clean(i.salary, 100) || NO_PAY, summary: toSummary(i.description) || `${title} at ${company}.`,
    });
  }
  return out;
}

// The first array element is a legal notice, not a job: it has no id or position and is skipped.
export function parseRemoteOk(body: unknown): Listing[] {
  if (!Array.isArray(body)) return [];
  const out: Listing[] = [];
  for (const i of body) {
    if (!i || typeof i !== 'object' || 'legal' in i) continue;
    const title = clean(i.position, 200);
    const company = clean(i.company, 100);
    const applyUrl = safeUrl(i.apply_url) || safeUrl(i.url);
    const externalId = id(i.id);
    const postedAt = when(i.epoch);
    if (!title || !company || !applyUrl || !externalId || !postedAt) continue;
    const tags = strs(i.tags);
    const kind = kindFor(title, tags);
    out.push({
      source: 'remoteok', externalId, title, company,
      location: clean(i.location, 100) || 'Worldwide',
      type: 'Remote', applyUrl, postedAt, categoryName: categoryFor(title, kind, tags.join(' ')),
      kind, pay: formatPay(i.salary_min, i.salary_max, 'USD', 'year'), // Remote OK salaries are annual USD
      summary: toSummary(i.description) || `${title} at ${company}.`,
    });
  }
  return out;
}

export function parseJobicy(body: unknown): Listing[] {
  const out: Listing[] = [];
  for (const i of list(body, 'jobs')) {
    const title = clean(i.jobTitle, 200);
    const company = clean(i.companyName, 100);
    const applyUrl = safeUrl(i.url); // Jobicy's terms: Apply must keep pointing at the Jobicy listing
    const externalId = id(i.id);
    const postedAt = when(i.pubDate);
    if (!title || !company || !applyUrl || !externalId || !postedAt) continue;
    const kind = kindFor(title, i.jobType);
    out.push({
      source: 'jobicy', externalId, title, company,
      location: clean(i.jobGeo, 100) || 'Worldwide',
      type: 'Remote', applyUrl, postedAt, categoryName: categoryFor(title, kind, strs(i.jobIndustry).join(' ')),
      kind, pay: formatPay(i.salaryMin, i.salaryMax, i.salaryCurrency, i.salaryPeriod),
      summary: toSummary(i.jobExcerpt) || `${title} at ${company}.`,
    });
  }
  return out;
}

export function parseHimalayas(body: unknown): Listing[] {
  const out: Listing[] = [];
  for (const i of list(body, 'jobs')) {
    const title = clean(i.title, 200);
    const company = clean(i.companyName, 100);
    const applyUrl = safeUrl(i.applicationLink);
    const externalId = id(i.guid) || applyUrl;
    const postedAt = when(i.pubDate);
    if (!title || !company || !applyUrl || !externalId || !postedAt) continue;
    const kind = kindFor(title, i.employmentType);
    const places = strs(i.locationRestrictions).map((l) => clean(l, 60)).filter(Boolean);
    out.push({
      source: 'himalayas', externalId, title, company,
      location: (places.length ? places.slice(0, 3).join(', ') + (places.length > 3 ? ` +${places.length - 3} more` : '') : 'Worldwide').slice(0, 100),
      type: 'Remote', applyUrl, postedAt,
      categoryName: categoryFor(title, kind, [...strs(i.parentCategories), ...strs(i.categories)].join(' ')),
      kind, pay: formatPay(i.minSalary, i.maxSalary, i.currency, i.salaryPeriod),
      summary: toSummary(i.excerpt || i.description) || `${title} at ${company}.`,
    });
  }
  return out;
}
