import React, { useState, useEffect } from 'react';
import { Job } from '../../types';
import { MapPinIcon, BookmarkIcon, SearchIcon, BriefcaseIcon } from '../icons/Icons';
import { useJobs } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import { jobsAPI } from '../../services/api';
import JobDetailModal from '../common/JobDetailModal';

const BASE_URL = (import.meta.env.VITE_API_BASE as string)?.replace('/api', '') || 'http://localhost:3001';
const getMediaUrl = (url?: string) => { if (!url) return ''; if (url.startsWith('http')) return url; return url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`; };

interface JobsPageProps { onApplyNow: (job: Job) => void; }

const JobsPage: React.FC<JobsPageProps> = ({ onApplyNow }) => {
    const { user } = useAuth();
    const { saveJob, unsaveJob, isJobSaved, hasApplied } = useJobs();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [selectedJobForDetail, setSelectedJobForDetail] = useState<Job | null>(null);
    const isRecruiter = user?.role === 'recruiter';

    useEffect(() => {
        const filters: any = {};
        if (search) filters.search = search;
        if (typeFilter) filters.type = typeFilter;
        jobsAPI.getAll(filters)
            .then(data => {
                const arr = Array.isArray(data) ? data : [];
                setJobs(arr.map((j: any) => ({
                    id: j.id || j._id, title: j.title, company: j.company, location: j.location,
                    type: j.type || 'Remote', pay: j.pay, description: j.description,
                    postedAgo: j.postedAgo || 'Recently', category: j.category,
                    companyVideoUrl: j.companyVideoUrl, freelancerVideoUrl: j.freelancerVideoUrl,
                    shortVideoUrl: j.shortVideoUrl, maxSlots: j.maxSlots, filledSlots: j.filledSlots,
                    status: j.status, likes: j.likes || 0, comments: j.comments || 0,
                })));
            })
            .catch(() => setJobs([]))
            .finally(() => setIsLoading(false));
    }, []);

    const filtered = jobs.filter(job => {
        const matchSearch = !search || job.title.toLowerCase().includes(search.toLowerCase()) || job.company.toLowerCase().includes(search.toLowerCase());
        const matchType = !typeFilter || job.type === typeFilter;
        return matchSearch && matchType;
    });

    return (
        <div className="max-w-screen-xl mx-auto px-6 py-8 animate-fade-in">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">All Jobs</h1>
                <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">
                    {isLoading ? 'Loading…' : `${filtered.length} opportunities`}
                </p>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1 max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                    <input
                        type="text" placeholder="Search roles or companies…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all duration-100"
                    />
                </div>
                <div className="flex gap-1.5">
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
            {!isLoading && filtered.length > 0 && (
                <div className="border border-[var(--border)] rounded-lg overflow-hidden divide-y divide-[var(--border)]">
                    {filtered.map(job => {
                        const videoUrl = getMediaUrl(job.companyVideoUrl || job.shortVideoUrl);
                        const applied = hasApplied(job.id);
                        return (
                            <div
                                key={job.id}
                                className="flex items-center gap-4 p-4 hover:bg-[var(--surface-hover)] transition-colors duration-75 cursor-pointer group"
                                onClick={() => setSelectedJobForDetail(job)}
                            >
                                {/* Thumbnail/Video Section */}
                                <div className="w-28 h-18 rounded-lg bg-zinc-950 overflow-hidden shrink-0 relative shadow-sm border border-[var(--border)] group/thumb">
                                    {videoUrl ? (
                                        <>
                                            <video
                                                src={videoUrl}
                                                className="w-full h-full object-cover opacity-80 group-hover/thumb:opacity-100 transition-opacity duration-300"
                                                muted playsInline
                                                onMouseEnter={e => e.currentTarget.play().catch(() => {})}
                                                onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                            />
                                            {/* Play Overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/thumb:bg-transparent transition-colors duration-300">
                                                <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg group-hover/thumb:scale-110 transition-transform duration-300">
                                                    <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
                                                </div>
                                            </div>
                                            {/* 'Watch' Badge */}
                                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[8px] font-bold text-white tracking-widest uppercase border border-white/10">
                                                WATCH
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
                                            <BriefcaseIcon className="w-5 h-5 text-zinc-700 opacity-40 group-hover:scale-110 transition-transform duration-300" />
                                        </div>
                                    )}
                                </div>

                                {/* Info section with better spacing */}
                                <div className="flex-1 min-w-0 py-0.5">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <h3 className="text-[14px] font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors duration-200">
                                            {job.title}
                                        </h3>
                                        {job.shortVideoUrl && (
                                            <span className="shrink-0 w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" title="Video available" />
                                        )}
                                    </div>
                                    <p className="text-[12px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                                        <span className="truncate font-medium">{job.company}</span>
                                        <span className="opacity-40">·</span>
                                        <span className="truncate">{job.location}</span>
                                    </p>
                                </div>

                                {/* Meta - Styled with borders for Linear look */}
                                <div className="hidden sm:flex items-center gap-2 shrink-0">
                                    <span className="text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded-full transition-colors group-hover:border-[var(--accent)]/30">
                                        {job.type}
                                    </span>
                                    <span 
                                        className="text-[11px] font-semibold text-[var(--success)] bg-[var(--success-subtle)] border border-[var(--success)]/20 px-2 py-0.5 rounded-full truncate max-w-[140px]"
                                        title={job.pay}
                                    >
                                        {job.pay}
                                    </span>
                                </div>

                                <span className="text-[11px] text-[var(--text-tertiary)] whitespace-nowrap shrink-0 hidden md:block opacity-60">
                                    {job.postedAgo}
                                </span>

                                {/* Actions */}
                                {!isRecruiter && (
                                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => isJobSaved(job.id) ? unsaveJob(job.id) : saveJob(job)}
                                            className={`p-1.5 rounded-md transition-colors duration-100 ${
                                                isJobSaved(job.id) ? 'text-amber-500 bg-amber-50 dark:bg-amber-950' : 'text-[var(--text-tertiary)] hover:bg-[var(--surface)]'
                                            }`}
                                        >
                                            <BookmarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => { if (job.status !== 'Full' && !applied) onApplyNow(job); }}
                                            disabled={job.status === 'Full' || applied}
                                            className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-100 ${
                                                applied
                                                    ? 'bg-[var(--success-subtle)] text-[var(--success)]'
                                                    : job.status === 'Full'
                                                    ? 'bg-[var(--surface)] text-[var(--text-tertiary)] cursor-not-allowed'
                                                    : 'bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90'
                                            }`}
                                        >
                                            {applied ? '✓ Applied' : job.status === 'Full' ? 'Full' : 'Apply'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {!isLoading && filtered.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-sm text-[var(--text-tertiary)]">No jobs found. Try different filters.</p>
                </div>
            )}

            <JobDetailModal job={selectedJobForDetail} isOpen={!!selectedJobForDetail} onClose={() => setSelectedJobForDetail(null)} onApply={onApplyNow} />
        </div>
    );
};

export default JobsPage;
