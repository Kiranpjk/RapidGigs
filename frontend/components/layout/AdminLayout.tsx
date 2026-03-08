import React, { useState } from 'react';
import { Page } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
    LogoIcon, 
    UserCircleIcon,
    BriefcaseSolidIcon,
    Cog6ToothIcon,
    ArrowUpOnSquareIcon,
    HomeIcon,
    UserIcon,
    Bars3Icon,
    XMarkIcon,
    SunIcon,
    MoonIcon
} from '../icons/Icons';
import AdminPage from '../pages/AdminPage';

interface AdminLayoutProps {
    currentPage: Page;
    navigate: (page: Page) => void;
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isAuthenticated: boolean;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ currentPage, navigate, onLogout, theme, toggleTheme, isAuthenticated }) => {
    const { user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navItems = [
        { name: 'Dashboard', page: 'admin', icon: <HomeIcon className="w-5 h-5" /> },
        // Later we can add more pages if needed like 'admin_users', 'admin_jobs', etc.
    ];

    const NavLink: React.FC<{ item: any }> = ({ item }) => {
        const isActive = currentPage === item.page;
        return (
            <a onClick={() => { navigate(item.page); setIsSidebarOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 ${isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'
                    }`}
            >
                {item.icon} {item.name}
            </a>
        );
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-gray-900 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 z-20 bg-black/50 md:hidden" 
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-slate-700/50 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <LogoIcon className="h-8 w-8 text-indigo-500" />
                        <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tighter">Admin Panel</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {navItems.map(item => <NavLink key={item.name} item={item} />)}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4">
                        <img
                            src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&size=40&background=6366f1&color=fff`}
                            alt={user?.name || 'Admin'}
                            className="w-10 h-10 rounded-full ring-2 ring-indigo-500 object-cover"
                        />
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user?.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onLogout} 
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                    <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                        <button 
                            onClick={() => setIsSidebarOpen(true)} 
                            className="md:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-md"
                        >
                            <Bars3Icon className="w-6 h-6" />
                        </button>

                        <div className="flex-1"></div>

                        <div className="flex items-center gap-4">
                            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                                {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-gray-900">
                    <div className="py-6">
                        {currentPage === 'admin' ? (
                            <AdminPage />
                        ) : (
                            <div className="container mx-auto px-4 text-center">
                                <h2 className="text-2xl font-bold mt-10">Select an admin module from the sidebar.</h2>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
