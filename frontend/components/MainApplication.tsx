

import React, { useState, useEffect, useRef } from 'react';
import { Page, Job, ShortVideo, Category, MessageThread, Notification as NotificationType, ApplicationStatus } from '../types';
import { 
    LogoIcon, 
    SearchIcon, 
    BellIcon, 
    UserCircleIcon,
    ArrowUpOnSquareIcon,
    BriefcaseIcon,
    ChatBubbleLeftRightIcon,
    Cog6ToothIcon,
    DocumentChartBarIcon,
    HomeIcon,
    InboxIcon,
    MapPinIcon,
    PaperAirplaneIcon,
    PlayCircleIcon,
    PlusIcon,
    BookmarkIcon,
    VideoCameraIcon,
    BuildingOffice2Icon,
    CurrencyDollarIcon,
    EyeIcon,
    HeartIcon,
    Bars3Icon,
    XMarkIcon,
    EllipsisVerticalIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    ExclamationTriangleIcon,
    ChatBubbleLeftEllipsisIcon,
    BriefcaseIcon as BriefcaseOutlineIcon,
    SunIcon,
    MoonIcon,
    ShareIcon,
    NEARBY_GIGS, 
    ALL_JOBS,
    CATEGORIES,
    SHORT_VIDEOS_INTRO,
    ALL_SHORTS,
    MESSAGE_THREADS,
    NOTIFICATIONS,
    USERS,
    MY_APPLICATIONS,
} from '../constants';

