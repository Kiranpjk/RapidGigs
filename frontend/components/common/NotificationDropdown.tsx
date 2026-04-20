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
        try { setLoading(true); const data = await notificationsAPI.getAll(); setNotifications(Array.isArray(data) ? data : []); }
        catch {} finally { setLoading(false); }
    };

    useEffect(() => { fetchNotifications(); const interval = setInterval(fetchNotifications, 30000); return () => clearInterval(interval); }, []);
    useEffect(() => { if (isOpen) fetchNotifications(); }, [isOpen]);

    const { refs, floatingStyles } = useFloating({
        placement: 'bottom-end',
        middleware: [offset(8), flip(), shift()],
        open: isOpen,
        onOpenChange: setIsOpen,
    });

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false); };
        if (isOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleClick = async (notif: any) => {
        try {
            if (!notif.isRead) { await notificationsAPI.markAsRead(notif.id); setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n)); }
            setIsOpen(false);
            if (notif.type === 'job' || notif.type === 'application') navigate('review_applications');
            else if (notif.type === 'video' || notif.type === 'short_video') navigate('shorts');
            else if (notif.type === 'status') navigate('dashboard');
        } catch {}
    };

    const markAllRead = async () => {
        try { await notificationsAPI.markAllAsRead(); setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))); } catch {}
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                ref={refs.setReference}
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors duration-100"
            >
                <BellIcon className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--danger)] rounded-full" />
                )}
            </button>

            {isOpen && (
                <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    className="w-72 bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-lg z-50 animate-fade-in"
                >
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
                        <h3 className="text-[13px] font-medium text-[var(--text-primary)]">Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-[11px] text-[var(--accent)] hover:underline font-medium">
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-sm text-[var(--text-tertiary)]">No notifications</div>
                        ) : (
                            <div className="divide-y divide-[var(--border)]">
                                {notifications.map(notif => (
                                    <button
                                        key={notif.id}
                                        onClick={() => handleClick(notif)}
                                        className={`w-full text-left px-3 py-2.5 hover:bg-[var(--surface-hover)] transition-colors duration-75 ${notif.isRead ? 'opacity-60' : ''}`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className={`text-[12px] truncate ${notif.isRead ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)] font-medium'}`}>
                                                        {notif.title}
                                                    </p>
                                                    <span className="text-[10px] text-[var(--text-tertiary)] whitespace-nowrap shrink-0">{notif.time}</span>
                                                </div>
                                                <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-2 mt-0.5">{notif.message}</p>
                                            </div>
                                            {!notif.isRead && (
                                                <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full mt-1.5 shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
