import React, { useState, useEffect } from 'react';
import { Page, Job } from '../../types';
import { MapPinIcon, SearchIcon, VideoCameraIcon, BriefcaseIcon, BriefcaseSolidIcon } from '../icons/Icons';
import { CATEGORIES } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { useJobs } from '../../context/JobContext';
import { jobsAPI } from '../../services/api';
import JobDetailModal from '../common/JobDetailModal';

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
    const [sortBy, setSortBy] = useState<'latest' | 'relevant'>('latest');
    const [selectedJobForDetail, setSelectedJobForDetail] = useState<Job | null>(null);

    const { user } = useAuth();
    const { hasApplied } = useJobs();
    const isRecruiter = user?.role === 'recruiter';

    useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchQuery), 300); return () => clearTimeout(t); }, [searchQuery]);

    useEffect(() => {
        setIsLoading(true);
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
                    shortVideoUrl: j.shortVideoUrl, maxSlots: j.maxSlots, filledSlots: j.filledSlots,
                    status: j.status, likes: j.likes || 0, comments: j.comments || 0, shares: j.shares || 0,
                })));
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, [debouncedSearch, selectedCategory, sortBy]);

    const JobCard: React.FC<{ job: Job }> = ({ job }) => {
        const applied = hasApplied(job.id);
        const videoUrl = getMediaUrl(job.companyVideoUrl || job.shortVideoUrl);

        return (
            <div className="border border-[var(--border)] rounded-lg overflow-hidden hover:border-[var(--border-strong)] transition-colors duration-100 group bg-[var(--bg)]">
                {/* Video Section — PRIMARY */}
                <div
                    className="aspect-video relative bg-zinc-950 cursor-pointer overflow-hidden"
                    onClick={() => setSelectedJobForDetail(job)}
                >
                    {videoUrl ? (
                        <>
                            <video
                                src={videoUrl}
                                className="w-full h-full object-cover"
                                muted loop playsInline
                                onMouseEnter={e => e.currentTarget.play().catch(() => {})}
                                onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-150 pointer-events-none">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800">
                            <BriefcaseIcon className="w-6 h-6 text-zinc-700 mb-2" />
                            <span className="text-zinc-500 text-[11px] font-bold tracking-widest uppercase">{job.company || 'RapidGig'}</span>
                        </div>
                    )}
                    {/* Status badge */}
                    {job.status === 'Full' && (
                        <span className="absolute top-2 left-2 text-[9px] font-medium bg-red-500/90 text-white px-1.5 py-0.5 rounded">Full</span>
                    )}
                </div>

                {/* Info Section */}
                <div className="p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 cursor-pointer" onClick={() => setSelectedJobForDetail(job)}>
                            <h3 className="text-[13px] font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors duration-100">
                                {job.title}
                            </h3>
                            <p className="text-[11px] text-[var(--text-tertiary)] truncate">{job.company} · {job.location}</p>
                        </div>
                        <span className="text-[10px] text-[var(--text-tertiary)] whitespace-nowrap shrink-0">{job.postedAgo}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-3 relative group/badge">
                        <span className="text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--surface)] px-1.5 py-0.5 rounded">{job.type}</span>
                        <span 
                            className="text-[10px] font-medium text-[var(--success)] bg-[var(--success-subtle)] px-1.5 py-0.5 rounded truncate max-w-[120px] cursor-help"
                        >
                            {job.pay && job.pay.length > 30 ? `${job.pay.substring(0, 30)}...` : job.pay}
                        </span>
                        {/* Custom Tooltip */}
                        {job.pay && job.pay.length > 30 && (
                            <div className="absolute bottom-full left-0 mb-2 invisible group-hover/badge:visible opacity-0 group-hover/badge:opacity-100 transition-all duration-200 z-50">
                                <div className="bg-zinc-900 border border-zinc-800 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-2xl max-w-[250px] whitespace-normal leading-relaxed">
                                    {job.pay}
                                    <div className="absolute top-full left-4 -mt-1.5 border-8 border-transparent border-t-zinc-900" />
                                </div>
                            </div>
                        )}
                    </div>

                    {!isRecruiter && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedJobForDetail(job)}
                                className="flex-1 py-2 text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--border)] rounded-md hover:bg-[var(--surface-hover)] transition-colors duration-100"
                            >
                                Details
                            </button>
                            <button
                                onClick={() => { if (job.status !== 'Full' && !applied) onApplyNow(job); }}
                                disabled={job.status === 'Full' || applied}
                                className={`flex-[1.5] py-2 text-[11px] font-medium rounded-md transition-all duration-100 ${
                                    applied
                                        ? 'bg-[var(--success-subtle)] text-[var(--success)] border border-[var(--success)]/20'
                                        : job.status === 'Full'
                                        ? 'bg-[var(--surface)] text-[var(--text-tertiary)] cursor-not-allowed'
                                        : 'bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90'
                                }`}
                            >
                                {applied ? '✓ Applied' : job.status === 'Full' ? 'Filled' : 'Apply Now'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="max-w-screen-xl mx-auto px-6 py-8 animate-fade-in">
                {/* Search */}
                <div className="mb-10 flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
                        {isRecruiter ? 'Browse talent' : 'Find your next gig'}
                    </h1>
                    <p className="text-[14px] text-[var(--text-tertiary)] mb-6 max-w-lg">
                        {isRecruiter ? 'Explore available opportunities' : 'Discover opportunities through short-form video pitches and direct applications.'}
                    </p>
                    <div className="relative w-full max-w-xl mx-auto group">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-tertiary)] group-focus-within:text-[var(--accent)] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search roles, skills, companies…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] shadow-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Category filters */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide mb-6">
                    <button
                        onClick={() => setSelectedCategory('All')}
                        className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors duration-100 ${
                            selectedCategory === 'All'
                                ? 'bg-[var(--text-primary)] text-[var(--bg)]'
                                : 'text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] border border-[var(--border)]'
                        }`}
                    >
                        All
                    </button>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.name)}
                            className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors duration-100 ${
                                selectedCategory === cat.name
                                    ? 'bg-[var(--text-primary)] text-[var(--bg)]'
                                    : 'text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] border border-[var(--border)]'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Results header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-medium text-[var(--text-primary)]">
                            {selectedCategory === 'All' ? 'All roles' : selectedCategory}
                        </h2>
                        {liveJobs.length > 0 && (
                            <span className="text-[10px] font-medium text-[var(--success)] bg-[var(--success-subtle)] px-1.5 py-0.5 rounded">{liveJobs.length} live</span>
                        )}
                    </div>
                    <div className="flex gap-0.5">
                        {(['latest', 'relevant'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setSortBy(s)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors duration-100 ${
                                    sortBy === s ? 'bg-[var(--surface)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {s === 'latest' ? 'Latest' : 'Popular'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Grid */}
                {!isLoading && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {liveJobs.map((job, i) => <JobCard key={job.id ?? i} job={job} />)}
                        </div>
                        {liveJobs.length === 0 && (
                            <div className="text-center py-20">
                                <p className="text-sm text-[var(--text-tertiary)]">
                                    {debouncedSearch ? 'No results — try a different search' : 'No jobs available right now'}
                                </p>
                            </div>
                        )}
                    </>
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