interface MainApplicationProps {
    currentPage: Page;
    navigate: (page: Page) => void;
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

// Header Component
const Header: React.FC<{ navigate: (page: Page) => void; onLogout: () => void; currentPage: Page; theme: 'light' | 'dark'; toggleTheme: () => void; }> = ({ navigate, onLogout, currentPage, theme, toggleTheme }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    const navItems: { name: string; page: Page, icon: React.ReactNode }[] = [
        { name: 'Home', page: 'dashboard', icon: <HomeIcon className="w-5 h-5"/> },
        { name: 'Shorts', page: 'shorts', icon: <VideoCameraIcon className="w-5 h-5"/> },
        { name: 'Jobs', page: 'jobs', icon: <BriefcaseOutlineIcon className="w-5 h-5"/> },
        { name: 'Profile', page: 'profile', icon: <UserCircleIcon className="w-5 h-5"/> },
        { name: 'Messages', page: 'messages', icon: <ChatBubbleLeftRightIcon className="w-5 h-5"/> },
    ];

    const NavLink: React.FC<{item: typeof navItems[0]}> = ({ item }) => {
        const isActive = currentPage === item.page;
        return (
            <a onClick={() => { navigate(item.page); setIsMenuOpen(false); }} 
               className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 ${
                isActive 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'
               }`}
            >
               {item.icon} {item.name}
            </a>
        );
    };

    return (
        <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg sticky top-0 z-50 shadow-lg border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('dashboard')}>
                            <LogoIcon className="h-8 w-8 text-indigo-500" />
                            <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tighter">RapidGig</span>
                        </div>
                        <nav className="hidden md:flex items-center space-x-1">
                            {navItems.map(item => <NavLink key={item.name} item={item} />)}
                        </nav>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="relative hidden sm:block">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400" />
                            <input type="text" placeholder="Search..." className="bg-slate-100 dark:bg-gray-700/50 border border-slate-300 dark:border-gray-600 rounded-lg pl-10 pr-4 py-2 w-40 md:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300" />
                        </div>
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200">
                            {theme === 'dark' ? <SunIcon className="h-6 w-6 text-slate-300" /> : <MoonIcon className="h-6 w-6 text-slate-600" />}
                        </button>
                        <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200" onClick={() => navigate('notifications')}>
                           <BellIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                        </button>
                        <div className="relative">
                           <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="block">
                             <img src="https://picsum.photos/seed/johndoe/40/40" alt="John Doe" className="w-9 h-9 rounded-full ring-2 ring-slate-300 dark:ring-slate-600 hover:ring-indigo-500 transition-all"/>
                           </button>
                           {isProfileMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 rounded-md shadow-lg py-1 z-50 ring-1 ring-black/5">
                              <a onClick={() => {navigate('profile'); setIsProfileMenuOpen(false);}} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">Your Profile</a>
                              <a onClick={() => {alert("Settings page"); setIsProfileMenuOpen(false);}} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">Settings</a>
                              <div className="border-t border-slate-200 dark:border-slate-600 my-1"></div>
                              <a onClick={() => {onLogout(); setIsProfileMenuOpen(false);}} className="block px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">Sign out</a>
                           </div>
                           )}
                        </div>
                         <div className="md:hidden">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                                {isMenuOpen ? <XMarkIcon className="w-6 h-6"/> : <Bars3Icon className="w-6 h-6"/>}
                            </button>
                        </div>
                    </div>
                </div>
                {isMenuOpen && (
                    <div className="md:hidden pb-4 space-y-1">
                        {navItems.map(item => <NavLink key={item.name} item={item} />)}
                    </div>
                )}
            </div>
        </header>
    );
};

// Dashboard Page Component
const DashboardPage: React.FC<{ navigate: (page: Page) => void; onApplyNow: (job: Job) => void; }> = ({ navigate, onApplyNow }) => {
    const CategoryButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <button className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-300 text-sm font-medium py-2 px-4 rounded-full transition-all duration-200">{children}</button>
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
                <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-white">Nearby Gigs</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {NEARBY_GIGS.map(job => <JobCard key={job.id} job={job} />)}
                </div>
            </section>
            
            <section className="mb-12">
                <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-white">Category Explorer</h2>
                <div className="flex flex-wrap gap-3">
                    {CATEGORIES.map(cat => <CategoryButton key={cat.id}>{cat.name}</CategoryButton>)}
                </div>
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

// Jobs Page Component
const JobsPage: React.FC<{ onApplyNow: (job: Job) => void; }> = ({ onApplyNow }) => {
    
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
                    {/* FIX: Removed invalid 'title' prop from PlayCircleIcon component. */}
                    {job.companyVideoUrl && <PlayCircleIcon className="w-5 h-5"/>}
                    {/* FIX: Removed invalid 'title' prop from PlayCircleIcon component. */}
                    {job.freelancerVideoUrl && <PlayCircleIcon className="w-5 h-5 text-teal-400"/>}
                    <p className="text-xs text-slate-500 dark:text-slate-500">{job.postedAgo}</p>
                </div>
                <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-5 rounded-lg text-sm transition-colors duration-300" onClick={() => onApplyNow(job)}>Apply Now</button>
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

// Shorts Page Component - NEW IMPLEMENTATION
const ShortsPage: React.FC<{ onApplyNow: (job: Job) => void; }> = ({ onApplyNow }) => {
    const jobsWithShorts = ALL_JOBS.filter(job => job.shortVideoUrl && job.shortVideoUrl !== '');
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const videoElement = entry.target as HTMLVideoElement;
                    if (entry.isIntersecting) {
                        videoElement.play().catch(error => console.log("Autoplay was prevented:", error));
                    } else {
                        videoElement.pause();
                        videoElement.currentTime = 0;
                    }
                });
            },
            { threshold: 0.5 } // Play when 50% of the video is visible
        );

        const currentVideoRefs = videoRefs.current;
        currentVideoRefs.forEach(video => {
            if (video) observer.observe(video);
        });

        return () => {
            currentVideoRefs.forEach(video => {
                if (video) observer.unobserve(video);
            });
        };
    }, [jobsWithShorts.length]);

    return (
        <div className="relative h-[calc(100vh-64px)] w-full overflow-y-auto snap-y snap-mandatory scroll-smooth bg-black">
            {jobsWithShorts.map((job, index) => (
                <div key={job.id} className="h-full w-full flex-shrink-0 snap-start relative flex items-center justify-center">
                    <video
                        // FIX: The ref callback must not return a value. Encapsulating the assignment in braces ensures an implicit `undefined` return.
                        ref={el => { videoRefs.current[index] = el; }}
                        src={job.shortVideoUrl}
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    
                    {/* Video Overlay UI */}
                    <div className="absolute bottom-0 left-0 p-4 md:p-6 text-white w-full flex justify-between items-end drop-shadow-lg">
                        {/* Left side: Job Info */}
                        <div className="w-4/5 pr-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-slate-100/20 backdrop-blur-sm rounded-lg flex items-center justify-center font-bold text-white text-lg">{job.company.substring(0,2)}</div>
                                <p className="font-bold text-lg">{job.company}</p>
                            </div>
                            <h2 className="text-xl font-bold">{job.title}</h2>
                            <p className="text-sm mt-1 line-clamp-2">{job.description}</p>
                            <p className="font-semibold text-green-400 mt-2">{job.pay}</p>
                        </div>

                        {/* Right side: Action Buttons */}
                        <div className="flex flex-col items-center space-y-4">
                            <button className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-transform hover:scale-110">
                                  <HeartIcon className="w-7 h-7"/>
                                </div>
                                <span className="text-xs font-semibold mt-1">{job.likes?.toLocaleString() || 'Like'}</span>
                            </button>
                            <button className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-transform hover:scale-110">
                                  <ChatBubbleLeftEllipsisIcon className="w-7 h-7"/>
                                </div>
                                <span className="text-xs font-semibold mt-1">{job.comments?.toLocaleString() || 'Comment'}</span>
                            </button>
                            <button className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-transform hover:scale-110">
                                  <ShareIcon className="w-7 h-7"/>
                                </div>
                                <span className="text-xs font-semibold mt-1">{job.shares?.toLocaleString() || 'Share'}</span>
                            </button>
                            <button className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 rounded-full transition-transform transform hover:scale-110 shadow-lg" onClick={() => onApplyNow(job)}>
                                <PaperAirplaneIcon className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


// Profile Page Component
const ProfilePage: React.FC<{}> = () => {
    const StatCard: React.FC<{value: string, label: string, icon: React.ReactNode}> = ({value, label, icon}) => (
        <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-lg text-center border border-slate-200 dark:border-slate-600/50">
            <div className="w-8 h-8 mx-auto text-indigo-500 dark:text-indigo-400 mb-2">{icon}</div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
    );
    
    const SkillTag: React.FC<{ children: React.ReactNode}> = ({children}) => (
        <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium px-3 py-1.5 rounded-full">{children}</span>
    );
    
    const ProfileSection: React.FC<{title: string, children: React.ReactNode, noPadding?: boolean}> = ({title, children, noPadding}) => (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold p-8 pb-0">{title}</h2>
            <div className={noPadding ? "" : "p-8"}>
                {children}
            </div>
        </div>
    );

    const StatusBadge: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
        const baseClasses = "text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full inline-block";
        const statusClasses: { [key in ApplicationStatus]: string } = {
            Applied: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
            Interviewing: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
            'Offer Received': "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
            Rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        };
        return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <aside className="w-full md:w-64 flex-shrink-0">
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-4 rounded-lg sticky top-24">
                    <h2 className="text-lg font-bold p-2">Profile Sections</h2>
                    <nav className="space-y-1">
                        <a href="#" className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold rounded-md px-3 py-2"><HomeIcon className="w-5 h-5"/>Overview</a>
                        <a href="#" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white rounded-md px-3 py-2"><VideoCameraIcon className="w-5 h-5"/>My Videos</a>
                        <a href="#" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white rounded-md px-3 py-2"><BookmarkIcon className="w-5 h-5"/>Saved Jobs</a>
                        <a href="#my-applications" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white rounded-md px-3 py-2"><DocumentChartBarIcon className="w-5 h-5"/>My Applications</a>
                    </nav>
                </div>
                <button className="w-full mt-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                    <Cog6ToothIcon className="w-5 h-5"/> Settings
                </button>
            </aside>
            <main className="w-full space-y-8">
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg shadow-lg overflow-hidden">
                    <div className="h-48 bg-cover bg-center" style={{backgroundImage: 'url(https://picsum.photos/seed/banner/1000/200)'}}></div>
                    <div className="p-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-24 sm:-mt-20">
                            <img src="https://picsum.photos/seed/johndoe/128/128" alt="John Doe" className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800"/>
                            <div className="ml-0 sm:ml-6 mt-4 sm:mt-0 text-center sm:text-left">
                                <h1 className="text-3xl font-bold">John Doe</h1>
                                <p className="text-slate-500 dark:text-slate-400">Software Engineer | RapidGig Pro</p>
                            </div>
                        </div>
                        <p className="mt-6 text-slate-600 dark:text-slate-300">Passionate software developer specializing in React and Node.js. Eager to connect with innovative startups and contribute to impactful projects. Let's build something amazing!</p>
                        <div className="mt-6 flex gap-4 flex-wrap">
                            <button className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg">Edit Profile</button>
                            <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg">Upload Intro Video</button>
                        </div>
                    </div>
                </div>

                <ProfileSection title="My Activity Stats">
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <StatCard value="15" label="Gigs Completed" icon={<BriefcaseIcon/>}/>
                        <StatCard value="24" label="Apps Sent" icon={<PaperAirplaneIcon/>}/>
                        <StatCard value="1.2K" label="Profile Views" icon={<EyeIcon/>}/>
                        <StatCard value="4.8" label="Avg. Rating" icon={<CheckCircleIcon/>}/>
                     </div>
                </ProfileSection>
                
                 <ProfileSection title="About Me">
                     <p className="text-slate-600 dark:text-slate-300 leading-relaxed">As a dedicated software engineer with 3+ years of experience, I excel in building scalable web applications with a strong focus on user experience. I have a proven track record of delivering robust solutions and collaborating effectively within agile teams. My expertise includes modern JavaScript frameworks, backend API development, and cloud deployment.</p>
                 </ProfileSection>
                 
                 <ProfileSection title="Skills & Expertise">
                     <div className="flex flex-wrap gap-3">
                        <SkillTag>React.js</SkillTag>
                        <SkillTag>Node.js</SkillTag>
                        <SkillTag>TypeScript</SkillTag>
                        <SkillTag>AWS</SkillTag>
                        <SkillTag>RESTful APIs</SkillTag>
                        <SkillTag>MongoDB</SkillTag>
                        <SkillTag>Docker</SkillTag>
                        <SkillTag>UI/UX Design</SkillTag>
                     </div>
                 </ProfileSection>

                 <div id="my-applications" className="scroll-mt-20">
                    <ProfileSection title="My Applications" noPadding>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-700/50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Company</th>
                                        <th scope="col" className="px-6 py-3">Position</th>
                                        <th scope="col" className="px-6 py-3">Date Applied</th>
                                        <th scope="col" className="px-6 py-3">Status</th>
                                        <th scope="col" className="px-6 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MY_APPLICATIONS.map((app) => (
                                        <tr key={app.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70">
                                            <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{app.job.company}</th>
                                            <td className="px-6 py-4">{app.job.title}</td>
                                            <td className="px-6 py-4">{app.dateApplied}</td>
                                            <td className="px-6 py-4"><StatusBadge status={app.status} /></td>
                                            <td className="px-6 py-4 text-right">
                                                <a href="#" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">View Job</a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ProfileSection>
                 </div>
            </main>
        </div>
    );
};

// Messages Page Component
const MessagesPage: React.FC<{}> = () => {
    const [activeThread, setActiveThread] = useState<MessageThread | null>(MESSAGE_THREADS[0]);
    const [isChatListVisible, setIsChatListVisible] = useState(true);

    const handleThreadSelect = (thread: MessageThread) => {
      setActiveThread(thread);
      if (window.innerWidth < 768) { // md breakpoint
        setIsChatListVisible(false);
      }
    };
    
    const ChatList = () => (
       <aside className={`w-full md:w-1/3 xl:w-1/4 bg-white dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700/50 rounded-l-lg p-4 flex-col ${isChatListVisible ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Chats</h2>
          </div>
          <div className="relative mb-4">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
              <input type="text" placeholder="Search chats..." className="w-full bg-slate-100 dark:bg-slate-700 rounded-lg pl-10 pr-4 py-2" />
          </div>
          <div className="flex-grow overflow-y-auto -mr-2 pr-2">
              {MESSAGE_THREADS.map(thread => (
                  <div key={thread.id} onClick={() => handleThreadSelect(thread)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-2 transition-colors ${activeThread?.id === thread.id ? 'bg-indigo-100 dark:bg-indigo-600/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                      <div className="relative">
                        <img src={thread.user.avatarUrl} alt={thread.user.name} className="w-12 h-12 rounded-full" />
                        <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ${activeThread?.id === thread.id ? 'ring-indigo-100 dark:ring-indigo-600/30' : 'ring-white dark:ring-slate-800'}`}></span>
                      </div>
                      <div className="flex-grow overflow-hidden">
                          <div className="flex justify-between">
                              <p className="font-semibold truncate">{thread.user.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">{thread.timestamp}</p>
                          </div>
                          <div className="flex justify-between items-baseline">
                              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{thread.lastMessage}</p>
                              {thread.unreadCount > 0 && <span className="bg-indigo-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">{thread.unreadCount}</span>}
                          </div>
                      </div>
                  </div>
              ))}
          </div>
          <button className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2">
            <PlusIcon className="w-5 h-5"/> New Chat
          </button>
      </aside>
    );

    const ChatWindow = () => (
      <main className={`w-full md:w-2/3 xl:w-2/4 bg-white dark:bg-slate-800/50 flex flex-col ${isChatListVisible && 'hidden md:flex'}`}>
          {activeThread ? (
              <>
              <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <button className="md:hidden" onClick={() => setIsChatListVisible(true)}>←</button>
                      <img src={activeThread.user.avatarUrl} alt={activeThread.user.name} className="w-10 h-10 rounded-full" />
                      <h2 className="text-xl font-bold">{activeThread.user.name}</h2>
                  </div>
                  <button><EllipsisVerticalIcon className="w-6 h-6 text-slate-500 dark:text-slate-400"/></button>
              </div>
              <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-4 bg-slate-50 dark:bg-transparent">
                    {activeThread.messages.map((msg, idx) => (
                        <div key={idx} className={`flex items-end gap-2 ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'them' && <img src={activeThread.user.avatarUrl} className="w-8 h-8 rounded-full"/>}
                            <div className={`max-w-md p-3 rounded-2xl ${msg.sender === 'me' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                                <p>{msg.text}</p>
                                <p className="text-xs mt-1 text-right opacity-70">{msg.time}</p>
                            </div>
                        </div>
                    ))}
              </div>
              <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                      <input type="text" placeholder="Type your message..." className="bg-transparent w-full focus:outline-none px-3" />
                      <button className="p-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors"><PaperAirplaneIcon className="w-6 h-6"/></button>
                  </div>
              </div>
              </>
          ) : (
              <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">Select a chat to start messaging</div>
          )}
      </main>
    );

    const NotificationPanel = () => {
      const iconMap: { [key: string]: React.ReactNode } = {
        'congrats': <CheckCircleIcon className="w-6 h-6 text-green-500 dark:text-green-400"/>,
        'maintenance': <InformationCircleIcon className="w-6 h-6 text-blue-500 dark:text-blue-400"/>,
        'profile': <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 dark:text-amber-400"/>,
        'message': <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-fuchsia-500 dark:text-fuchsia-400"/>,
        'gig': <BriefcaseIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400"/>,
      }
      const getIcon = (text: React.ReactNode) => {
        const s = String(text).toLowerCase();
        if (s.includes('congrats')) return iconMap.congrats;
        if (s.includes('maintenance')) return iconMap.maintenance;
        if (s.includes('profile')) return iconMap.profile;
        if (s.includes('message')) return iconMap.message;
        if (s.includes('gig')) return iconMap.gig;
        return <BellIcon className="w-6 h-6 text-slate-500 dark:text-slate-400"/>;
      }
      return (
        <aside className="w-full md:w-1/3 bg-white dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 rounded-r-lg p-4 hidden xl:flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Notifications</h2>
                <button className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-500">Clear All</button>
            </div>
            <div className="space-y-4 overflow-y-auto">
                {NOTIFICATIONS.map(n => (
                    <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">{getIcon(n.text)}</div>
                        <div>
                            <p className="text-sm text-slate-800 dark:text-slate-200 leading-tight">{n.text}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{n.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
      );
    };

    return (
        <div className="container mx-auto p-4">
          <div className="flex h-[calc(100vh-88px)] bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/50 rounded-lg">
              <ChatList />
              <ChatWindow />
              <NotificationPanel />
          </div>
        </div>
    );
};


// Upload Video Page Component
const UploadVideoPage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
    return (
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-8 rounded-lg">
                <h1 className="text-3xl font-bold mb-2 tracking-tighter">Upload Your Introduction</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8">Showcase your skills and personality with a short video.</p>
                <form className="space-y-6" onSubmit={e => e.preventDefault()}>
                    <div>
                        <label htmlFor="video-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Video Title</label>
                        <input type="text" id="video-title" placeholder="e.g., Senior React Developer with a Passion for UX" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                        <textarea id="description" rows={4} placeholder="Share more about your skills and what you're looking for..." className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                    </div>
                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tags</label>
                        <input type="text" id="tags" placeholder="e.g., React, UI/UX, Backend (comma-separated)" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="duration-limit" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Max Duration</label>
                            <select id="duration-limit" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-chevron-down">
                                <option>1 Minute</option>
                                <option>2 Minutes</option>
                                <option>5 Minutes</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
                            <select id="category" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-chevron-down">
                                <option>Web Development</option>
                                <option>Mobile Development</option>
                                <option>UI/UX Design</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <div className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-500 transition-colors px-6 py-10">
                            <div className="text-center">
                                <ArrowUpOnSquareIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <div className="mt-4 flex text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-indigo-500 dark:text-indigo-400 focus-within:outline-none hover:text-indigo-600 dark:hover:text-indigo-300">
                                        <span>Click to upload</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs leading-5 text-slate-500">MP4, MOV, AVI (Max 50MB)</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={() => navigate('profile')} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                        <button type="button" className="bg-slate-500 dark:bg-slate-600 hover:bg-slate-600 dark:hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">Preview</button>
                        <button type="submit" onClick={() => {alert('Video Uploaded!'); navigate('profile')}} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg">Upload</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// Job Application Page Component
const JobApplicationPage: React.FC<{ job: Job | null; navigate: (page: Page) => void }> = ({ job, navigate }) => {
    
    if (!job) {
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Job not found</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">The job you are trying to apply for does not exist.</p>
                <button onClick={() => navigate('jobs')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg">Back to Jobs</button>
            </div>
        );
    }

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // In a real app, you would handle form submission logic here.
      alert(`Successfully applied for ${job.title} at ${job.company}!`);
      navigate('profile');
      // Maybe scroll to #my-applications
      setTimeout(() => {
        const el = document.getElementById('my-applications');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <button onClick={() => navigate('jobs')} className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300">← Back to all jobs</button>
            </div>
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Application Form */}
                <div className="w-full lg:w-2/3">
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-8 rounded-lg space-y-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tighter">Apply to {job.company}</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-lg">{job.title}</p>
                        </div>
                        
                        <div className="border-t border-slate-200 dark:border-slate-700"></div>

                        <div>
                            <label htmlFor="cover-letter" className="block text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Cover Letter</label>
                            <textarea id="cover-letter" rows={8} placeholder={`Why are you a good fit for the ${job.title} role?`} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                        </div>
                        
                        <div>
                            <label className="block text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Attachments</label>
                            {/* Resume Upload */}
                            <div className="mb-4">
                                <label htmlFor="resume-upload" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Resume/CV</label>
                                <div className="mt-2 flex items-center gap-4">
                                    <label htmlFor="resume-upload" className="cursor-pointer bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg text-sm">
                                      <span>Upload File</span>
                                      <input id="resume-upload" name="resume-upload" type="file" className="sr-only" />
                                    </label>
                                    <span className="text-sm text-slate-500">No file chosen</span>
                                </div>
                            </div>
                            {/* Video Intro Upload */}
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Video Introduction</label>
                                <div className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-500 transition-colors px-6 py-10">
                                    <div className="text-center">
                                        <VideoCameraIcon className="mx-auto h-12 w-12 text-slate-500 dark:text-slate-400" />
                                        <div className="mt-4 flex text-sm leading-6 text-slate-500 dark:text-slate-400">
                                            <label htmlFor="video-upload" className="relative cursor-pointer rounded-md font-semibold text-indigo-500 dark:text-indigo-400 focus-within:outline-none hover:text-indigo-600 dark:hover:text-indigo-300">
                                                <span>Upload a short video</span>
                                                <input id="video-upload" name="video-upload" type="file" className="sr-only" />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs leading-5 text-slate-500">Max 1 minute, up to 50MB</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700"></div>
                        
                        <div className="flex justify-end gap-4">
                            <button type="button" onClick={() => navigate('jobs')} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg">Submit Application</button>
                        </div>
                    </form>
                </div>

                {/* Sticky Job Details Sidebar */}
                <aside className="w-full lg:w-1/3">
                    <div className="sticky top-24">
                        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-6 rounded-lg">
                            <h2 className="text-xl font-bold mb-4">Job Details</h2>
                            <div className="space-y-4 text-slate-700 dark:text-slate-300">
                                <div className="flex items-center gap-2"><BriefcaseIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400"/><span>{job.type}</span></div>
                                <div className="flex items-center gap-2"><MapPinIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400"/><span>{job.location}</span></div>
                                <div className="flex items-center gap-2"><CurrencyDollarIcon className="w-5 h-5 text-green-600 dark:text-green-400"/><span>{job.pay}</span></div>
                            </div>
                            
                            {(job.companyVideoUrl || job.freelancerVideoUrl) && <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div>}
                            
                            <div className="space-y-4">
                                {job.companyVideoUrl && (
                                    <div>
                                        <p className="text-sm font-semibold mb-2">Project Brief from {job.company}</p>
                                        <a href={job.companyVideoUrl} target="_blank" rel="noopener noreferrer" className="block relative group">
                                            <img src="https://picsum.photos/seed/companyvideo/400/225" className="rounded-lg w-full"/>
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PlayCircleIcon className="w-12 h-12 text-white"/>
                                            </div>
                                        </a>
                                    </div>
                                )}
                                {job.freelancerVideoUrl && (
                                    <div>
                                        <p className="text-sm font-semibold mb-2">Freelancer Walkthrough</p>
                                        <a href={job.freelancerVideoUrl} target="_blank" rel="noopener noreferrer" className="block relative group">
                                            <img src="https://picsum.photos/seed/freelancervideo/400/225" className="rounded-lg w-full"/>
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PlayCircleIcon className="w-12 h-12 text-white"/>
                                            </div>
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{job.description}</p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};


// Main Application Component
const MainApplication: React.FC<MainApplicationProps> = ({ currentPage, navigate, onLogout, theme, toggleTheme }) => {
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    
    const handleApplyNow = (job: Job) => {
        setSelectedJob(job);
        navigate('job_application');
    };

    const renderContent = () => {
        switch (currentPage) {
            case 'dashboard':
                return <DashboardPage navigate={navigate} onApplyNow={handleApplyNow} />;
            case 'jobs':
                return <JobsPage onApplyNow={handleApplyNow} />;
            case 'shorts':
                return <ShortsPage onApplyNow={handleApplyNow} />;
            case 'profile':
                return <ProfilePage />;
            case 'messages':
            case 'notifications': 
                return <MessagesPage />;
            case 'upload_video':
                return <UploadVideoPage navigate={navigate} />;
            case 'job_application':
                return <JobApplicationPage job={selectedJob} navigate={navigate} />;
            default:
                return <DashboardPage navigate={navigate} onApplyNow={handleApplyNow} />;
        }
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
            <Header navigate={navigate} onLogout={onLogout} currentPage={currentPage} theme={theme} toggleTheme={toggleTheme} />
            <main>
                {renderContent()}
            </main>
        </div>
    );
};

export default MainApplication;