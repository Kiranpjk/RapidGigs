import React, { useState } from 'react';
import { Job } from '../../types';
import { MapPinIcon, BookmarkIcon, SearchIcon } from '../icons/Icons';
import { useJobs } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import { useJobFeed, useDebounced, countLabel } from '../../hooks/useJobFeed';
import JobDetailModal from '../common/JobDetailModal';
import JobSourceCredit from '../common/JobSourceCredit';
import KindFilter from '../common/KindFilter';
import ShowMore from '../common/ShowMore';

const BASE_URL = (import.meta.env.VITE_API_BASE as string)?.replace('/api', '') || 'http://localhost:3001';
const getMediaUrl = (url?: string) => { if (!url) return ''; if (url.startsWith('http')) return url; return url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`; };

interface JobsPageProps { onApplyNow: (job: Job) => void; }

const JobsPage: React.FC<JobsPageProps> = ({ onApplyNow }) => {
    const { user } = useAuth();
    const { saveJob, unsaveJob, isJobSaved, hasApplied } = useJobs();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [kind, setKind] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [selectedJobForDetail, setSelectedJobForDetail] = useState<Job | null>(null);
    const isRecruiter = user?.role === 'recruiter';

    const debouncedSearch = useDebounced(search, 300);
    const { jobs, total, loading: isLoading, loadingMore, error: loadError, moreError, loadMore, hasMore } = useJobFeed(
        { search: debouncedSearch, type: typeFilter, kind },
        reloadKey
    );

    return (
        <div className="max-w-screen-xl mx-auto px-5 sm:px-8 pt-10 pb-20 animate-fade-in">
            {/* Header */}
            <div className="mb-6">
                <h1 className="font-display text-title font-semibold text-[var(--text-primary)]">All jobs</h1>
                <p className="text-[14px] text-[var(--text-secondary)] mt-1 tabular-nums">
                    {isLoading ? 'Loading…' : loadError ? 'Could not load roles' : countLabel(total)}
                </p>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1 max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                    <input
                        type="text" placeholder="Search roles or companies…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 bg-[var(--bg)] border border-[var(--border-strong)] rounded-[var(--radius)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/15 focus:border-[var(--text-primary)] transition-[border-color,box-shadow] duration-150"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    {['Remote', 'On-site', 'Hybrid'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                            className={`px-3 py-2 rounded-md text-[12px] font-medium transition-colors duration-100 ${
                                typeFilter === t
                                    ? 'bg-[var(--text-primary)] text-[var(--bg)]'
                                    : 'text-[var(--text-tertiary)] border border-[var(--border)] hover:bg-[var(--surface-hover)]'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                    <KindFilter value={kind} onChange={setKind} />
                    <button
                        onClick={() => {}}
                        className="px-3 py-2 rounded-md text-[12px] font-medium text-[var(--text-tertiary)] border border-[var(--border)] hover:bg-[var(--surface-hover)] flex items-center gap-1"
                    >
                        <BookmarkIcon className="w-3 h-3" /> Saved
                    </button>
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Job List — table-style rows with inline video */}
            {!isLoading && jobs.length > 0 && (
                <div className="border border-[var(--border)] rounded-[14px] bg-[var(--bg)] shadow-[var(--shadow-sm)] overflow-hidden divide-y divide-[var(--border)]">
                    {jobs.map(job => {
                        const videoUrl = getMediaUrl(job.companyVideoUrl || job.shortVideoUrl);
                        const applied = hasApplied(job.id);
                        return (
                            <div
                                key={job.id}
                                className="flex items-center gap-4 p-4 hover:bg-[var(--surface)] transition-colors duration-150 cursor-pointer group"
                                onClick={() => setSelectedJobForDetail(job)}
                            >
                                {/* Thumbnail: real video, or a quiet company monogram (no black placeholder) */}
                                <div className="w-28 h-[72px] rounded-[8px] overflow-hidden shrink-0 relative bg-[var(--surface)]">
                                    {videoUrl ? (
                                        <>
                                            <video
                                                src={videoUrl}
                                                className="w-full h-full object-cover bg-black"
                                                muted playsInline preload="metadata"
                                                onMouseEnter={e => e.currentTarget.play().catch(() => {})}
                                                onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                            />
                                            <span className="pointer-events-none absolute left-1.5 bottom-1.5 grid place-items-center w-5 h-5 rounded-full bg-white text-black" aria-hidden="true">
                                                <svg width="7" height="8" viewBox="0 0 7 8" fill="currentColor"><path d="M0 0l7 4-7 4z" /></svg>
                                            </span>
                                        </>
                                    ) : (
                                        <div className="w-full h-full grid place-items-center font-display text-[22px] font-semibold text-[var(--text-tertiary)]" aria-hidden="true">
                                            {(job.company || 'R').trim().charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Info section with better spacing */}
                                <div className="flex-1 min-w-0 py-0.5">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <h3 className="font-display text-[16px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors duration-150">
                                            {job.title}
                                        </h3>
                                        {job.shortVideoUrl && (
                                            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" title="Video available" />
                                        )}
                                    </div>
                                    <p className="text-[13px] text-[var(--text-secondary)] flex items-center gap-1.5">
                                        <span className="truncate font-medium">{job.company}</span>
                                        <span className="text-[var(--border-strong)]" aria-hidden="true">·</span>
                                        <span className="truncate">{job.location}</span>
                                        {job.source && (
                                            <>
                                                <span className="text-[var(--border-strong)]" aria-hidden="true">·</span>
                                                <span className="shrink-0"><JobSourceCredit source={job.source} /></span>
                                            </>
                                        )}
                                    </p>
                                </div>

                                {/* Meta - Styled with borders for Linear look */}
                                <div className="hidden sm:flex items-center gap-2 shrink-0">
                                    <span className="text-[12px] font-medium text-[var(--text-secondary)] bg-[var(--surface)] px-2 py-0.5 rounded-full">
                                        {job.type}
                                    </span>
                                    {job.kind && (
                                        <span className="text-[12px] font-medium text-[var(--text-secondary)] bg-[var(--surface)] px-2 py-0.5 rounded-full">
                                            {job.kind}
                                        </span>
                                    )}
                                    <span 
                                        className="text-[13px] font-semibold tabular-nums text-[var(--text-primary)] truncate max-w-[160px]"
                                        title={job.pay}
                                    >
                                        {job.pay}
                                    </span>
                                </div>

                                <span className="w-16 text-right text-[12px] text-[var(--text-tertiary)] whitespace-nowrap shrink-0 hidden md:block">
                                    {job.postedAgo}
                                </span>

                                {/* Actions */}
                                {!isRecruiter && (
                                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => isJobSaved(job.id) ? unsaveJob(job.id) : saveJob(job)}
                                            aria-label={isJobSaved(job.id) ? "Remove from saved" : "Save job"}
                                            className={`p-1.5 rounded-md transition-colors duration-100 ${
                                                isJobSaved(job.id) ? 'text-[var(--accent)] bg-[var(--accent-subtle)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--surface)]'
                                            }`}
                                        >
                                            <BookmarkIcon className="w-4 h-4" />
                                        </button>
                                        {job.applyUrl ? (
                                        <a
                                            href={job.applyUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-100 bg-[var(--text-primary)] text-[var(--bg)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)]"
                                        >
                                            Apply on company site
                                        </a>
                                        ) : (
                                        <button
                                            onClick={() => { if (job.status !== 'Full' && !applied) onApplyNow(job); }}
                                            disabled={job.status === 'Full' || applied}
                                            className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-100 ${
                                                applied
                                                    ? 'bg-[var(--success-subtle)] text-[var(--success)]'
                                                    : job.status === 'Full'
                                                    ? 'bg-[var(--surface)] text-[var(--text-tertiary)] cursor-not-allowed'
                                                    : 'bg-[var(--text-primary)] text-[var(--bg)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)]'
                                            }`}
                                        >
                                            {applied ? 'Applied' : job.status === 'Full' ? 'Full' : 'Apply'}
                                        </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {!isLoading && jobs.length > 0 && <ShowMore hasMore={hasMore} loading={loadingMore} failed={moreError} onMore={loadMore} />}

            {!isLoading && jobs.length === 0 && (
                <div className="text-center py-20" role="status">
                    <p className="text-sm text-[var(--text-tertiary)]">
                        {loadError ? "Couldn't load jobs. The server may still be starting." : 'No jobs found. Try different filters.'}
                    </p>
                    {loadError && (
                        <button onClick={() => setReloadKey(k => k + 1)} className="mt-4 px-4 py-2 text-[13px] font-medium rounded-[var(--radius)] bg-[var(--text-primary)] text-[var(--bg)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] transition-colors focus-ring">
                            Try again
                        </button>
                    )}
                </div>
            )}

            <JobDetailModal job={selectedJobForDetail} isOpen={!!selectedJobForDetail} onClose={() => setSelectedJobForDetail(null)} onApply={onApplyNow} />
        </div>
    );
};

export default JobsPage;
