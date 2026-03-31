
import React, { useState, useEffect } from 'react';
import { Page } from './types';
import AuthPage from './components/auth/AuthPage';
import MainLayout from './components/layout/MainLayout';
import { useAuth } from './context/AuthContext';
import { JobProvider } from './context/JobContext';
import { VideoGenProvider } from './context/VideoGenContext';
import { canAccessPage, getDefaultPageForRole } from './utils/rbac';
import AdminLayout from './components/layout/AdminLayout';
import RecruiterLayout from './components/layout/RecruiterLayout';

// All valid page routes
const VALID_PAGES: Page[] = [
  'dashboard', 'shorts', 'jobs', 'profile', 'messages',
  'notifications', 'upload_video', 'job_application',
  'admin', 'post_job', 'review_applications', 'candidates',
];

/** Read the current browser path and return the matching Page, or fallback to dashboard */
const getPageFromUrl = (): Page => {
  const path = window.location.pathname.replace(/^\//, '') as Page;
  return VALID_PAGES.includes(path) ? path : 'dashboard';
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(getPageFromUrl);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
  );
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalPage, setAuthModalPage] = useState<'login' | 'signup'>('login');
  const [returnPage, setReturnPage] = useState<Page | null>(null);

  const { isAuthenticated, isLoading, logout, user } = useAuth();

  // Apply dark/light class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync page state → browser URL + document title
  useEffect(() => {
    const currentPath = window.location.pathname.replace(/^\//, '');
    if (currentPath !== currentPage) {
      window.history.pushState({ page: currentPage }, '', `/${currentPage}`);
    }
    document.title = `RapidGig | ${currentPage
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())}`;
  }, [currentPage]);

  // Handle browser back / forward buttons
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const page = (e.state?.page as Page) || getPageFromUrl();
      setCurrentPage(page);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // RBAC guard — redirect if user lacks access to current page
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!canAccessPage(user.role, currentPage)) {
      setCurrentPage(getDefaultPageForRole(user.role));
    }
  }, [isAuthenticated, user, currentPage]);

  const toggleTheme = () => setTheme(p => p === 'dark' ? 'light' : 'dark');

  const navigate = (page: Page) => {
    if (page === 'login') {
      setAuthModalPage('login'); setShowAuthModal(true); setReturnPage(currentPage); return;
    }
    if (page === 'signup') {
      setAuthModalPage('signup'); setShowAuthModal(true); setReturnPage(currentPage); return;
    }
    if (isAuthenticated && !canAccessPage(user?.role, page)) {
      setCurrentPage(getDefaultPageForRole(user?.role)); return;
    }
    setCurrentPage(page);
  };

  const handleLogout = () => {
    logout();
    setCurrentPage('dashboard');
    setShowAuthModal(false);
    window.history.pushState({ page: 'dashboard' }, '', '/dashboard');
  };

  const requireAuth = (callback: () => void, fromPage?: Page) => {
    if (!isAuthenticated) {
      setReturnPage(fromPage || currentPage);
      setShowAuthModal(true);
    } else {
      callback();
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (returnPage) { navigate(returnPage); setReturnPage(null); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <VideoGenProvider>
    <JobProvider>
      {user?.role === 'admin' || user?.role === 'moderator' ? (
        <AdminLayout
          currentPage={currentPage} navigate={navigate} onLogout={handleLogout}
          theme={theme} toggleTheme={toggleTheme} isAuthenticated={isAuthenticated}
        />
      ) : user?.role === 'recruiter' ? (
        <RecruiterLayout
          currentPage={currentPage} navigate={navigate} onLogout={handleLogout}
          theme={theme} toggleTheme={toggleTheme} isAuthenticated={isAuthenticated}
          requireAuth={requireAuth}
        />
      ) : (
        <MainLayout
          currentPage={currentPage} navigate={navigate} onLogout={handleLogout}
          theme={theme} toggleTheme={toggleTheme} isAuthenticated={isAuthenticated}
          requireAuth={requireAuth}
        />
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-6xl mx-auto my-8">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute -top-4 -right-2 sm:-right-4 w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors z-10 shadow-lg"
            >✕</button>
            <div className="rounded-2xl overflow-hidden">
              <AuthPage
                initialPage={authModalPage}
                navigate={(page) => { if (page === 'dashboard') handleAuthSuccess(); }}
              />
            </div>
          </div>
        </div>
      )}
    </JobProvider>
    </VideoGenProvider>
  );
};

export default App;
