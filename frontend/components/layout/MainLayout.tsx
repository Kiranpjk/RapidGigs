
import React, { useState } from 'react';
import { Page, Job } from '../../types';
import Header from './Header';
import DashboardPage from '../pages/DashboardPage';
import JobsPage from '../pages/JobsPage';
import ShortsPage from '../pages/ShortsPage';
import ProfilePage from '../pages/ProfilePage';
import MessagesPage from '../pages/MessagesPage';
import UploadVideoPage from '../pages/UploadVideoPage';
import JobApplicationPage from '../pages/JobApplicationPage';
import { ALL_JOBS } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';


interface MainLayoutProps {
    currentPage: Page;
    navigate: (page: Page) => void;
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isAuthenticated: boolean;
    requireAuth: (callback: () => void, fromPage?: Page) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ currentPage, navigate, onLogout, theme, toggleTheme, isAuthenticated, requireAuth }) => {
    const { user } = useAuth();
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [previousPage, setPreviousPage] = useState<Page>('dashboard');
    
    const handleApplyNow = (job: Job) => {
        requireAuth(() => {
            setSelectedJob(job);
            setPreviousPage(currentPage);
            navigate('job_application');
        }, currentPage);
    };

    const handleNavigateToJobDetail = (jobId: number) => {
        const job = ALL_JOBS.find((j: Job) => j.id === jobId);
        if (job) {
            setSelectedJob(job);
            navigate('job_application');
        }
    };

    const renderContent = () => {
        switch (currentPage) {
            case 'dashboard':
                return <DashboardPage navigate={navigate} onApplyNow={handleApplyNow} />;
            case 'jobs':
                return <JobsPage onApplyNow={handleApplyNow} />;
            case 'shorts':
                return <ShortsPage onApplyNow={handleApplyNow} onNavigateToJobDetail={handleNavigateToJobDetail} />;
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
                return <DashboardPage navigate={navigate} onApplyNow={handleApplyNow} />;
        }
    };

    const handleNavigate = (page: Page) => {
        // Require auth for protected pages
        const protectedPages: Page[] = ['profile', 'messages', 'notifications', 'upload_video'];
        
        if (protectedPages.includes(page) && !isAuthenticated) {
            requireAuth(() => navigate(page), currentPage);
        } else {
            navigate(page);
        }
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
            <Header 
                navigate={handleNavigate} 
                onLogout={onLogout} 
                currentPage={currentPage} 
                theme={theme} 
                toggleTheme={toggleTheme}
                isAuthenticated={isAuthenticated}
                user={user}
            />
            <main>
                {renderContent()}
            </main>
        </div>
    );
};

export default MainLayout;
