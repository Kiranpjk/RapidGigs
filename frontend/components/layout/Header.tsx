import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFloating, offset, flip, shift } from '@floating-ui/react';
import { Page } from '../../types';
import {
    LogoIcon,
    SearchIcon,
    BellIcon,
    UserCircleIcon,
    HomeIcon,
    VideoCameraIcon,
    BriefcaseSolidIcon,
    MessageSquareIcon,
    Cog6ToothIcon,
    SunIcon,
    MoonIcon,
    XMarkIcon,
    Bars3Icon
} from '../icons/Icons';
import Modal from '../common/Modal';
import useModal from '../../hooks/useModal';
import { VideoGenIndicator } from '../common/VideoGenIndicator';
import { NotificationDropdown } from '../common/NotificationDropdown';

interface User {
    id: string;
    name: string;
    avatarUrl?: string;
    role?: string;
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

interface NavLinkItem {
    name: string;
    page: Page;
    icon: React.ReactNode;
    requiresAuth?: boolean;
}

const NavLink: React.FC<{ item: NavLinkItem; isActive: boolean; onClick: () => void; isMobile?: boolean }> = ({ item, isActive, onClick, isMobile }) => (
    <button
        onClick={onClick}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 border-none ${isMobile ? 'w-full justify-start' : ''} ${isActive
            ? 'text-gray-900 dark:text-white font-semibold'
            : 'bg-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-slate-800/50'
        }`}
    >
        {isActive && (
            <div className="absolute inset-0 bg-gray-100 dark:bg-white/10 rounded-xl -z-10" />
        )}
        <div className="flex-shrink-0">{item.icon}</div>
        <span>{item.name}</span>
    </button>
);

const Header: React.FC<HeaderProps> = ({ navigate, onLogout, currentPage, theme, toggleTheme, isAuthenticated, user }) => {
    const { modalState, showAlert, closeModal } = useModal();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const { refs: floatingRefs, floatingStyles } = useFloating({
        placement: 'bottom-end',
        middleware: [offset(10), flip(), shift()],
        open: isProfileMenuOpen,
        onOpenChange: setIsProfileMenuOpen,
    });

    const navItems: NavLinkItem[] = [
        { name: 'Home', page: 'dashboard' as Page, icon: <HomeIcon className="w-5 h-5" /> },
        { name: 'Shorts', page: 'shorts' as Page, icon: <VideoCameraIcon className="w-5 h-5" /> },
        { name: 'Jobs', page: 'jobs' as Page, icon: <BriefcaseSolidIcon className="w-5 h-5" /> },
        ...(user && (user.role === 'admin' || user.role === 'moderator')
            ? [{ name: 'Admin', page: 'admin' as Page, icon: <Cog6ToothIcon className="w-5 h-5" />, requiresAuth: true }]
            : []),
        { name: 'Profile', page: 'profile' as Page, icon: <UserCircleIcon className="w-5 h-5" />, requiresAuth: true },
        { name: 'Messages', page: 'messages' as Page, icon: <MessageSquareIcon className="w-5 h-5" />, requiresAuth: true },
    ];

    const handleNav = useCallback((page: Page) => {
        navigate(page);
        setIsMenuOpen(false);
    }, [navigate]);

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

    return (
        <>
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-200/60 dark:border-slate-700/50 transition-all duration-300">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => navigate('dashboard')}>
                                <LogoIcon className="h-8 w-8 text-indigo-500" />
                                <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tighter hidden sm:block">RapidGig</span>
                            </div>
                            <nav className="hidden lg:flex items-center space-x-1">
                                {navItems.map(item => (
                                    !item.requiresAuth || isAuthenticated ? (
                                        <NavLink key={item.name} item={item} isActive={currentPage === item.page} onClick={() => handleNav(item.page)} />
                                    ) : null
                                ))}
                            </nav>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <div className="relative hidden xl:block">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400" />
                                <input type="text" placeholder="Search..." className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2 w-64 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all duration-200" />
                            </div>
                            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200">
                                {theme === 'dark' ? <SunIcon className="h-6 w-6 text-slate-300" /> : <MoonIcon className="h-6 w-6 text-slate-600" />}
                            </button>
                            {isAuthenticated && <NotificationDropdown navigate={navigate} />}
                            {isAuthenticated && <VideoGenIndicator onNavigate={navigate} />}
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
                                    <button ref={floatingRefs.setReference} onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="block">
                                        <img
                                            src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&size=40&background=6366f1&color=fff`}
                                            alt={user?.name || 'User'}
                                            className="w-9 h-9 rounded-full ring-2 ring-slate-300 dark:ring-slate-600 hover:ring-indigo-500 transition-all object-cover"
                                        />
                                    </button>
                                    {isProfileMenuOpen && (
                                        <div 
                                            ref={floatingRefs.setFloating} 
                                            style={floatingStyles}
                                            className="w-48 bg-white dark:bg-slate-700 rounded-md shadow-lg py-1 z-50 ring-1 ring-black/5"
                                        >
                                            <button onClick={() => { navigate('profile'); setIsProfileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">Your Profile</button>
                                            <button onClick={() => { showAlert("Coming Soon", "Settings page is under development!", "info"); setIsProfileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">Settings</button>
                                            <div className="border-t border-slate-200 dark:border-slate-600 my-1"></div>
                                            <button onClick={() => { onLogout(); setIsProfileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">Sign out</button>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="lg:hidden">
                                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    {isMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    {isMenuOpen && (
                        <div ref={mobileMenuRef} className="lg:hidden pb-6 pt-2 space-y-1.5 animate-in slide-in-from-top-4 duration-300">
                            {navItems.map(item => (
                                !item.requiresAuth || isAuthenticated ? (
                                    <NavLink key={item.name} item={item} isActive={currentPage === item.page} onClick={() => handleNav(item.page)} isMobile={true} />
                                ) : null
                            ))}
                            {!isAuthenticated && (
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                                    <button onClick={() => handleNav('login')} className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">Login</button>
                                    <button onClick={() => handleNav('signup')} className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-indigo-500/20">Sign Up</button>
                                </div>
                            )}
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
