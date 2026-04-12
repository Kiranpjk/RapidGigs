
import React, { useState, useEffect } from 'react';
import { Page, Job, ShortVideo } from '../../types';
import {
    ArrowUpOnSquareIcon,
    MapPinIcon,
    PlayCircleIcon,
    BuildingOffice2Icon,
    CurrencyDollarIcon,
    BriefcaseIcon,
} from '../icons/Icons';
import { CATEGORIES } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { jobsAPI } from '../../services/api';
import Swal from 'sweetalert2';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

// Generate a consistent HSL color from a company name
function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 55%, 45%)`;
}

// Get initials from company name
function getInitials(name: string): string {
    return name.split(/[^a-zA-Z]+/).filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('');
}

// JobLogo component — outlined circle (transparent fill, colored border) + briefcase badge
const JobLogo: React.FC<{ company: string }> = ({ company }) => {
    const color = stringToColor(company);
    return (
        <div className="relative flex-shrink-0">
            <div 
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shadow-sm text-white transition-all duration-300 group-hover:scale-105" 
                style={{ backgroundColor: color }} 
                title={company}
            >
                {getInitials(company)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-900 transition-transform duration-300">
                <BriefcaseIcon className="w-3.5 h-3.5 text-white" />
            </div>
        </div>
    );
};

interface DashboardPageProps {
    navigate: (page: Page) => void;
    onApplyNow: (job: Job) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ navigate, onApplyNow }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [liveJobs, setLiveJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { user } = useAuth();

    const isRecruiter = user?.role === 'recruiter';

    useEffect(() => {
        jobsAPI.getAll()
            .then(data => {
                const arr = Array.isArray(data) ? data : [];
                // Map backend job shape to frontend Job type
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
            .catch(() => {})
            .finally(() => setIsLoading(false));

    }, []);

    // Use only live API jobs — no mock data fallback
    const allJobs = liveJobs;


    const CategoryButton: React.FC<{ children: React.ReactNode; isActive: boolean; onClick: () => void }> = ({ children, isActive, onClick }) => (
        <Button
            variant={isActive ? 'primary' : 'secondary'}
            size="sm"
            onClick={onClick}
            className={`rounded-full ${isActive ? 'font-medium' : ''}`}
        >
            {children}
        </Button>
    );

    // Determine jobs to display based on category
    const filteredJobs = selectedCategory === 'All' 
        ? allJobs 
        : allJobs.filter(job => job.category === selectedCategory);

    const JobCard: React.FC<{ job: Job; index: number }> = ({ job, index }) => (
        <Card 
            variant="elevated"
            className="h-full flex flex-col border-none ring-1 ring-slate-200 dark:ring-slate-800 group relative overflow-hidden transform-gpu"
            data-aos="fade-up"
            data-aos-delay={index * 50}
        >
            <div className="absolute top-0 right-0 py-1 px-3 bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg backdrop-blur-sm transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                {job.category}
            </div>
            <div className="flex items-start gap-4 mb-4 mt-2">
                <JobLogo company={job.company} />
                <div>
                    <h3 className="font-bold text-foreground text-lg">{job.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><BuildingOffice2Icon className="w-4 h-4"/> {job.company}</p>
                </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-full"><MapPinIcon className="w-4 h-4" /> {job.location}</span>
                <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-full text-destructive"><CurrencyDollarIcon className="w-4 h-4"/>{job.pay}</span>
            </div>
            <p className="text-sm text-muted-foreground flex-grow mb-6 line-clamp-3">{job.description}</p>
            
            {(job.companyVideoUrl || job.freelancerVideoUrl) && (
                <div className="pt-4 mt-auto mb-4 space-y-2">
                    {job.companyVideoUrl && (
                        <a href={job.companyVideoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                            <PlayCircleIcon className="w-5 h-5"/>
                            <span>Project Brief</span>
                        </a>
                    )}
                    {job.freelancerVideoUrl && (
                        <a href={job.freelancerVideoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                            <PlayCircleIcon className="w-5 h-5"/>
                            <span>Freelancer Guide</span>
                        </a>
                    )}
                </div>
            )}

            {(job.maxSlots && job.maxSlots > 1) && (
                <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <span>{job.filledSlots || 0}/{job.maxSlots} positions filled</span>
                        <span className={job.status === 'Full' ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}>{job.status === 'Full' ? 'Full' : 'Open'}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${job.status === 'Full' ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, ((job.filledSlots || 0) / job.maxSlots) * 100)}%` }} />
                    </div>
                </div>
            )}

            <button
                className={`w-full mt-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform group-hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-indigo-500/25 ${job.status === 'Full' ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                    if (job.status === 'Full') return;
                    onApplyNow(job);
                }}
                disabled={job.status === 'Full'}
            >
                {job.status === 'Full' ? 'Positions Filled' : 'Apply Now'}
            </button>
        </Card>
    );
    
    const VideoIntroCard: React.FC<{ video: ShortVideo }> = ({ video }) => (
        <div className="relative rounded-lg overflow-hidden group cursor-pointer shadow-lg" onClick={() => navigate('shorts')}>
            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <PlayCircleIcon className="w-16 h-16 text-white/80"/>
            </div>
            <div className="absolute bottom-0 left-0 p-4">
                <h3 className="font-bold text-white leading-tight">{video.title}</h3>
                <p className="text-sm text-slate-300">{video.author.name}</p>
            </div>
            <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md font-mono">{video.duration}</span>
        </div>
    );

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="relative rounded-2xl p-6 sm:p-12 text-center mb-12 overflow-hidden bg-gray-200 dark:bg-gray-900 border border-white/20 shadow-xl shadow-indigo-500/5 transition-all duration-500">
                <div className="absolute inset-0 bg-cover bg-center opacity-10 dark:opacity-20" style={{backgroundImage: 'url(https://picsum.photos/seed/bg/1200/400)'}}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-gray-100 dark:from-gray-900 via-gray-100/80 dark:via-gray-900/80 to-transparent"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-white mb-4 tracking-tighter">{isRecruiter ? 'Find Skilled Talent Fast' : 'Discover Rapid Gigs Near You'}</h1>
                    <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">{isRecruiter ? 'Post jobs, review applicants, and hire in minutes with a recruiter-first workflow.' : 'Connect with top talent or find your next microgig instantly. Your work, your code, your gig in 30 seconds.'}</p>
                    <button onClick={() => navigate(isRecruiter ? 'jobs' : 'upload_video')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2 mx-auto">
                        <ArrowUpOnSquareIcon className="w-5 h-5"/> {isRecruiter ? 'Manage Job Posts' : 'Upload Intro'}
                    </button>
                </div>
            </div>
            
            <section className="mb-12">
                <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-white">Category Explorer</h2>
                <div className="flex flex-wrap gap-3 mb-8">
                    <CategoryButton 
                        key="all" 
                        isActive={selectedCategory === 'All'}
                        onClick={() => setSelectedCategory('All')}
                    >
                        All
                    </CategoryButton>
                    {CATEGORIES.map(cat => (
                        <CategoryButton 
                            key={cat.id}
                            isActive={selectedCategory === cat.name}
                            onClick={() => setSelectedCategory(cat.name)}
                        >
                            {cat.name}
                        </CategoryButton>
                    ))}
                </div>
            </section>
            
            <section className="mb-12">
                <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-white">
                    {selectedCategory === 'All' ? (isRecruiter ? 'Recent Opportunities to Fill' : 'Nearby Gigs') : `${selectedCategory} Gigs`}
                    {filteredJobs.length > 0 && <span className="ml-3 text-sm font-normal bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full">{filteredJobs.length} live</span>}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredJobs.map((job, idx) => <JobCard key={job.id ?? idx} job={job} index={idx} />)}
                </div>
                {filteredJobs.length === 0 && !isLoading && (
                    <div className="text-center py-16 col-span-3">
                        <div className="text-5xl mb-4">💼</div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-white mb-2">No jobs in this category</h3>
                        <p className="text-slate-400 text-sm">Try exploring other categories or check back later!</p>
                    </div>
                )}
            </section>
            
        </div>
    );
};

export default DashboardPage;
