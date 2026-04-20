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
import SettingsPage from '../pages/SettingsPage';
import { useAuth } from '../../context/AuthContext';
import { canAccessPage } from '../../utils/rbac';
import { jobsAPI } from '../../services/api';

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

    const handleNavigateToJobDetail = async (jobId: string) => {
        requireAuth(async () => {
            try {
                const data = await jobsAPI.getById(jobId);
                const mappedJob: Job = {
                    id: data.id || data._id || jobId,
                    title: data.title,
                    company: data.company,
                    location: data.location,
                    type: data.type || 'Remote',
                    pay: data.pay,
                    description: data.description,
                    postedAgo: data.postedAgo || 'Recently',
                    category: data.category,
                    companyVideoUrl: data.companyVideoUrl,
                    freelancerVideoUrl: data.freelancerVideoUrl,
                    shortVideoUrl: data.shortVideoUrl,
                    maxSlots: data.maxSlots,
                    filledSlots: data.filledSlots,
                    status: data.status,
                    likes: data.likes || 0,
                    comments: data.comments || 0,
                    shares: data.shares || 0,
                };
                setSelectedJob(mappedJob);
                setPreviousPage(currentPage);
                navigate('job_application');
            } catch {
                navigate('jobs');
            }
        }, currentPage);
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
            case 'settings':
                return <SettingsPage navigate={navigate} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} />;
            case 'admin':
                if (!isAuthenticated || !canAccessPage(user?.role, 'admin')) {
                    return <DashboardPage navigate={navigate} onApplyNow={handleApplyNow} />;
                }
                return <AdminPage />;
            default:
                return <DashboardPage navigate={navigate} onApplyNow={handleApplyNow} />;
        }
    };

    return (
        <div className="bg-[var(--bg)] min-h-screen">
            <Header 
                navigate={(page: Page) => {
                    const protectedPages: Page[] = ['profile', 'messages', 'notifications', 'upload_video', 'admin', 'settings'];
                    if (protectedPages.includes(page) && !isAuthenticated) {
                        requireAuth(() => navigate(page), currentPage);
                        return;
                    }
                    if (isAuthenticated && !canAccessPage(user?.role, page)) {
                        navigate('dashboard');
                        return;
                    }
                    navigate(page);
                }}
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
