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
                                {/* Video thumbnail */}
                                <div className="w-20 h-14 rounded-md bg-zinc-950 overflow-hidden shrink-0 relative">
                                    {videoUrl ? (
                                        <video
                                            src={videoUrl}
                                            className="w-full h-full object-cover"
                                            muted playsInline
                                            onMouseEnter={e => e.currentTarget.play().catch(() => {})}
                                            onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800">
                                            <BriefcaseIcon className="w-4 h-4 text-zinc-700 opacity-50" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[13px] font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors duration-100">{job.title}</h3>
                                    <p className="text-[11px] text-[var(--text-tertiary)] truncate">{job.company} · {job.location}</p>
                                </div>

                                {/* Meta */}
                                <div className="hidden sm:flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--surface)] px-1.5 py-0.5 rounded">{job.type}</span>
                                    <span 
                                        className="text-[10px] font-medium text-[var(--success)] bg-[var(--success-subtle)] px-1.5 py-0.5 rounded truncate max-w-[120px]"
                                        title={job.pay}
                                    >
                                        {job.pay}
                                    </span>
                                </div>

                                <span className="text-[10px] text-[var(--text-tertiary)] whitespace-nowrap shrink-0 hidden md:block">{job.postedAgo}</span>

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
