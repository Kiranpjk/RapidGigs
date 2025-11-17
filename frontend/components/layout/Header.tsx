
import React, { useState, useEffect, useRef } from 'react';
import { Page } from '../../types';
import { 
    LogoIcon, 
    SearchIcon, 
    BellIcon, 
    UserCircleIcon,
    HomeIcon,
    VideoCameraIcon,
    BriefcaseOutlineIcon,
    ChatBubbleLeftRightIcon,
    SunIcon,
    MoonIcon,
    XMarkIcon,
    Bars3Icon
} from '../icons/Icons';
import Modal from '../common/Modal';
import useModal from '../../hooks/useModal';

interface User {
    id: string;
    name: string;
    avatarUrl?: string;
}

interface HeaderProps {
    navigate: (page: Page) => void;
    onLogout: () => void;
    currentPage: Page;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isAuthenticated: boolean;
    user: User | null;
}

const Header: React.FC<HeaderProps> = ({ navigate, onLogout, currentPage, theme, toggleTheme, isAuthenticated, user }) => {
    const { modalState, showAlert, closeModal } = useModal();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };

        if (isProfileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileMenuOpen]);

    // Close mobile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    const allNavItems: { name: string; page: Page, icon: React.ReactNode, requiresAuth?: boolean }[] = [
        { name: 'Home', page: 'dashboard', icon: <HomeIcon className="w-5 h-5"/> },
        { name: 'Shorts', page: 'shorts', icon: <VideoCameraIcon className="w-5 h-5"/> },
        { name: 'Jobs', page: 'jobs', icon: <BriefcaseOutlineIcon className="w-5 h-5"/> },
        { name: 'Profile', page: 'profile', icon: <UserCircleIcon className="w-5 h-5"/>, requiresAuth: true },
        { name: 'Messages', page: 'messages', icon: <ChatBubbleLeftRightIcon className="w-5 h-5"/>, requiresAuth: true },
    ];

    // Filter nav items based on authentication
    const navItems = allNavItems.filter(item => !item.requiresAuth || isAuthenticated);

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
        <>
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
                        {isAuthenticated && (
                            <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200" onClick={() => navigate('notifications')}>
                               <BellIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                            </button>
                        )}
                        {!isAuthenticated ? (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => navigate('login')}
                                    className="hidden sm:block px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                    Login
                                </button>
                                <button 
                                    onClick={() => navigate('signup')}
                                    className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all duration-200 transform hover:scale-105"
                                >
                                    Sign Up
                                </button>
                            </div>
                        ) : (
                            <div className="relative" ref={profileMenuRef}>
                               <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="block">
                                 <img 
                                    src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&size=40&background=6366f1&color=fff`} 
                                    alt={user?.name || 'User'} 
                                    className="w-9 h-9 rounded-full ring-2 ring-slate-300 dark:ring-slate-600 hover:ring-indigo-500 transition-all object-cover"
                                 />
                               </button>
                               {isProfileMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 rounded-md shadow-lg py-1 z-50 ring-1 ring-black/5">
                                  <a onClick={() => {navigate('profile'); setIsProfileMenuOpen(false);}} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">Your Profile</a>
                                  <a onClick={() => {showAlert("Coming Soon", "Settings page is under development!", "info"); setIsProfileMenuOpen(false);}} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">Settings</a>
                                  <div className="border-t border-slate-200 dark:border-slate-600 my-1"></div>
                                  <a onClick={() => {onLogout(); setIsProfileMenuOpen(false);}} className="block px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">Sign out</a>
                               </div>
                               )}
                            </div>
                        )}
                         <div className="md:hidden">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                                {isMenuOpen ? <XMarkIcon className="w-6 h-6"/> : <Bars3Icon className="w-6 h-6"/>}
                            </button>
                        </div>
                    </div>
                </div>
                {isMenuOpen && (
                    <div ref={mobileMenuRef} className="md:hidden pb-4 space-y-1">
                        {navItems.map(item => <NavLink key={item.name} item={item} />)}
                    </div>
                )}
            </div>
        </header>
        
        {/* Custom Modal */}
        <Modal
            isOpen={modalState.isOpen}
            onClose={closeModal}
            onConfirm={modalState.onConfirm}
            title={modalState.title}
            message={modalState.message}
            type={modalState.type}
            confirmText={modalState.confirmText}
            cancelText={modalState.cancelText}
            showCancel={modalState.showCancel}
        />
    </>
);
};

export default Header;
