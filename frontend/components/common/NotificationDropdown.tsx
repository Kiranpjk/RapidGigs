import React, { useState, useRef, useEffect } from 'react';
import { useFloating, offset, flip, shift } from '@floating-ui/react';
import { BellIcon } from '../icons/Icons';
import { Page } from '../../types';
import { notificationsAPI } from '../../services/api';

export const NotificationDropdown: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationsAPI.getAll();
            setNotifications(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        
        // Auto-poll every 30 seconds for new notifications
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const { refs, floatingStyles } = useFloating({
        placement: 'bottom-end',
        middleware: [offset(16), flip(), shift()],
        open: isOpen,
        onOpenChange: setIsOpen,
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleNotificationClick = async (notif: any) => {
        try {
            // Mark as read in backend
            if (!notif.isRead) {
                await notificationsAPI.markAsRead(notif.id);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
            }
            
            setIsOpen(false);
            
            // Context-aware Navigation
            if (notif.type === 'job' || notif.type === 'application') navigate('review_applications');
            else if (notif.type === 'video' || notif.type === 'short_video') navigate('shorts');
            else if (notif.type === 'status') navigate('dashboard');
        } catch (error) {
            console.error('Error handling notification click:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsAPI.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                ref={refs.setReference} 
                onClick={() => setIsOpen(!isOpen)} 
                className="relative p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200"
            >
                <BellIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div 
                    ref={refs.setFloating} 
                    style={floatingStyles}
                    className="w-80 sm:w-96 bg-white/60 dark:bg-slate-900/80 backdrop-blur-3xl rounded-3xl premium-shadow-xl border border-white/50 dark:border-slate-700/50 z-50 overflow-hidden transform animate-fade-in-up"
                >
                    <div className="p-5 border-b border-white/20 dark:border-slate-700/50 flex justify-between items-center bg-white/30 dark:bg-slate-800/30">
                        <h3 className="font-extrabold text-slate-800 dark:text-white text-lg drop-shadow-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllRead}
                                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline bg-white/50 dark:bg-black/20 px-3 py-1 rounded-full border border-white/30 dark:border-white/5"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <span className="text-4xl block mb-3 drop-shadow-md">📭</span>
                                <p className="text-sm font-medium">You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/20 dark:divide-slate-700/50">
                                {notifications.map(notif => (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`p-5 hover:bg-white/60 dark:hover:bg-slate-800/80 cursor-pointer transition-colors backdrop-blur-sm ${notif.isRead ? 'opacity-70' : 'bg-white/40 dark:bg-slate-800/40'}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className="text-3xl mt-0.5 drop-shadow-lg">
                                                {notif.type === 'job' || notif.type === 'application' ? '👔' : 
                                                 (notif.type === 'video' || notif.type === 'short_video' ? '🎬' : '🎉')}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className={`text-sm ${notif.isRead ? 'font-medium text-slate-700 dark:text-slate-300' : 'font-extrabold text-slate-900 dark:text-white'}`}>
                                                        {notif.title}
                                                    </h4>
                                                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">{notif.time}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                            </div>
                                            {!notif.isRead && (
                                                <div className="flex items-center">
                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
