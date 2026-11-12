import React, { useState, useEffect } from 'react';
import { Page, Job } from '../../types';
import { MapPinIcon, SearchIcon, VideoCameraIcon, BriefcaseIcon, CheckCircleIcon } from '../icons/Icons';
import { CATEGORIES } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { useJobs } from '../../context/JobContext';
import { jobsAPI } from '../../services/api';
import JobDetailModal from '../common/JobDetailModal';
import JobSourceCredit from '../common/JobSourceCredit';

const BASE_URL = (import.meta.env.VITE_API_BASE as string)?.replace('/api', '') || 'http://localhost:3001';
const getMediaUrl = (url?: string) => { if (!url) return ''; if (url.startsWith('http')) return url; return url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`; };

interface DashboardPageProps {
    navigate: (page: Page) => void;
    onApplyNow: (job: Job) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ navigate, onApplyNow }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [liveJobs, setLiveJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [sortBy, setSortBy] = useState<'latest' | 'relevant'>('latest');
    const [selectedJobForDetail, setSelectedJobForDetail] = useState<Job | null>(null);

    const { user } = useAuth();
    const { hasApplied } = useJobs();
    const isRecruiter = user?.role === 'recruiter';

    useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchQuery), 300); return () => clearTimeout(t); }, [searchQuery]);

    useEffect(() => {
        setIsLoading(true);
        setLoadError(false);
        const filters: any = {};
        if (debouncedSearch) filters.search = debouncedSearch;
        if (selectedCategory !== 'All') filters.category = selectedCategory;
        if (sortBy === 'relevant') filters.sort = 'popular';

        jobsAPI.getAll(filters)
            .then(data => {
                const arr = Array.isArray(data) ? data : [];
                setLiveJobs(arr.map((j: any) => ({
                    id: j.id || j._id, title: j.title, company: j.company, location: j.location,
                    type: j.type || 'Remote', pay: j.pay, description: j.description,
                    postedAgo: j.postedAgo || 'Recently', category: j.category,
                    companyVideoUrl: j.companyVideoUrl, freelancerVideoUrl: j.freelancerVideoUrl,
                    shortVideoUrl: j.shortVideoUrl, applyUrl: j.applyUrl, source: j.source, maxSlots: j.maxSlots, filledSlots: j.filledSlots,
                    status: j.status, likes: j.likes || 0, comments: j.comments || 0, shares: j.shares || 0,
                })));
            })
            .catch(() => { setLiveJobs([]); setLoadError(true); })
            .finally(() => setIsLoading(false));
    }, [debouncedSearch, selectedCategory, sortBy, reloadKey]);

    // Plain render function (not a nested component) so cards don't remount — and videos don't reset — on every keystroke.
    const renderJobCard = (job: Job, i: number) => {
        const applied = hasApplied(job.id);
        const isFull = job.status === 'Full';
        const videoUrl = getMediaUrl(job.companyVideoUrl || job.shortVideoUrl);
        const monogram = (job.company || 'R').trim().charAt(0).toUpperCase();

        return (
            <article
                key={job.id ?? i}
                className="lift group flex flex-col rounded-[14px] border border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow-sm)] overflow-hidden"
            >
                {/* Media only when there is a real video: no grey placeholder standing in for one */}
                {videoUrl && (
                    <button
                        type="button"
                        aria-label={`Play video pitch for ${job.title}`}
                        className="relative aspect-[16/10] overflow-hidden bg-black text-left focus-ring"
                        onClick={() => setSelectedJobForDetail(job)}
                    >
                        <video
                            src={videoUrl}
                            className="w-full h-full object-cover"
                            muted loop playsInline preload="metadata"
                            onMouseEnter={e => e.currentTarget.play().catch(() => {})}
                            onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                        />
                        <span className="pointer-events-none absolute left-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-sm pl-1.5 pr-2.5 py-1 text-[12px] font-medium text-white">
                            <span className="grid place-items-center w-4 h-4 rounded-full bg-white text-black">
                                <svg width="7" height="8" viewBox="0 0 7 8" fill="currentColor" aria-hidden="true"><path d="M0 0l7 4-7 4z" /></svg>
                            </span>
                            Video pitch
                        </span>
                    </button>
                )}

                <div className="flex flex-1 flex-col px-5 pt-5 pb-5">
                    <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="grid place-items-center w-9 h-9 shrink-0 rounded-[8px] bg-[var(--surface)] font-display text-[15px] font-semibold text-[var(--text-secondary)]">
                            {monogram}
                        </span>
                        <div className="min-w-0 flex-1 leading-tight">
                            <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{job.company}</p>
                            <p className="text-[12px] text-[var(--text-tertiary)]">
                                {isFull ? <span className="text-[var(--danger)]">Positions filled</span> : job.postedAgo}
                                {job.source && <> <span aria-hidden="true">·</span> <JobSourceCredit source={job.source} /></>}
                            </p>
                        </div>
                    </div>

                    <h3 className="mt-4 font-display text-[19px] font-semibold leading-[1.2] tracking-[-0.015em] text-[var(--text-primary)] line-clamp-2">
                        <button type="button" onClick={() => setSelectedJobForDetail(job)} className="text-left hover:text-[var(--accent)] transition-colors duration-150 focus-ring">
                            {job.title}
                        </button>
                    </h3>

                    <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)]">
                        <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-[var(--text-tertiary)]" />
                        <span className="truncate">{job.location}</span>
                        {job.type && job.type.toLowerCase() !== (job.location || '').toLowerCase() && (
                            <>
                                <span className="text-[var(--border-strong)]" aria-hidden="true">/</span>
                                <span className="shrink-0">{job.type}</span>
                            </>
                        )}
                    </p>

                    {!videoUrl && job.description && (
                        <p className="mt-3 text-[14px] leading-[1.55] text-[var(--text-secondary)] line-clamp-3">{job.description}</p>
                    )}

                    <div className="mt-auto pt-5 flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-[14px] font-semibold tabular-nums text-[var(--text-primary)]" title={job.pay}>
                            {job.pay}
                        </span>
                        {!isRecruiter && job.applyUrl && (
                            <a
                                href={job.applyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 inline-flex items-center gap-1.5 rounded-[var(--radius)] px-3.5 py-2 text-[13px] font-medium transition-colors duration-150 focus-ring bg-[var(--text-primary)] text-[var(--bg)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)]"
                            >
                                Apply on company site
                            </a>
                        )}
                        {!isRecruiter && !job.applyUrl && (
                            <button
                                onClick={() => { if (!isFull && !applied) onApplyNow(job); }}
                                disabled={isFull || applied}
                                className={`shrink-0 inline-flex items-center gap-1.5 rounded-[var(--radius)] px-3.5 py-2 text-[13px] font-medium transition-colors duration-150 focus-ring ${
                                    applied
                                        ? 'bg-[var(--success-subtle)] text-[var(--success)]'
                                        : isFull
                                        ? 'bg-[var(--surface)] text-[var(--text-tertiary)] cursor-not-allowed'
                                        : 'bg-[var(--text-primary)] text-[var(--bg)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)]'
                                }`}
                            >
                                {applied ? (
                                    <><CheckCircleIcon className="w-4 h-4" /> Applied</>
                                ) : isFull ? 'Filled' : 'Apply'}
                            </button>
                        )}
                    </div>
                </div>
            </article>
        );
    };

    const chip = (active: boolean) =>
        `shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 focus-ring ${
            active
                ? 'bg-[var(--text-primary)] text-[var(--bg)]'
                : 'text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
        }`;

    return (
        <>
            <div className="max-w-screen-xl mx-auto px-5 sm:px-8 animate-fade-in">
                {/* Hero */}
                <section className={isRecruiter ? 'pt-10 pb-8' : 'pt-14 pb-10 sm:pt-20 sm:pb-14'}>
                    {isRecruiter ? (
                        <>
                            <h1 className="font-display text-title font-semibold text-[var(--text-primary)]">Browse open roles</h1>
                            <p className="mt-2 text-[15px] text-[var(--text-secondary)]">See what else is live on RapidGig right now.</p>
                        </>
                    ) : (
                        <>
                            <h1 className="max-w-[14ch] font-display text-display font-semibold text-[var(--text-primary)] text-balance">
                                See the team before you <span className="text-[var(--accent)]">apply.</span>
                            </h1>
                            <p className="mt-5 max-w-[52ch] text-[17px] leading-[1.6] text-[var(--text-secondary)]">
                                Every role comes with a short video from the people hiring. Watch, decide, and apply with your work instead of a cover letter.
                            </p>
                        </>
                    )}

                    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 ${isRecruiter ? 'mt-6' : 'mt-8'}`}>
                        <div className="relative w-full sm:max-w-md">
                            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-tertiary)]" />
                            <input
                                type="search"
                                placeholder="Search roles, skills or companies"
                                aria-label="Search gigs"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-11 pr-4 rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg)] text-[15px] text-[var(--text-primary)] shadow-[var(--shadow-sm)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)] focus:ring-4 focus:ring-[var(--accent)]/15 transition-[border-color,box-shadow] duration-150"
                            />
                        </div>
                        {!isRecruiter && (
                            <button
                                onClick={() => navigate('shorts')}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius)] px-5 text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors duration-150 focus-ring"
                            >
                                <VideoCameraIcon className="w-[18px] h-[18px]" />
                                Watch the feed
                            </button>
                        )}
                    </div>
                </section>

                {/* Category filters */}
                <div className="-mx-5 px-5 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-1 scrollbar-hide [mask-image:linear-gradient(to_right,#000_calc(100%-48px),transparent)] sm:pr-12" role="group" aria-label="Filter by category">
                    <button onClick={() => setSelectedCategory('All')} aria-pressed={selectedCategory === 'All'} className={chip(selectedCategory === 'All')}>
                        All
                    </button>
                    {CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} aria-pressed={selectedCategory === cat.name} className={chip(selectedCategory === cat.name)}>
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Results header */}
                <div className="mt-10 mb-5 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-3">
                    <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                        {selectedCategory === 'All' ? 'Open roles' : selectedCategory}
                        {!isLoading && liveJobs.length > 0 && (
                            <span className="ml-2 align-middle font-sans text-[13px] font-medium tabular-nums text-[var(--text-tertiary)]">{liveJobs.length}</span>
                        )}
                    </h2>
                    <div className="flex rounded-[var(--radius)] bg-[var(--surface)] p-0.5" role="group" aria-label="Sort">
                        {(['latest', 'relevant'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setSortBy(s)}
                                aria-pressed={sortBy === s}
                                className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 focus-ring ${
                                    sortBy === s ? 'bg-[var(--bg)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {s === 'latest' ? 'Latest' : 'Popular'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading: skeletons in the card's own shape, so the grid doesn't jump when data lands */}
                {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-6 pb-16" aria-busy="true" aria-label="Loading gigs">
                        {[0, 1, 2].map(k => (
                            <div key={k} className="rounded-[14px] border border-[var(--border)] overflow-hidden">
                                <div className="aspect-[16/10] bg-[var(--surface)] animate-pulse" />
                                <div className="p-5 space-y-3">
                                    <div className="h-3 w-1/3 rounded bg-[var(--surface)] animate-pulse" />
                                    <div className="h-5 w-3/4 rounded bg-[var(--surface)] animate-pulse" />
                                    <div className="h-3 w-1/2 rounded bg-[var(--surface)] animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Grid */}
                {!isLoading && (
                    <div className="pb-20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-start gap-x-5 gap-y-6">
                            {liveJobs.map((job, i) => renderJobCard(job, i))}
                        </div>
                        {liveJobs.length === 0 && (
                            <div className="rounded-[14px] border border-dashed border-[var(--border-strong)] px-6 py-16 text-center" role="status">
                                <BriefcaseIcon className="mx-auto w-6 h-6 text-[var(--text-tertiary)]" />
                                <p className="mt-3 font-display text-[18px] font-semibold text-[var(--text-primary)]">
                                    {loadError ? 'The server is waking up' : 'Nothing here yet'}
                                </p>
                                <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
                                    {loadError
                                        ? "Couldn't load gigs. The server may still be starting, so give it half a minute."
                                        : debouncedSearch
                                        ? `No gigs match "${debouncedSearch}".`
                                        : selectedCategory !== 'All'
                                        ? `No ${selectedCategory} gigs yet.`
                                        : 'No gigs posted yet.'}
                                </p>
                                {loadError ? (
                                    <button onClick={() => setReloadKey(k => k + 1)} className="mt-5 px-4 py-2 text-[13px] font-medium rounded-[var(--radius)] bg-[var(--text-primary)] text-[var(--bg)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] transition-colors focus-ring">
                                        Try again
                                    </button>
                                ) : (debouncedSearch || selectedCategory !== 'All') && (
                                    <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className="mt-5 px-4 py-2 text-[13px] font-medium rounded-[var(--radius)] border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus-ring">
                                        Show all gigs
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <JobDetailModal
                job={selectedJobForDetail}
                isOpen={!!selectedJobForDetail}
                onClose={() => setSelectedJobForDetail(null)}
                onApply={onApplyNow}
            />
        </>
    );
};

export default DashboardPage;
