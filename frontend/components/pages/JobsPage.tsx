
import React from 'react';
import { Job } from '../../types';
import { 
    MapPinIcon,
    PlayCircleIcon,
    BookmarkIcon,
} from '../icons/Icons';
import { ALL_JOBS } from '../../data/mockData';
import { useJobs } from '../../context/JobContext';


interface JobsPageProps {
    onApplyNow: (job: Job) => void;
}

const JobsPage: React.FC<JobsPageProps> = ({ onApplyNow }) => {
    const { saveJob, unsaveJob, isJobSaved } = useJobs();
    
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
                    <FilterSection title="Category">
                        <CheckboxItem label="Web Development" />
                        <CheckboxItem label="Mobile Development" />
                        <CheckboxItem label="UI/UX Design" />
                        <CheckboxItem label="Data Science" />
                    </FilterSection>
                    <FilterSection title="Location">
                        <CheckboxItem label="Remote" />
                        <CheckboxItem label="On-site" />
                        <CheckboxItem label="Hybrid" />
                    </FilterSection>
                    <FilterSection title="Pay Rate">
                        <CheckboxItem label="$10 - $25/hr" />
                        <CheckboxItem label="$25 - $50/hr" />
                        <CheckboxItem label="$50+/hr" />
                    </FilterSection>
                    <FilterSection title="Work Type">
                        <CheckboxItem label="Full-time" />
                        <CheckboxItem label="Part-time" />
                        <CheckboxItem label="Contract" />
                    </FilterSection>
                     <button className="w-full mt-6 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2">
                        <BookmarkIcon className="w-4 h-4" /> Saved Jobs
                    </button>
                </div>
            </aside>
            <main className="w-full">
                <h1 className="text-3xl font-bold mb-2 tracking-tighter">Discover Your Next Microgig</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Showing 12 Available Microgigs</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {ALL_JOBS.map(job => <JobCard key={job.id} job={job}/>)}
                </div>
                 <div className="text-center mt-8">
                    <button className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300">Load More Jobs</button>
                </div>
            </main>
        </div>
    );
};

export default JobsPage;
