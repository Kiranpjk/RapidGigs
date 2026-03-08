import React, { useState } from 'react';
import { Page } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { JobProvider } from '../../context/JobContext';
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
import { Job } from '../../types';
import { ALL_JOBS } from '../../data/mockData';

interface RecruiterLayoutProps {
    currentPage: Page;
    navigate: (page: Page) => void;
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isAuthenticated: boolean;
    requireAuth: (callback: () => void, fromPage?: Page) => void;
}

const RecruiterLayout: React.FC<RecruiterLayoutProps> = ({
    currentPage, navigate, onLogout, theme, toggleTheme, isAuthenticated, requireAuth
}) => {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [previousPage, setPreviousPage] = useState<Page>('dashboard');

    const handleApplyNow = (job: any) => {
        setSelectedJob(job);
        setPreviousPage(currentPage);
        navigate('job_application');
    };

    const handleNavigateToJobDetail = (jobId: string) => {
        // Updated for MongoDB string compatibility
        const job = ALL_JOBS.find((j: Job) => j.id.toString() === jobId);
        if (job) {
            setSelectedJob(job);
            navigate('job_application');
        }
    };

    const navItems = [
        {
            name: 'Home', page: 'dashboard' as Page,
            icon: <HomeIcon className="w-5 h-5" />
        },
        {
            name: 'Shorts', page: 'shorts' as Page,
            icon: <VideoCameraIcon className="w-5 h-5" />
        },
        {
            name: 'Post Jobs', page: 'post_job' as Page,
            icon: <BriefcaseSolidIcon className="w-5 h-5" />
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

    const NavLink: React.FC<{ item: typeof navItems[0] }> = ({ item }) => {
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

    const renderContent = () => {
        switch (currentPage) {
            case 'dashboard':
                return <RecruiterDashboardPage navigate={navigate} />;
            case 'shorts':
                return (
                    <ShortsPage 
                        onApplyNow={handleApplyNow} 
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
            default:
                return <RecruiterDashboardPage navigate={navigate} />;
        }
    };

    return (
        <JobProvider>
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
            {/* Recruiter Header */}
            <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg sticky top-0 z-50 shadow-lg border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('dashboard')}>
                                <LogoIcon className="h-8 w-8 text-indigo-500" />
                                <div>
                                    <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tighter">RapidGig</span>
                                    <span className="ml-2 text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">Recruiter</span>
                                </div>
                            </div>
                            <nav className="hidden md:flex items-center space-x-1">
                                {navItems.map(item => <NavLink key={item.name} item={item} />)}
                            </nav>
                        </div>

                        <div className="flex items-center gap-2 md:gap-4">
                            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                {theme === 'dark' ? <SunIcon className="h-6 w-6 text-slate-300" /> : <MoonIcon className="h-6 w-6 text-slate-600" />}
                            </button>
                            <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onClick={() => navigate('notifications')}>
                                <BellIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                            </button>

                            <div className="relative">
                                <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
                                    <img
                                        src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'R')}&size=40&background=6366f1&color=fff`}
                                        alt={user?.name}
                                        className="w-9 h-9 rounded-full ring-2 ring-slate-300 dark:ring-slate-600 hover:ring-indigo-500 transition-all object-cover"
                                    />
                                </button>
                                {isProfileMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 rounded-md shadow-lg py-1 z-50 ring-1 ring-black/5">
                                        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-600">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user?.name}</p>
                                            <p className="text-xs text-indigo-500 dark:text-indigo-400">Recruiter</p>
                                        </div>
                                        <a onClick={() => { navigate('profile'); setIsProfileMenuOpen(false); }} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">Your Profile</a>
                                        <a onClick={() => { navigate('post_job'); setIsProfileMenuOpen(false); }} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">Post a Job</a>
                                        <a onClick={() => { navigate('candidates'); setIsProfileMenuOpen(false); }} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">Browse Candidates</a>
                                        <div className="border-t border-slate-200 dark:border-slate-600 my-1"></div>
                                        <a onClick={() => { onLogout(); setIsProfileMenuOpen(false); }} className="block px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">Sign out</a>
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
                            {navItems.map(item => <NavLink key={item.name} item={item} />)}
                        </div>
                    )}
                </div>
            </header>

            <main>
                {renderContent()}
            </main>
        </div>
        </JobProvider>
    );
};

export default RecruiterLayout;
