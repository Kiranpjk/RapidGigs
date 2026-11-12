import { useCallback, useEffect, useRef, useState } from 'react';
import { Job } from '../types';
import { jobsAPI } from '../services/api';

export const PAGE_SIZE = 24;

export type FeedFilters = { search?: string; category?: string; type?: string; kind?: string; sort?: string };

export const mapJob = (j: any): Job => ({
  id: j.id || j._id, title: j.title, company: j.company, location: j.location,
  type: j.type || 'Remote', pay: j.pay, description: j.description,
  postedAgo: j.postedAgo || 'Recently', category: j.category,
  companyVideoUrl: j.companyVideoUrl, freelancerVideoUrl: j.freelancerVideoUrl,
  shortVideoUrl: j.shortVideoUrl, applyUrl: j.applyUrl, source: j.source, kind: j.kind,
  maxSlots: j.maxSlots, filledSlots: j.filledSlots,
  status: j.status, likes: j.likes || 0, comments: j.comments || 0, shares: j.shares || 0,
});

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// Server-driven job list: first page on every filter change, "Show more" appends the next page.
// Responses for an older filter set are ignored, so fast typing or clicking cannot show stale results.
export function useJobFeed(filters: FeedFilters, reloadKey = 0) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const page = useRef(1);
  const seq = useRef(0);
  const ctl = useRef<AbortController | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const key = JSON.stringify(filters);

  useEffect(() => {
    const mine = ++seq.current;
    ctl.current?.abort();
    const c = (ctl.current = new AbortController());
    setLoading(true); setError(false); setMoreError(false); setLoadingMore(false);
    jobsAPI.getPage({ ...filtersRef.current, page: 1, limit: PAGE_SIZE }, c.signal)
      .then(r => { if (seq.current !== mine) return; page.current = 1; setJobs(r.jobs.map(mapJob)); setTotal(r.total); })
      .catch(() => { if (seq.current !== mine) return; setJobs([]); setTotal(0); setError(true); })
      .finally(() => { if (seq.current === mine) setLoading(false); });
    return () => c.abort();
  }, [key, reloadKey]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore) return;
    const mine = seq.current;
    const next = page.current + 1;
    const c = (ctl.current = new AbortController());
    setLoadingMore(true); setMoreError(false);
    jobsAPI.getPage({ ...filtersRef.current, page: next, limit: PAGE_SIZE }, c.signal)
      .then(r => {
        if (seq.current !== mine) return;
        page.current = next;
        setTotal(r.total);
        // A refresh on the server can shift rows between pages, so drop anything already shown.
        setJobs(prev => { const seen = new Set(prev.map(j => j.id)); return [...prev, ...r.jobs.map(mapJob).filter(j => !seen.has(j.id))]; });
      })
      .catch(() => { if (seq.current === mine) setMoreError(true); })
      .finally(() => { if (seq.current === mine) setLoadingMore(false); });
  }, [loading, loadingMore]);

  return { jobs, total, loading, loadingMore, error, moreError, loadMore, hasMore: jobs.length < total };
}

export const countLabel = (total: number) => `${total.toLocaleString('en-US')} open ${total === 1 ? 'role' : 'roles'}`;
