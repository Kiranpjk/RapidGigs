import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFloating, offset, flip, shift } from '@floating-ui/react';
import { Page } from '../../types';
import {
    LogoIcon, SearchIcon, BellIcon, UserCircleIcon, HomeIcon,
    VideoCameraIcon, BriefcaseSolidIcon, MessageSquareIcon,
    Cog6ToothIcon, SunIcon, MoonIcon, XMarkIcon, Bars3Icon,
    BriefcaseIcon, Squares2X2Icon
} from '../icons/Icons';
import Modal from '../common/Modal';
import useModal from '../../hooks/useModal';
import { VideoGenIndicator } from '../common/VideoGenIndicator';
import { NotificationDropdown } from '../common/NotificationDropdown';

interface User { id: string; name: string; avatarUrl?: string; role?: string; }

interface HeaderProps {
    navigate: (page: Page) => void;
    onLogout: () => void;
    currentPage: Page;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isAuthenticated: boolean;
    user: User | null;
}

interface NavItem { name: string; page: Page; icon: React.ReactNode; requiresAuth?: boolean; }

const NAV_ITEMS: NavItem[] = [
    { name: 'Home',     page: 'dashboard', icon: <Squares2X2Icon className="w-4 h-4" /> },
    { name: 'Shorts',   page: 'shorts',    icon: <VideoCameraIcon className="w-4 h-4" /> },
    { name: 'Jobs',     page: 'jobs',      icon: <BriefcaseSolidIcon className="w-4 h-4" /> },
    { name: 'Profile',  page: 'profile',   icon: <UserCircleIcon className="w-4 h-4" />, requiresAuth: true },
    { name: 'Messages', page: 'messages',  icon: <MessageSquareIcon className="w-4 h-4" />, requiresAuth: true },
];

const Header: React.FC<HeaderProps> = ({ navigate, onLogout, currentPage, theme, toggleTheme, isAuthenticated, user }) => {
    const { modalState, showAlert, closeModal } = useModal();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const { refs: floatingRefs, floatingStyles } = useFloating({
        placement: 'bottom-end',
        middleware: [offset(4), flip(), shift()],
        open: isProfileMenuOpen,
        onOpenChange: setIsProfileMenuOpen,
    });

    const handleNav = useCallback((page: Page) => { navigate(page); setIsMenuOpen(false); }, [navigate]);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setIsProfileMenuOpen(false); };
        if (isProfileMenuOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isProfileMenuOpen]);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) setIsMenuOpen(false); };
        if (isMenuOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isMenuOpen]);

    const allNavItems = [
        ...NAV_ITEMS,
        ...(user && (user.role === 'admin' || user.role === 'moderator')
            ? [{ name: 'Admin', page: 'admin' as Page, icon: <Cog6ToothIcon className="w-4 h-4" />, requiresAuth: true }]
            : []),
    ];

    return (
        <>
            <header className="sticky top-0 z-50 bg-[var(--bg)] border-b border-[var(--border)]">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-12">
                        {/* Left */}
                        <div className="flex items-center gap-6">
                            <button onClick={() => navigate('dashboard')} className="flex items-center gap-2 shrink-0">
                                <LogoIcon className="h-5 w-5 text-[var(--accent)]" />
                                <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight hidden sm:block">RapidGig</span>
                            </button>
                            <nav className="hidden lg:flex items-center border-l border-[var(--border)] pl-6">
                                {allNavItems.map(item => {
                                    if (item.requiresAuth && !isAuthenticated) return null;
                                    const isActive = currentPage === item.page;
                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => handleNav(item.page)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-100
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
                            </nav>
                        </div>

                        {/* Right */}
                        <div className="flex items-center gap-1">
                            <button onClick={toggleTheme} className="p-2 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors duration-100">
                                {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                            </button>
                            {isAuthenticated && (
                                <div className="flex items-center gap-0.5 shrink-0">
                                    <NotificationDropdown navigate={navigate} />
                                    <VideoGenIndicator onNavigate={navigate} currentPage={currentPage} />
                                </div>
                            )}
                            {!isAuthenticated ? (
                                <div className="flex items-center gap-1.5 ml-2">
                                    <button onClick={() => navigate('login')} className="px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Login</button>
                                    <button onClick={() => navigate('signup')} className="px-3 py-1.5 text-[13px] font-medium bg-[var(--text-primary)] text-[var(--bg)] rounded-md hover:opacity-90 transition-opacity">Sign Up</button>
                                </div>
                            ) : (
                                <div className="relative ml-1" ref={profileMenuRef}>
                                    <button ref={floatingRefs.setReference} onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--surface-hover)] transition-colors duration-100">
                                        <img
                                            src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&size=24&background=2563eb&color=fff&bold=true`}
                                            alt=""
                                            className="w-6 h-6 rounded-full"
                                        />
                                    </button>
                                    {isProfileMenuOpen && (
                                        <div ref={floatingRefs.setFloating} style={floatingStyles} className="w-48 bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-lg py-1 z-50 animate-fade-in">
                                            <div className="px-3 py-2 border-b border-[var(--border)]">
                                                <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{user?.name}</p>
                                                {user?.role && <p className="text-[10px] text-[var(--text-tertiary)] capitalize">{user.role}</p>}
                                            </div>
                                            <button onClick={() => { navigate('profile'); setIsProfileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">Profile</button>
                                            <button onClick={() => { navigate('settings'); setIsProfileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">Settings</button>
                                            <div className="border-t border-[var(--border)] mt-1 pt-1">
                                                <button onClick={() => { onLogout(); setIsProfileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors">Sign out</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="lg:hidden ml-1">
                                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]">
                                    {isMenuOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile */}
                    {isMenuOpen && (
                        <div ref={mobileMenuRef} className="lg:hidden pb-3 space-y-0.5 animate-fade-in">
                            {allNavItems.map(item => {
                                if (item.requiresAuth && !isAuthenticated) return null;
                                return (
                                    <button key={item.name} onClick={() => handleNav(item.page)}
                                        className={`flex items-center gap-2 w-full px-3 py-2 text-[13px] font-medium rounded-md ${currentPage === item.page ? 'bg-[var(--surface)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                                        {item.icon} {item.name}
                                    </button>
                                );
                            })}
                            {!isAuthenticated && (
                                <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-1.5">
                                    <button onClick={() => handleNav('login')} className="w-full px-3 py-2 text-[13px] text-[var(--text-secondary)]">Login</button>
                                    <button onClick={() => handleNav('signup')} className="w-full bg-[var(--text-primary)] text-[var(--bg)] rounded-md py-2 text-[13px] font-medium">Sign Up</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <Modal isOpen={modalState.isOpen} onClose={closeModal} onConfirm={modalState.onConfirm} title={modalState.title} message={modalState.message} type={modalState.type} confirmText={modalState.confirmText} cancelText={modalState.cancelText} showCancel={modalState.showCancel} />
        </>
    );
};

export default Header;
