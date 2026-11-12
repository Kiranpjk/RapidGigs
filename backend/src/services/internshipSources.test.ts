import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSimplify, parseZapply } from './internshipSources';

const base = {
  source: 'Simplify', category: 'Software', company_name: 'Apple', id: 'abc-1', title: 'iOS Engineer Intern',
  active: true, is_visible: true, terms: ['Summer 2027'], date_posted: 1700000000,
  url: 'https://example.com/apply', locations: ['London, UK'],
};

test('simplify: normal item', () => {
  const [l] = parseSimplify([base]);
  assert.deepEqual({ ...l, postedAt: l.postedAt.getTime() }, {
    source: 'simplify', externalId: 'abc-1', title: 'iOS Engineer Intern', company: 'Apple', location: 'London, UK',
    type: 'On-site', applyUrl: 'https://example.com/apply', postedAt: 1700000000000, categoryName: 'Mobile Development',
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
  assert.equal(ls[0].categoryName, 'Web Development');
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
