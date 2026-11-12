// Pure parsers for two public internship lists. Input is untrusted: nothing is executed,
// and only http(s) apply URLs ever leave this module.
export type Listing = {
  source: 'simplify' | 'zapply';
  externalId: string;
  title: string;
  company: string;
  location: string;
  type: 'Remote' | 'On-site' | 'Hybrid';
  applyUrl: string;
  postedAt: Date;
  categoryName: string;
};

const TERM = 'Summer 2027';
const MAX_URL = 2000;

// Strips markdown links/bold and HTML, collapses whitespace.
const clean = (v: unknown, max: number) =>
  (typeof v === 'string' ? v : '')
    .replace(/<[^>]*>/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

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
  [/software/i, 'Software Engineering'],
];

const categoryFor = (title: string, sourceCategory = '') =>
  (TITLE_HINTS.find(([re]) => re.test(title)) || SOURCE_CATEGORIES.find(([re]) => re.test(sourceCategory)))?.[1] ||
  'Internships'; // neutral label: the lists also carry business and healthcare roles

const typeFor = (location: string): Listing['type'] =>
  /remote/i.test(location) ? 'Remote' : /hybrid/i.test(location) ? 'Hybrid' : 'On-site';

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
    out.push({
      source: 'simplify',
      externalId,
      title,
      company,
      location,
      type: typeFor(locations[0] || ''),
      applyUrl,
      postedAt: new Date(posted * 1000),
      categoryName: categoryFor(title, typeof i.category === 'string' ? i.category : ''),
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
    out.push({
      source: 'zapply',
      externalId: applyUrl.match(/\/l\/d\/([^?#]+)/)?.[1] || applyUrl,
      title: title.slice(0, 200),
      company: company.slice(0, 100),
      location: (location || 'Not specified').slice(0, 100),
      type: typeFor(location),
      applyUrl,
      postedAt: new Date(now.getTime() - Number(age[1]) * UNIT_MS[age[2]]),
      categoryName: categoryFor(title),
    });
  }
  return out;
}
