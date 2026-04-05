
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
import AdminPage from '../pages/AdminPage';
import { useAuth } from '../../context/AuthContext';
import { canAccessPage } from '../../utils/rbac';


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
    
    const handleApplyNow = (job: any) => {
        requireAuth(() => {
            setSelectedJob(job);
            setPreviousPage(currentPage);
            navigate('job_application');
        }, currentPage);
    };

    const handleNavigateToJobDetail = (_jobId: string) => {
        // Navigate to jobs page since jobs now come from the backend
        navigate('jobs');
    };

    const renderContent = () => {
        switch (currentPage) {
            case 'dashboard':
                return <DashboardPage navigate={navigate} onApplyNow={handleApplyNow} />;
            case 'jobs':
                return <JobsPage onApplyNow={handleApplyNow} />;
            case 'shorts':
                return (
                    <ShortsPage 
                        onApplyNow={handleApplyNow} 
                        onNavigateToJobDetail={handleNavigateToJobDetail} 
                        onNavigate={navigate}
                    />
                );
            case 'profile':
                return <ProfilePage navigate={navigate} />;
            case 'messages':
            case 'notifications': 
                return <MessagesPage />;
            case 'upload_video':
                return <UploadVideoPage navigate={navigate} />;
            case 'job_application':
                return <JobApplicationPage job={selectedJob} navigate={navigate} previousPage={previousPage} />;
            case 'admin':
                if (!isAuthenticated || !canAccessPage(user?.role, 'admin')) {
                    return <DashboardPage navigate={navigate} onApplyNow={handleApplyNow} />;
                }
                return <AdminPage />;
            default:
                return <DashboardPage navigate={navigate} onApplyNow={handleApplyNow} />;
        }
    };

    const handleNavigate = (page: Page) => {
        // Require auth for protected pages
        const protectedPages: Page[] = ['profile', 'messages', 'notifications', 'upload_video', 'admin'];

        if (protectedPages.includes(page) && !isAuthenticated) {
            requireAuth(() => navigate(page), currentPage);
            return;
        }

        if (isAuthenticated && !canAccessPage(user?.role, page)) {
            navigate('dashboard');
            return;
        }

        navigate(page);
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
