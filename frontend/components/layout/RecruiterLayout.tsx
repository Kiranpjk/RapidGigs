import React, { useState } from 'react';
import { Page } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
    LogoIcon,
    HomeIcon,
    VideoCameraIcon,
    BriefcaseSolidIcon,
    Bars3Icon,
    XMarkIcon,
    SunIcon,
    MoonIcon,
    BellIcon,
    PlusCircleIcon,
    Squares2X2Icon,
} from '../icons/Icons';
import RecruiterDashboardPage from '../pages/RecruiterDashboardPage';
import ShortsPage from '../pages/ShortsPage';
import PostJobPage from '../pages/PostJobPage';
import ReviewApplicationsPage from '../pages/ReviewApplicationsPage';
import CandidatesPage from '../pages/CandidatesPage';
import ProfilePage from '../pages/ProfilePage';
import MessagesPage from '../pages/MessagesPage';
import JobApplicationPage from '../pages/JobApplicationPage';
import UploadVideoPage from '../pages/UploadVideoPage';
import SettingsPage from '../pages/SettingsPage';
import { Job } from '../../types';
import { VideoGenIndicator } from '../common/VideoGenIndicator';
import { NotificationDropdown } from '../common/NotificationDropdown';

interface RecruiterLayoutProps {
    currentPage: Page;
    navigate: (page: Page) => void;
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isAuthenticated: boolean;
    requireAuth: (callback: () => void, fromPage?: Page) => void;
}

interface NavLinkItem {
    name: string;
    page: Page;
    icon: React.ReactNode;
}

const NavLink: React.FC<{ item: NavLinkItem; isActive: boolean; onClick: () => void }> = ({ item, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold cursor-pointer transition-all duration-200 border-none whitespace-nowrap ${isActive
            ? 'text-gray-900 dark:text-white'
            : 'bg-transparent text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/50'
        }`}
    >
        {isActive && (
            <div className="absolute inset-0 bg-gray-50 dark:bg-white/10 rounded-2xl -z-10" />
        )}
        {item.icon} {item.name}
    </button>
);

const navItems: NavLinkItem[] = [
    {
        name: 'Home', page: 'dashboard' as Page,
        icon: <Squares2X2Icon className="w-5 h-5" />
    },
    {
        name: 'Shorts', page: 'shorts' as Page,
        icon: <VideoCameraIcon className="w-5 h-5" />
    },
    {
        name: 'Post Jobs', page: 'post_job' as Page,
        icon: <PlusCircleIcon className="w-5 h-5" />
    },
    {
        name: 'Applications', page: 'review_applications' as Page,
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        )
    },
    {
        name: 'Candidates', page: 'candidates' as Page,
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
        )
    },
    {
        name: 'Messages', page: 'messages' as Page,
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
        )
    },
];

const RecruiterLayout: React.FC<RecruiterLayoutProps> = ({
    currentPage, navigate, onLogout, theme, toggleTheme, isAuthenticated, requireAuth
}) => {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [previousPage, setPreviousPage] = useState<Page>('dashboard');

    const handleApplyNow = (jobId: string, jobTitle: string) => {
        setSelectedJob({ id: jobId, title: jobTitle } as unknown as Job);
        setPreviousPage(currentPage);
        navigate('job_application');
    };

    const handleNavigateToJobDetail = (jobId: string) => {
        navigate('review_applications');
    };

    const renderContent = () => {
        switch (currentPage) {
            case 'dashboard':
                return <RecruiterDashboardPage navigate={navigate} />;
            case 'shorts':
                return (
                    <ShortsPage
                        onApplyNow={(job: any) => handleApplyNow((job as any).id || '', (job as any).title || '')}
                        onNavigateToJobDetail={handleNavigateToJobDetail}
                        onNavigate={navigate}
                    />
                );
            case 'post_job':
                return <PostJobPage navigate={navigate} />;
            case 'review_applications':
                return <ReviewApplicationsPage />;
            case 'candidates':
                return <CandidatesPage navigate={navigate} />;
            case 'profile':
                return <ProfilePage navigate={navigate} />;
            case 'messages':
            case 'notifications':
                return <MessagesPage />;
            case 'upload_video':
                return <UploadVideoPage navigate={navigate} />;
            case 'job_application':
                return <JobApplicationPage job={selectedJob} navigate={navigate} previousPage={previousPage} />;
            case 'settings':
                return <SettingsPage navigate={navigate} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} />;
            default:
                return <RecruiterDashboardPage navigate={navigate} />;
        }
    };

    return (
        <div className="bg-[#f5f5f7] dark:bg-gray-900 min-h-screen">
            {/* Recruiter Header */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-200/60 dark:border-slate-700/50 transition-all duration-300">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('dashboard')}>
                                <LogoIcon className="h-8 w-8 text-indigo-500" />
                                <div>
                                <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">RapidGig</span>
                                    <span className="ml-2 text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 px-2.5 py-1 rounded-lg">Recruiter</span>
                                </div>
                            </div>
                            <nav className="hidden md:flex items-center space-x-1">
                                {navItems.map(item => (
                                    <NavLink key={item.name} item={item} isActive={currentPage === item.page} onClick={() => navigate(item.page)} />
                                ))}
                            </nav>
                        </div>

                        <div className="flex items-center gap-2 md:gap-4">
                            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                {theme === 'dark' ? <SunIcon className="h-6 w-6 text-slate-300" /> : <MoonIcon className="h-6 w-6 text-slate-600" />}
                            </button>
                            <NotificationDropdown navigate={navigate} />

                            {/* Video generation progress indicator — Chrome download style */}
                            <VideoGenIndicator onNavigate={navigate} />

                            <div className="relative">
                                <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
                                    <img
                                        src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'R')}&size=40&background=6366f1&color=fff`}
                                        alt={user?.name || 'Recruiter'}
                                        className="w-9 h-9 rounded-full ring-2 ring-slate-300 dark:ring-slate-600 hover:ring-indigo-500 transition-all object-cover"
                                    />
                                </button>
                                {isProfileMenuOpen && (
                                    <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl py-2 z-50 border border-gray-100 dark:border-slate-700 overflow-hidden">
                                        <div className="px-5 py-3 border-b border-gray-50 dark:border-slate-700">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name}</p>
                                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Recruiter</p>
                                        </div>
                                        <button onClick={() => { navigate('profile'); setIsProfileMenuOpen(false); }} className="block w-full text-left px-5 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-all">Your Profile</button>
                                        <button onClick={() => { navigate('settings'); setIsProfileMenuOpen(false); }} className="block w-full text-left px-5 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-all">Settings</button>
                                        <button onClick={() => { navigate('post_job'); setIsProfileMenuOpen(false); }} className="block w-full text-left px-5 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-all">Post a Job</button>
                                        <button onClick={() => { navigate('candidates'); setIsProfileMenuOpen(false); }} className="block w-full text-left px-5 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-all">Browse Candidates</button>
                                        <div className="border-t border-gray-50 dark:border-slate-700 mt-1 pt-1">
                                            <button onClick={() => { onLogout(); setIsProfileMenuOpen(false); }} className="block w-full text-left px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-all">Sign out</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="md:hidden">
                                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                                    {isMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {isMenuOpen && (
                        <div className="md:hidden pb-4 space-y-1">
                            {navItems.map(item => (
                                <NavLink key={item.name} item={item} isActive={currentPage === item.page} onClick={() => navigate(item.page)} />
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <main>
                {renderContent()}
            </main>
        </div>
    );
};

export default RecruiterLayout;
