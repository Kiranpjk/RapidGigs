
import React, { useState, useEffect } from 'react';
import { Job } from '../../types';
import { 
    MapPinIcon,
    PlayCircleIcon,
    BookmarkIcon,
} from '../icons/Icons';
import { useJobs } from '../../context/JobContext';
import { jobsAPI } from '../../services/api';


interface JobsPageProps {
    onApplyNow: (job: Job) => void;
}

const JobsPage: React.FC<JobsPageProps> = ({ onApplyNow }) => {
    const { saveJob, unsaveJob, isJobSaved } = useJobs();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    useEffect(() => {
        jobsAPI.getAll()
            .then(data => {
                const arr = Array.isArray(data) ? data : [];
                const mapped: Job[] = arr.map((j: any) => ({
                    id: j.id || j._id,
                    title: j.title,
                    company: j.company,
                    logo: null,
                    location: j.location,
                    type: j.type || 'Remote',
                    pay: j.pay,
                    description: j.description,
                    postedAgo: j.postedAgo || 'Recently',
                    category: j.category,
                    companyVideoUrl: j.companyVideoUrl,
                    freelancerVideoUrl: j.freelancerVideoUrl,
                    likes: j.likes || 0,
                    comments: j.comments || 0,
                }));
                setJobs(mapped);
            })
            .catch(() => setJobs([]))
            .finally(() => setIsLoading(false));
    }, []);

    const filtered = jobs.filter(job => {
        const matchSearch = !search ||
            job.title.toLowerCase().includes(search.toLowerCase()) ||
            job.company.toLowerCase().includes(search.toLowerCase());
        const matchType = !typeFilter || job.type === typeFilter;
        return matchSearch && matchType;
    });

    const FilterSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <div className="py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-3">{title}</h3>
            <div className="space-y-2">{children}</div>
        </div>
    );

    const CheckboxItem: React.FC<{ label: string }> = ({ label }) => (
        <label className="flex items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer group">
            <input type="checkbox" className="h-4 w-4 bg-slate-200 dark:bg-slate-800 border-slate-400 dark:border-slate-600 rounded text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-800" />
            <span className="ml-3 text-sm group-hover:text-indigo-500 dark:group-hover:text-indigo-300 transition-colors">{label}</span>
        </label>
    );

    const JobCard: React.FC<{job: Job}> = ({job}) => (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-6 rounded-lg shadow-lg hover:shadow-indigo-500/10 hover:ring-2 hover:ring-indigo-500/50 transition-all duration-300 flex flex-col transform hover:-translate-y-1">
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{job.title}</h3>
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-2 gap-2">
                    <MapPinIcon className="w-4 h-4" />
                    <span>{job.location}</span>
                </div>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400 my-3">{job.pay}</p>
            </div>
            <div className="flex-grow"></div>
            <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-2 text-slate-400">
                    {job.companyVideoUrl && <PlayCircleIcon className="w-5 h-5"/>}
                    {job.freelancerVideoUrl && <PlayCircleIcon className="w-5 h-5 text-teal-400"/>}
                    <p className="text-xs text-slate-500 dark:text-slate-500">{job.postedAgo}</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => isJobSaved(job.id) ? unsaveJob(job.id) : saveJob(job)}
                        className={`${
                            isJobSaved(job.id) 
                                ? 'bg-yellow-500 hover:bg-yellow-600' 
                                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                        } text-slate-800 dark:text-white font-bold p-2 rounded-lg text-sm transition-colors duration-300`}
                        title={isJobSaved(job.id) ? 'Unsave job' : 'Save job'}
                    >
                        <BookmarkIcon className="w-5 h-5" />
                    </button>
                    <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-5 rounded-lg text-sm transition-colors duration-300" onClick={() => onApplyNow(job)}>Apply Now</button>
                </div>
            </div>
        </div>
    );
    
    return (
        <div className="flex gap-8 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <aside className="w-64 hidden lg:block flex-shrink-0">
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-6 rounded-lg sticky top-24">
                    <h2 className="text-xl font-bold mb-4">Filters</h2>
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search jobs..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <FilterSection title="Work Type">
                        {['Remote', 'On-site', 'Hybrid'].map(t => (
                            <label key={t} className="flex items-center text-slate-600 dark:text-slate-300 cursor-pointer gap-2">
                                <input type="radio" name="type" value={t} checked={typeFilter === t} onChange={() => setTypeFilter(typeFilter === t ? '' : t)} className="text-indigo-500"/>
                                <span className="text-sm">{t}</span>
                            </label>
                        ))}
                        {typeFilter && <button onClick={() => setTypeFilter('')} className="text-xs text-indigo-500 hover:underline mt-1">Clear</button>}
                    </FilterSection>
                    <button className="w-full mt-6 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2">
                        <BookmarkIcon className="w-4 h-4" /> Saved Jobs
                    </button>
                </div>
            </aside>
            <main className="w-full">
                <h1 className="text-3xl font-bold mb-2 tracking-tighter">Discover Your Next Microgig</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                    {isLoading ? 'Loading jobs...' : `Showing ${filtered.length} job${filtered.length !== 1 ? 's' : ''}`}
                </p>
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">💼</div>
                        <h2 className="text-xl font-bold text-slate-700 dark:text-white mb-2">No jobs found</h2>
                        <p className="text-slate-500">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filtered.map(job => <JobCard key={job.id} job={job}/>)}
                    </div>
                )}
            </main>
        </div>
    );
};

export default JobsPage;
