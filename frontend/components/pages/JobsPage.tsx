
import React, { useState, useEffect } from 'react';
import { Job } from '../../types';
import {
    MapPinIcon,
    BookmarkIcon,
    BriefcaseSolidIcon,
    ClockIcon,
    SearchIcon,
} from '../icons/Icons';
import { useJobs } from '../../context/JobContext';
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

function getInitials(name: string): string {
    return name.split(/[^a-zA-Z]+/).filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('');
}

interface JobsPageProps {
    onApplyNow: (job: Job) => void;
}

const JobsPage: React.FC<JobsPageProps> = ({ onApplyNow }) => {
    const { user } = useAuth();
    const { saveJob, unsaveJob, isJobSaved } = useJobs();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [selectedJobForDetail, setSelectedJobForDetail] = useState<Job | null>(null);

    useEffect(() => {
        const filters: any = {};
        if (search) filters.search = search;
        if (typeFilter) filters.type = typeFilter;

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
                }));
                setJobs(mapped);
            })
            .catch(() => setJobs([]))
            .finally(() => setIsLoading(false));
    }, []);

    // Client-side filtering (search is also handled server-side but we keep local filter for instant feedback)
    const filtered = jobs.filter(job => {
        const matchSearch = !search ||
            job.title.toLowerCase().includes(search.toLowerCase()) ||
            job.company.toLowerCase().includes(search.toLowerCase());
        const matchType = !typeFilter || job.type === typeFilter;
        return matchSearch && matchType;
    });

    const typeFilters = ['Remote', 'On-site', 'Hybrid'];

    const JobCard: React.FC<{ job: Job }> = ({ job }) => (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 p-5 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group">
            {/* Clickable area → opens detail modal */}
            <div className="cursor-pointer flex-grow" onClick={() => setSelectedJobForDetail(job)}>
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                    <div
                        className="relative w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm overflow-hidden"
                        style={{ backgroundColor: stringToColor(job.company) }}
                    >
                        <BriefcaseSolidIcon className="w-5 h-5 opacity-90" />
                        <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-black bg-black/45 rounded-md px-1">
                            {getInitials(job.company)}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-[15px] leading-tight mb-0.5 truncate">
                            {job.title}
                        </h3>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">{job.company}</p>
                    </div>
                </div>

                {/* Location + Pay */}
                <div className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400 mb-2">
                    <MapPinIcon className="w-3.5 h-3.5" />
                    <span>{job.location}</span>
                </div>
                <p className="text-[15px] font-semibold text-emerald-600 dark:text-emerald-400 mb-3">{job.pay}</p>

                {/* Description preview */}
                <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-3">
                    {job.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="inline-flex items-center text-[11px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg font-medium">
                        {job.type}
                    </span>
                    {job.category && (
                        <span className="inline-flex items-center text-[11px] bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-lg">
                            {job.category}
                        </span>
                    )}
                </div>
            </div>

            {/* Slot Progress */}
            {(job.maxSlots && job.maxSlots > 1) && (
                <div className="mb-3">
                    <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500 mb-1">
                        <span>{job.filledSlots || 0}/{job.maxSlots} filled</span>
                        <span className={job.status === 'Full' ? 'text-red-500 font-medium' : 'text-emerald-500 font-medium'}>
                            {job.status === 'Full' ? 'Full' : 'Open'}
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1">
                        <div
                            className={`h-1 rounded-full transition-all ${job.status === 'Full' ? 'bg-red-400' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min(100, ((job.filledSlots || 0) / job.maxSlots) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Bottom: Time + Actions */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50 dark:border-slate-700/50">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" /> {job.postedAgo}
                </span>
                <div className="flex gap-2">
                    {!user?.isRecruiter && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); isJobSaved(job.id) ? unsaveJob(job.id) : saveJob(job); }}
                                className={`p-2 rounded-xl text-sm transition-all duration-200 cursor-pointer ${isJobSaved(job.id)
                                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500'
                                        : 'bg-gray-50 dark:bg-slate-700 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-600'
                                    }`}
                                title={isJobSaved(job.id) ? 'Unsave' : 'Save'}
                            >
                                <BookmarkIcon className="w-4 h-4" />
                            </button>
                            <button
                                className={`py-2 px-4 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${job.status === 'Full'
                                        ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-[0.98]'
                                    }`}
                                onClick={(e) => { e.stopPropagation(); if (job.status !== 'Full') onApplyNow(job); }}
                                disabled={job.status === 'Full'}
                            >
                                {job.status === 'Full' ? 'Full' : 'Apply Now'}
                            </button>
                        </>
                    )}
                    {user?.isRecruiter && (
                        <button
                            className="py-2 px-4 rounded-xl text-xs font-medium bg-gray-50 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-default"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Candidate View
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            {/* Page Header */}
            <section className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
                    All Jobs
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isLoading ? 'Loading...' : `${filtered.length} opportunities available`}
                </p>
            </section>

            {/* Search + Filters */}
            <section className="mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by role or company..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                        />
                    </div>
                    <div className="flex gap-1.5">
                        {typeFilters.map(t => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${typeFilter === t
                                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                                        : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                        <button
                            onClick={() => {/* TODO: show saved jobs */}}
                            className="px-4 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                            <BookmarkIcon className="w-3.5 h-3.5" /> Saved
                        </button>
                    </div>
                </div>
            </section>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center py-24">
                    <div className="w-8 h-8 border-2 border-gray-200 dark:border-slate-700 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
                </div>
            )}

            {/* Jobs Grid */}
            {!isLoading && filtered.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(job => <JobCard key={job.id} job={job} />)}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filtered.length === 0 && (
                <div className="text-center py-24">
                    <div className="text-4xl mb-3">💼</div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No jobs found</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filters.</p>
                </div>
            )}

            {/* Job Detail Modal */}
            <JobDetailModal
                job={selectedJobForDetail}
                isOpen={!!selectedJobForDetail}
                onClose={() => setSelectedJobForDetail(null)}
                onApply={onApplyNow}
            />
        </div>
    );
};

export default JobsPage;
