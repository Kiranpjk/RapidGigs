import React, { useState } from 'react';
import { Page } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
    LogoIcon,
    VideoCameraIcon,
    BriefcaseSolidIcon,
    Bars3Icon,
    XMarkIcon,
    SunIcon,
    MoonIcon,
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

const NAV_ITEMS = [
    { name: 'Home', page: 'dashboard' as Page, icon: <Squares2X2Icon className="w-4 h-4" /> },
    { name: 'Shorts', page: 'shorts' as Page, icon: <VideoCameraIcon className="w-4 h-4" /> },
    { name: 'Post Job', page: 'post_job' as Page, icon: <PlusCircleIcon className="w-4 h-4" /> },
    { name: 'Applications', page: 'review_applications' as Page, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { name: 'Candidates', page: 'candidates' as Page, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
    { name: 'Messages', page: 'messages' as Page, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg> },
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

    const [reviewFilter, setReviewFilter] = useState<{ status?: string; appId?: string; jobId?: string }>({});

    const handleReviewFilter = (filter: { status?: string; appId?: string; jobId?: string }) => {
        setReviewFilter(filter);
        navigate('review_applications');
    };

    const renderContent = () => {
        switch (currentPage) {
            case 'dashboard':
                return <RecruiterDashboardPage navigate={navigate} onReviewFilter={handleReviewFilter} />;
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
                return <ReviewApplicationsPage initialFilter={reviewFilter.status} autoExpandAppId={reviewFilter.appId} initialJobId={reviewFilter.jobId} />;
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
        <div className="bg-[var(--bg)] min-h-screen">
            {/* ── Top Bar ────────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 bg-[var(--bg)] border-b border-[var(--border)]">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-12">
                        {/* Left: Logo + Nav */}
                        <div className="flex items-center gap-6">
                            <button onClick={() => navigate('dashboard')} className="flex items-center gap-2 shrink-0">
                                <LogoIcon className="h-5 w-5 text-[var(--accent)]" />
                                <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">RapidGig</span>
                                <span className="text-[10px] font-medium text-[var(--text-tertiary)] bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded">Recruiter</span>
                            </button>

                            <div className="hidden md:flex items-center border-l border-[var(--border)] pl-6 grow overflow-x-auto no-scrollbar">
                                <div className="flex items-center gap-1">
                                    {NAV_ITEMS.map(item => {
                                        const isActive = currentPage === item.page;
                                        return (
                                            <button
                                                key={item.name}
                                                onClick={() => navigate(item.page)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors duration-100 whitespace-nowrap
                                                    ${isActive
                                                        ? 'text-[var(--text-primary)] bg-[var(--surface)]'
                                                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                                                    }`}
                                            >
                                                {item.icon}
                                                {item.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1">
                            <VideoGenIndicator onNavigate={navigate} currentPage={currentPage} />
                            <NotificationDropdown navigate={navigate} />
                            <button onClick={toggleTheme} className="p-2 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors duration-100">
                                {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                            </button>

                            {/* Profile */}
                            <div className="relative ml-1">
                                <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-md hover:bg-[var(--surface-hover)] transition-colors duration-100">
                                    <span className="text-[13px] font-medium text-[var(--text-secondary)] hidden sm:block">{user?.name?.split(' ')[0]}</span>
                                    <img
                                        src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'R')}&size=28&background=2563eb&color=fff&bold=true`}
                                        alt=""
                                        className="w-6 h-6 rounded-full"
                                    />
                                </button>
                                {isProfileMenuOpen && (
                                    <div className="absolute right-0 mt-1 w-48 bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-lg py-1 z-50 animate-fade-in">
                                        <div className="px-3 py-2 border-b border-[var(--border)]">
                                            <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{user?.name}</p>
                                            <p className="text-[11px] text-[var(--text-tertiary)]">Recruiter</p>
                                        </div>
                                        <button onClick={() => { navigate('profile'); setIsProfileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors duration-100">Profile</button>
                                        <button onClick={() => { navigate('settings'); setIsProfileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors duration-100">Settings</button>
                                        <div className="border-t border-[var(--border)] mt-1 pt-1">
                                            <button onClick={() => { onLogout(); setIsProfileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors duration-100">Sign out</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile menu */}
                            <div className="md:hidden ml-1">
                                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]">
                                    {isMenuOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile nav */}
                    {isMenuOpen && (
                        <div className="md:hidden pb-4 space-y-1 animate-fade-in px-2">
                            {NAV_ITEMS.map(item => (
                                <button
                                    key={item.name}
                                    onClick={() => { navigate(item.page); setIsMenuOpen(false); }}
                                    className={`flex items-center gap-3 w-full px-4 py-3 text-[14px] font-medium rounded-lg transition-colors ${currentPage === item.page ? 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]'}`}
                                >
                                    <span className="shrink-0">{item.icon}</span>
                                    {item.name}
                                </button>
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
