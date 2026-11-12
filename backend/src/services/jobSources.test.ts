import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSimplify, parseZapply, parseArbeitnow, parseRemotive, parseRemoteOk, parseJobicy, parseHimalayas, kindFor, formatPay, toSummary,
} from './jobSources';

const base = {
  source: 'Simplify', category: 'Software', company_name: 'Apple', id: 'abc-1', title: 'iOS Engineer Intern',
  active: true, is_visible: true, terms: ['Summer 2027'], date_posted: 1700000000,
  url: 'https://example.com/apply', locations: ['London, UK'],
};

test('simplify: normal item', () => {
  const [l] = parseSimplify([base]);
  assert.deepEqual({ ...l, postedAt: l.postedAt.getTime() }, {
    source: 'simplify', externalId: 'abc-1', title: 'iOS Engineer Intern', company: 'Apple', location: 'London, UK',
    type: 'On-site', applyUrl: 'https://example.com/apply', postedAt: 1700000000000, categoryName: 'Mobile Development', kind: 'Internship', pay: 'See listing',
    summary: "Summer 2027 internship at Apple in London, UK. Listed on the Simplify and Pitt CSC Summer 2027 internship list. Applications are handled on the company's own site.",
  });
});

test('simplify: drops inactive, hidden and wrong-term items', () => {
  const bad = [{ ...base, active: false }, { ...base, is_visible: false }, { ...base, terms: ['Fall 2026'] }];
  assert.equal(parseSimplify(bad).length, 0);
  assert.equal(parseSimplify('nope').length, 0);
});

test('simplify: drops non-http apply URLs', () => {
  assert.equal(parseSimplify([{ ...base, url: 'javascript:alert(1)' }]).length, 0);
  assert.equal(parseSimplify([{ ...base, url: 'data:text/html,hi' }]).length, 0);
});

test('simplify: multi-location and remote/hybrid', () => {
  assert.equal(parseSimplify([{ ...base, locations: ['NYC', 'SF', 'Austin'] }])[0].location, 'NYC +2 more');
  assert.equal(parseSimplify([{ ...base, locations: ['Remote in USA'] }])[0].type, 'Remote');
  assert.equal(parseSimplify([{ ...base, locations: ['Hybrid - Berlin'] }])[0].type, 'Hybrid');
});

const row = (cells: string[]) => `| ${cells.join(' | ')} |`;
const apply = (u: string) => `[<img src="images/apply.png" width="80" alt="Apply">](${u})`;
const url = 'https://zapply.jobs/l/d/workday-unisys-external-REQ575421?s=gh-internships-2027';
const now = new Date('2026-11-12T12:00:00Z');

test('zapply: normal row, header and separator ignored', () => {
  const md = ['| Company | Role | Location | Posted | Visa | **Apply** |', '|---|---|---|---|---|---|',
    row(['**Unisys**', 'Software Engineer Intern', 'Eagan, MN', '11m', '✅ Sponsor', apply(url)])].join('\n');
  const ls = parseZapply(md, now);
  assert.equal(ls.length, 1);
  assert.equal(ls[0].externalId, 'workday-unisys-external-REQ575421');
  assert.equal(ls[0].applyUrl, url);
  assert.equal(ls[0].company, 'Unisys');
  assert.equal(ls[0].categoryName, 'Software Engineering');
  assert.equal(ls[0].postedAt.getTime(), now.getTime() - 11 * 60e3);
});

test('zapply: relative ages', () => {
  const at = (age: string) => parseZapply(row(['**A**', 'T', 'L', age, '', apply(url)]), now)[0]?.postedAt.getTime();
  assert.equal(at('2h'), now.getTime() - 2 * 3600e3);
  assert.equal(at('3d'), now.getTime() - 3 * 86400e3);
  assert.equal(at('1w'), now.getTime() - 7 * 86400e3);
  assert.equal(at('Date unknown'), undefined);
});

