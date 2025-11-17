
import React, { useState, useEffect } from 'react';
import { Page } from './types';
import AuthPage from './components/auth/AuthPage';
import MainLayout from './components/layout/MainLayout';
import { useAuth } from './context/AuthContext';
import { JobProvider } from './context/JobContext';

const App: React.FC = () => {
  // Load saved page from localStorage or default to dashboard
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const savedPage = localStorage.getItem('currentPage');
    return (savedPage as Page) || 'dashboard';
  });
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as 'light' | 'dark') || 'dark';
  });
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalPage, setAuthModalPage] = useState<'login' | 'signup'>('login');
  const [returnPage, setReturnPage] = useState<Page | null>(null);
  
  const { isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Save theme to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const navigate = (page: Page) => {
    // Handle login/signup navigation
    if (page === 'login') {
      setAuthModalPage('login');
      setShowAuthModal(true);
      setReturnPage(currentPage);
      return;
    }
    
    if (page === 'signup') {
      setAuthModalPage('signup');
      setShowAuthModal(true);
      setReturnPage(currentPage);
      return;
    }
    
    setCurrentPage(page);
    // Save current page to localStorage
    localStorage.setItem('currentPage', page);
  };

  const handleLogout = () => {
    logout();
    setCurrentPage('dashboard');
    setShowAuthModal(false);
    // Clear saved page on logout
    localStorage.removeItem('currentPage');
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
    if (returnPage) {
      navigate(returnPage);
      setReturnPage(null);
    }
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <JobProvider>
      <MainLayout 
        currentPage={currentPage} 
        navigate={navigate} 
        onLogout={handleLogout} 
        theme={theme} 
        toggleTheme={toggleTheme}
        isAuthenticated={isAuthenticated}
        requireAuth={requireAuth}
      />
      
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0">
          <div className="relative w-full h-full lg:h-auto lg:max-w-6xl lg:mx-4 lg:rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 lg:-top-4 lg:-right-4 w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors z-10 shadow-lg"
            >
              ✕
            </button>
            <AuthPage initialPage={authModalPage} navigate={(page) => {
              if (page === 'dashboard') {
                handleAuthSuccess();
              }
            }} />
          </div>
        </div>
      )}
    </JobProvider>
  );
};

export default App;
