
import React, { useState } from 'react';
import { Page, Job, ShortVideo } from '../../types';
import { 
    ArrowUpOnSquareIcon,
    MapPinIcon,
    PlayCircleIcon,
    BuildingOffice2Icon,
    CurrencyDollarIcon,
} from '../icons/Icons';
import { NEARBY_GIGS, CATEGORIES, SHORT_VIDEOS_INTRO } from '../../data/mockData';

interface DashboardPageProps {
    navigate: (page: Page) => void;
    onApplyNow: (job: Job) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ navigate, onApplyNow }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    
    const CategoryButton: React.FC<{ children: React.ReactNode; isActive: boolean; onClick: () => void }> = ({ children, isActive, onClick }) => (
        <button 
            onClick={onClick}
            className={`${
                isActive 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            } border hover:bg-indigo-500 hover:text-white hover:border-indigo-500 text-sm font-medium py-2 px-4 rounded-full transition-all duration-200`}
        >
            {children}
        </button>
    );

    const JobCard: React.FC<{ job: Job }> = ({ job }) => (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-6 flex flex-col shadow-lg hover:shadow-indigo-500/10 hover:ring-2 hover:ring-indigo-500/50 transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-100 dark:bg-gray-700 rounded-lg flex items-center justify-center font-bold text-indigo-500 dark:text-indigo-400 text-lg">{job.company.substring(0,2)}</div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">{job.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1"><BuildingOffice2Icon className="w-4 h-4"/> {job.company}</p>
                </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-full"><MapPinIcon className="w-4 h-4" /> {job.location}</span>
                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-full text-green-600 dark:text-green-400"><CurrencyDollarIcon className="w-4 h-4"/>{job.pay}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 flex-grow mb-6 line-clamp-3">{job.description}</p>
            
            {(job.companyVideoUrl || job.freelancerVideoUrl) && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-auto mb-4 space-y-2">
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

            <button className="w-full mt-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300" onClick={() => onApplyNow(job)}>Apply Now</button>
        </div>
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
            <div className="relative rounded-lg p-12 text-center mb-12 overflow-hidden bg-gray-200 dark:bg-gray-900">
                <div className="absolute inset-0 bg-cover bg-center opacity-10 dark:opacity-20" style={{backgroundImage: 'url(https://picsum.photos/seed/bg/1200/400)'}}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-gray-100 dark:from-gray-900 via-gray-100/80 dark:via-gray-900/80 to-transparent"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-white mb-4 tracking-tighter">Discover Rapid Gigs Near You</h1>
                    <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">Connect with top talent or find your next microgig instantly. Your work, your code, your gig in 30 seconds.</p>
                    <button onClick={() => navigate('upload_video')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2 mx-auto">
                        <ArrowUpOnSquareIcon className="w-5 h-5"/> Upload Intro
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
                    {selectedCategory === 'All' ? 'Nearby Gigs' : `${selectedCategory} Gigs`}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(selectedCategory === 'All' 
                        ? NEARBY_GIGS 
                        : NEARBY_GIGS.filter(job => job.category === selectedCategory)
                    ).map(job => <JobCard key={job.id} job={job} />)}
                </div>
                {selectedCategory !== 'All' && NEARBY_GIGS.filter(job => job.category === selectedCategory).length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-slate-500 dark:text-slate-400 text-lg">No gigs found in this category yet.</p>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Check back soon for new opportunities!</p>
                    </div>
                )}
            </section>
            
            <section>
                <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-white">Short Video Introductions</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {SHORT_VIDEOS_INTRO.map(video => <VideoIntroCard key={video.id} video={video} />)}
                </div>
            </section>
        </div>
    );
};

export default DashboardPage;