test('zapply: drops javascript: URLs and strips markdown/HTML', () => {
  assert.equal(parseZapply(row(['**A**', 'T', 'L', '1d', '', apply('javascript:alert(1)')]), now).length, 0);
  const [l] = parseZapply(row(['**<b>Acme</b> **', '**Data Analyst** <i>Intern</i>', 'NYC', '1d', '', apply(url)]), now);
  assert.equal(l.company, 'Acme');
  assert.equal(l.title, 'Data Analyst Intern');
  assert.equal(l.categoryName, 'Data Science');
});

test('category: hardware from the source, neutral default when nothing matches', () => {
  const item = (title: string, category: string) => ({ active: true, is_visible: true, terms: ['Summer 2027'], id: title, title,
    company_name: 'Acme', url: 'https://example.com/a', locations: ['Austin, TX'], date_posted: 1700000000, category });
  const [hw, other] = parseSimplify([item('Digital Design Engineer Intern', 'Hardware'), item('Event Coordinator Intern', 'Other')]);
  assert.equal(hw.categoryName, 'Hardware Engineering');
  assert.equal(other.categoryName, 'Internships');
});

const html = '<h2>About</h2><p>We build <strong>things</strong> &amp; more.</p><script>alert(1)</script><ul><li>One</li><li>Two&nbsp;items</li></ul>';

test('arbeitnow: normal item, Werkstudent kind, remote flag', () => {
  const item = { slug: 'dev-berlin-1', company_name: 'Acme GmbH', title: 'Werkstudent Softwareentwicklung (m/w/d)', description: html, remote: true,
    url: 'https://www.arbeitnow.com/jobs/companies/acme/dev-berlin-1', tags: ['Software Development'], job_types: ['Student college'], location: 'Berlin', created_at: 1700000000 };
  const [l] = parseArbeitnow({ data: [item], links: {} });
  assert.equal(l.source, 'arbeitnow');
  assert.equal(l.externalId, 'dev-berlin-1');
  assert.equal(l.kind, 'Working student');
  assert.equal(l.type, 'Remote');
  assert.equal(l.pay, 'See listing');
  assert.equal(l.categoryName, 'Software Engineering');
  assert.equal(l.postedAt.getTime(), 1700000000000);
  assert.equal(parseArbeitnow({ data: [{ ...item, remote: false }] })[0].type, 'On-site');
  assert.equal(parseArbeitnow({ data: [{ ...item, url: 'javascript:alert(1)' }] }).length, 0);
});

test('remotive: normal item, ISO date without zone is UTC, free-text salary kept', () => {
  const [l] = parseRemotive({ jobs: [{ id: 42, url: 'https://remotive.com/remote-jobs/x-42', title: 'Support Agent', company_name: 'Foo', category: 'Customer Service',
    job_type: 'full_time', publication_date: '2023-11-14T22:13:20', candidate_required_location: 'Europe', salary: '$40k - $60k', description: html }] });
  assert.equal(l.externalId, '42');
  assert.equal(l.type, 'Remote');
  assert.equal(l.location, 'Europe');
  assert.equal(l.pay, '$40k - $60k');
  assert.equal(l.kind, 'Job');
  assert.equal(l.postedAt.toISOString(), '2023-11-14T22:13:20.000Z');
});

test('remoteok: legal notice element skipped, apply_url preferred, salary formatted', () => {
  const body = [{ last_updated: 1, legal: 'API Terms of Service: link back' },
    { id: '99', epoch: 1700000000, company: 'Bar', position: 'Backend Engineer', tags: ['dev'], description: html, location: '', url: 'https://remoteok.com/remote-jobs/99',
      apply_url: 'https://remoteok.com/l/99', salary_min: 90000, salary_max: 120000 }];
  const ls = parseRemoteOk(body);
  assert.equal(ls.length, 1);
  assert.equal(ls[0].applyUrl, 'https://remoteok.com/l/99');
  assert.equal(ls[0].pay, 'USD 90,000\u2013120,000 per year');
  assert.equal(ls[0].location, 'Worldwide');
  assert.equal(parseRemoteOk([{ ...body[1], apply_url: '', salary_min: 0, salary_max: 0 }])[0].pay, 'See listing');
  assert.equal(parseRemoteOk('nope').length, 0);
});

