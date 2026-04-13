
import React, { useState, useEffect } from 'react';
import { Page, Job } from '../../types';
import {
    MapPinIcon,
    PlayCircleIcon,
    BuildingOffice2Icon,
    BriefcaseIcon,
    SearchIcon,
    VideoCameraIcon,
    ClockIcon,
} from '../icons/Icons';
import { CATEGORIES } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { jobsAPI } from '../../services/api';
import JobDetailModal from '../common/JobDetailModal';

// Generate a consistent HSL color from a company name
function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 50%, 50%)`;
}

// Get initials from company name
function getInitials(name: string): string {
    return name.split(/[^a-zA-Z]+/).filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('');
}

// Compact company logo — rounded square with initials
const JobLogo: React.FC<{ company: string }> = ({ company }) => {
    const color = stringToColor(company);
    return (
        <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm text-white flex-shrink-0 shadow-sm"
            style={{ backgroundColor: color }}
            title={company}
        >
            {getInitials(company)}
        </div>
    );
};

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
    const isRecruiter = user?.role === 'recruiter';

    // Debounce search input (300ms)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch jobs from API with filters
    useEffect(() => {
        setIsLoading(true);
        const filters: any = {};
        if (debouncedSearch) filters.search = debouncedSearch;
        if (selectedCategory !== 'All') filters.category = selectedCategory;
        if (sortBy === 'relevant') filters.sort = 'popular';

        jobsAPI.getAll(filters)
            .then(data => {
                const arr = Array.isArray(data) ? data : [];
                const mapped: Job[] = arr.map((j: any) => ({
                    id: j.id || j._id,
                    title: j.title,
                    company: j.company,
                    location: j.location,
                    type: j.type || 'Remote',
                    pay: j.pay,
                    description: j.description,
                    postedAgo: j.postedAgo || 'Recently',
                    category: j.category,
                    companyVideoUrl: j.companyVideoUrl,
                    freelancerVideoUrl: j.freelancerVideoUrl,
                    shortVideoUrl: j.shortVideoUrl,
                    maxSlots: j.maxSlots,
                    filledSlots: j.filledSlots,
                    status: j.status,
                    likes: j.likes || 0,
                    comments: j.comments || 0,
                    shares: j.shares || 0,
                }));
                setLiveJobs(mapped);
            })
            .catch(() => { })
            .finally(() => setIsLoading(false));
    }, [debouncedSearch, selectedCategory, sortBy]);

    // ─── Job Card ───────────────────────────────────────────────────────────────
    const JobCard: React.FC<{ job: Job; index: number }> = ({ job, index }) => (
        <div
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 p-5 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group"
            data-aos="fade-up"
            data-aos-delay={index * 40}
        >
            {/* Clickable area → opens job detail modal */}
            <div className="cursor-pointer" onClick={() => setSelectedJobForDetail(job)}>
            {/* Header: Logo + Title/Company + Time */}
            <div className="flex items-start gap-3 mb-3">
                <JobLogo company={job.company} />
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-[15px] leading-tight mb-0.5 truncate">
                        {job.title}
                    </h3>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
                        {job.company}
                    </p>
                </div>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap flex items-center gap-1 mt-0.5 flex-shrink-0">
                    <ClockIcon className="w-3 h-3" />
                    {job.postedAgo}
                </span>
            </div>

            {/* Description */}
            <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-4 flex-grow">
                {job.description}
            </p>

            {/* Info Tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="inline-flex items-center gap-1 text-[11px] bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg font-medium">
                    <MapPinIcon className="w-3 h-3" /> {job.location}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg font-medium">
                    {job.pay}
                </span>
                <span className="inline-flex items-center text-[11px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg font-medium">
                    {job.type}
                </span>
            </div>
            </div>{/* End clickable area */}

            {/* Video links */}
            {(job.companyVideoUrl || job.freelancerVideoUrl) && (
                <div className="flex gap-3 mb-4">
                    {job.companyVideoUrl && (
                        <a href={job.companyVideoUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                            <PlayCircleIcon className="w-3.5 h-3.5" /> Project Brief
                        </a>
                    )}
                    {job.freelancerVideoUrl && (
                        <a href={job.freelancerVideoUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                            <PlayCircleIcon className="w-3.5 h-3.5" /> Freelancer Guide
                        </a>
                    )}
                </div>
            )}

            {/* Slot progress bar */}
            {(job.maxSlots && job.maxSlots > 1) && (
                <div className="mb-4">
                    <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500 mb-1">
                        <span>{job.filledSlots || 0}/{job.maxSlots} filled</span>
                        <span className={job.status === 'Full' ? 'text-red-500 font-medium' : 'text-emerald-500 font-medium'}>
                            {job.status === 'Full' ? 'Full' : 'Open'}
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1">
                        <div
                            className={`h-1 rounded-full transition-all duration-500 ${job.status === 'Full' ? 'bg-red-400' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min(100, ((job.filledSlots || 0) / job.maxSlots) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Apply Button */}
            <button
                className={`w-full mt-auto py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${job.status === 'Full'
                        ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 active:scale-[0.98] shadow-sm hover:shadow-md'
                    }`}
                onClick={() => { if (job.status !== 'Full') onApplyNow(job); }}
                disabled={job.status === 'Full'}
            >
                {job.status === 'Full' ? 'Positions Filled' : 'Apply Now'}
            </button>
        </div>
    );

    // ─── Page Render ────────────────────────────────────────────────────────────
    return (
        <>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

            {/* ── Search Hero ──────────────────────────────────────────────────── */}
            <section className="text-center mb-10 animate-slide-up">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                    {isRecruiter ? 'Find skilled talent fast' : 'What gig are you looking for?'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-base mb-6 max-w-lg mx-auto">
                    {isRecruiter
                        ? 'Post jobs, review applicants, and hire in minutes.'
                        : 'Search thousands of opportunities from companies near you.'}
                </p>
                <div className="relative max-w-xl mx-auto">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        id="dashboard-search"
                        type="text"
                        placeholder="Search by role, skill, or company..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500 shadow-sm hover:shadow-md transition-all duration-200"
                    />
                </div>
            </section>

            {/* ── Contextual Nudge Card ─────────────────────────────────────────── */}
            {!isRecruiter && (
                <section className="mb-8">
                    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 sm:gap-5">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800/40 rounded-xl flex items-center justify-center flex-shrink-0">
                            <VideoCameraIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Stand out with a video intro</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Students with videos get 3× more responses from recruiters</p>
                        </div>
                        <button
                            onClick={() => navigate('upload_video')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors flex-shrink-0 cursor-pointer"
                        >
                            Record Now
                        </button>
                    </div>
                </section>
            )}

            {isRecruiter && (
                <section className="mb-8">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 sm:gap-5">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-800/40 rounded-xl flex items-center justify-center flex-shrink-0">
                            <BriefcaseIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Post a new job</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Reach thousands of talented college students looking for opportunities</p>
                        </div>
                        <button
                            onClick={() => navigate('post_job')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors flex-shrink-0 cursor-pointer whitespace-nowrap"
                        >
                            Post Job
                        </button>
                    </div>
                </section>
            )}

            {/* ── Category Pills ────────────────────────────────────────────────── */}
            <section className="mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setSelectedCategory('All')}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${selectedCategory === 'All'
                                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                            }`}
                    >
                        All
                    </button>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.name)}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${selectedCategory === cat.name
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </section>

            {/* ── Results Header + Sort ─────────────────────────────────────────── */}
            <section className="mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedCategory === 'All'
                                ? (isRecruiter ? 'Recent Opportunities' : 'Nearby Gigs')
                                : selectedCategory}
                        </h2>
                        {liveJobs.length > 0 && (
                            <span className="text-[11px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-medium">
                                {liveJobs.length} live
                            </span>
                        )}
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setSortBy('latest')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${sortBy === 'latest'
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                                }`}
                        >
                            Latest
                        </button>
                        <button
                            onClick={() => setSortBy('relevant')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${sortBy === 'relevant'
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                                }`}
                        >
                            Popular
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Loading State ─────────────────────────────────────────────────── */}
            {isLoading && (
                <div className="flex items-center justify-center py-24">
                    <div className="w-8 h-8 border-2 border-gray-200 dark:border-slate-700 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
                </div>
            )}

            {/* ── Jobs Grid ────────────────────────────────────────────────────── */}
            {!isLoading && (
                <section>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {liveJobs.map((job, idx) => (
                            <JobCard key={job.id ?? idx} job={job} index={idx} />
                        ))}
                    </div>
                    {liveJobs.length === 0 && (
                        <div className="text-center py-24">
                            <div className="text-4xl mb-3">🔍</div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No gigs found</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {debouncedSearch ? 'Try a different search term' : 'Try exploring other categories or check back later'}
                            </p>
                        </div>
                    )}
                </section>
            )}
        </div>

            {/* Job Detail Modal */}
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