test('jobicy: normal item, salary and Jobicy listing as apply URL', () => {
  const [l] = parseJobicy({ jobs: [{ id: 7, url: 'https://jobicy.com/jobs/7-x', jobTitle: 'Marketing Intern', companyName: 'Baz', jobIndustry: ['Marketing & Sales'], jobType: ['Internship'],
    jobGeo: 'USA', jobExcerpt: 'Join us&hellip;', pubDate: '2023-11-14T22:13:20+00:00', salaryMin: 142000, salaryMax: 247000, salaryCurrency: 'USD', salaryPeriod: 'yearly' }] });
  assert.equal(l.kind, 'Internship');
  assert.equal(l.pay, 'USD 142,000\u2013247,000 per year');
  assert.equal(l.summary, 'Join us\u2026');
  assert.equal(l.categoryName, 'Digital Marketing');
  assert.equal(l.applyUrl, 'https://jobicy.com/jobs/7-x');
});

test('himalayas: normal item, unix date, restrictions as location, non-http dropped', () => {
  const item = { title: 'Data Engineer', excerpt: 'Short <b>pitch</b>', companyName: 'Qux', employmentType: 'Full Time', minSalary: 44000, maxSalary: 44000, salaryPeriod: 'annual',
    currency: 'EUR', locationRestrictions: ['Germany', 'Austria'], parentCategories: ['Developer'], pubDate: 1700000000, applicationLink: 'https://himalayas.app/companies/qux/jobs/data-engineer', guid: 'https://himalayas.app/companies/qux/jobs/data-engineer' };
  const [l] = parseHimalayas({ jobs: [item] });
  assert.equal(l.location, 'Germany, Austria');
  assert.equal(l.pay, 'EUR 44,000 per year');
  assert.equal(l.summary, 'Short pitch');
  assert.equal(l.categoryName, 'Data Science');
  assert.equal(parseHimalayas({ jobs: [{ ...item, applicationLink: 'ftp://x' }] }).length, 0);
  assert.equal(parseHimalayas({ jobs: [{ ...item, locationRestrictions: [] }] })[0].location, 'Worldwide');
});

test('kind detection', () => {
  assert.equal(kindFor('Werkstudent (m/w/d) Marketing'), 'Working student');
  assert.equal(kindFor('Studentische Hilfskraft'), 'Working student');
  assert.equal(kindFor('Analyst', ['Student college']), 'Working student');
  assert.equal(kindFor('Praktikum Vertrieb'), 'Internship');
  assert.equal(kindFor('Software Engineer Intern'), 'Internship');
  assert.equal(kindFor('Engineer', ['Internship (praktikumsvertrag)']), 'Internship');
  assert.equal(kindFor('Graduate Trainee'), 'Internship');
  assert.equal(kindFor('Working Student Intern'), 'Working student');
  assert.equal(kindFor('Internal Tools Engineer'), 'Job');
  assert.equal(kindFor('International Sales Manager', ['Full Time']), 'Job');
});

test('simplify and zapply stay Internship unless the title says working student', () => {
  assert.equal(parseSimplify([{ ...base, title: 'Working Student Developer' }])[0].kind, 'Working student');
  assert.equal(parseSimplify([{ ...base, title: 'Developer' }])[0].kind, 'Internship');
});

test('pay formatting', () => {
  assert.equal(formatPay(142000, 247000, 'usd', 'yearly'), 'USD 142,000\u2013247,000 per year');
  assert.equal(formatPay(50, 50, 'EUR', 'hourly'), 'EUR 50 per hour');
  assert.equal(formatPay(null, 80000, null, null), '80,000');
  assert.equal(formatPay(0, 0, 'USD', 'year'), 'See listing');
  assert.equal(formatPay(undefined, undefined), 'See listing');
});

test('summary: tags, scripts and entities removed, whitespace collapsed, capped at 500', () => {
  assert.equal(toSummary(html), 'About We build things & more. One Two items');
  assert.equal(toSummary('&lt;b&gt;bold&lt;/b&gt; &#39;q&#39; &#x41;'), "bold 'q' A");
  const long = toSummary('<p>' + 'word '.repeat(300) + '</p>');
  assert.ok(long.length <= 500);
  assert.ok(long.endsWith('\u2026'));
  assert.equal(toSummary(null), '');
});
