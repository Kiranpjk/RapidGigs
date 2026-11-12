import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { messagesAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SearchIcon, PlusIcon, PaperAirplaneIcon, XMarkIcon, ArrowLeftIcon } from '../icons/Icons';
import { card, chip, hint, input, pageLead, btnPrimary, btnSecondary, btnGhost, btnSm, errorNote, spinner, avatarUrl } from '../ui/classes';

interface Msg {
    id: string;
    sender: 'me' | 'them';
    text: string;
    time: string;
    isRead?: boolean;
}

interface Thread {
    id: string;
    user: { id: string; name: string; avatarUrl?: string; role?: string };
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
    messages: Msg[];
}

interface FoundUser {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    title?: string;
    role?: string;
}

const SOCKET_URL = (import.meta.env.VITE_API_BASE as string)?.replace('/api', '') || 'http://localhost:3001';

const MessagesPage: React.FC = () => {
    const { user } = useAuth();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [activeThread, setActiveThread] = useState<Thread | null>(null);
    const [isChatListVisible, setIsChatListVisible] = useState(true);
    const [messageInput, setMessageInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [loadingThreads, setLoadingThreads] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sidebarSearch, setSidebarSearch] = useState('');

    // New chat modal
    const [showNewChat, setShowNewChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<FoundUser | null>(null);
    const [searchError, setSearchError] = useState('');
    const [searching, setSearching] = useState(false);

    const socket = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeThread?.messages]);

    // Connect WebSocket
    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem('authToken');
        socket.current = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        socket.current.on('connect', () => {
            socket.current?.emit('join-room', user.id);
        });

        socket.current.on('new-message', (data: { senderId: string; message: string; timestamp: string }) => {
            const timeStr = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            setThreads(prev => {
                const threadExists = prev.some(t => t.user.id === data.senderId);
                if (!threadExists) {
                    // Refresh threads if new conversation comes in
                    loadThreads();
                    return prev;
                }
                return prev.map(thread => {
                    if (thread.user.id === data.senderId) {
                        const newMsg: Msg = { id: Date.now().toString(), sender: 'them', text: data.message, time: timeStr };
                        return { 
                            ...thread, 
                            lastMessage: data.message, 
                            timestamp: 'Just now', 
                            unreadCount: activeThread?.user.id === data.senderId ? 0 : thread.unreadCount + 1, 
                            messages: activeThread?.user.id === data.senderId ? [...thread.messages, newMsg] : thread.messages 
                        };
                    }
                    return thread;
                }).sort((a,b) => (a.timestamp === 'Just now' ? -1 : 1));
            });

            setActiveThread(prev => {
                if (prev && prev.user.id === data.senderId) {
                    const newMsg: Msg = { id: Date.now().toString(), sender: 'them', text: data.message, time: timeStr };
                    return { ...prev, messages: [...prev.messages, newMsg] };
                }
                return prev;
            });
        });

        return () => { socket.current?.disconnect(); };
    }, [user, activeThread?.user.id]);

    useEffect(() => { loadThreads(); }, []);

    const loadThreads = async () => {
        setLoadingThreads(true);
        try {
            const data = await messagesAPI.getThreads();
            const loaded = Array.isArray(data) ? data.map((t: any) => ({
                id: (t.id || t.user?.id || Math.random().toString()).toString(),
                user: { id: t.user?.id, name: t.user?.name, avatarUrl: t.user?.avatarUrl, role: t.user?.role },
                lastMessage: t.lastMessage || '',
                timestamp: t.timestamp || '',
                unreadCount: t.unreadCount || 0,
                messages: [],
            })) : [];
            setThreads(loaded);
            if (loaded.length > 0 && !activeThread && window.innerWidth >= 768) {
                // Don't auto-open on mobile to show list first
                openThread(loaded[0]);
            }
        } catch { }
        setLoadingThreads(false);
    };

    const openThread = async (thread: Thread) => {
        setIsChatListVisible(false);
        setLoadingMessages(true);
        setActiveThread({ ...thread, messages: [] });
        if (window.innerWidth >= 768) setIsChatListVisible(true);

        try {
            const msgs = await messagesAPI.getThread(thread.user.id);
            const mapped: Msg[] = Array.isArray(msgs) ? msgs.map((m: any) => ({
                id: m.id, sender: m.sender, text: m.text, time: m.time,
            })) : [];
            setActiveThread(t => t ? { ...t, messages: mapped, unreadCount: 0 } : t);
            setThreads(prev => prev.map(t => t.user.id === thread.user.id ? { ...t, unreadCount: 0 } : t));
        } catch { }
        setLoadingMessages(false);
    };

    const sendMessage = async () => {
        if (!messageInput.trim() || !activeThread || isSending) return;
        const text = messageInput.trim();
        setMessageInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setIsSending(true);

        const optimisticMsg: Msg = {
            id: `optimistic-${Date.now()}`,
            sender: 'me',
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setActiveThread(t => t ? { ...t, messages: [...t.messages, optimisticMsg] } : t);
        setThreads(prev => {
            const updated = prev.map(t =>
                t.user.id === activeThread.user.id ? { ...t, lastMessage: text, timestamp: 'Just now' } : t
            );
            // Move active thread to top
            const targetIdx = updated.findIndex(t => t.user.id === activeThread.user.id);
            if (targetIdx > 0) {
                const [target] = updated.splice(targetIdx, 1);
                updated.unshift(target);
            }
            return updated;
        });

        try {
            await messagesAPI.send(activeThread.user.id, text);
            socket.current?.emit('send-message', { receiverId: activeThread.user.id, message: text, senderId: user?.id });
        } catch {
            setActiveThread(t => t ? { ...t, messages: t.messages.filter(m => m.id !== optimisticMsg.id) } : t);
        }
        setIsSending(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessageInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setSearchError('');
        setSearchResult(null);
        try {
            const result = await usersAPI.search(searchQuery.trim());
            setSearchResult(result);
        } catch (err: any) {
            setSearchError(err.message || 'User not found.');
        }
        setSearching(false);
    };

    const startChatWith = (foundUser: FoundUser) => {
        const existingThread = threads.find(t => t.user.id === foundUser.id);
        if (existingThread) {
            openThread(existingThread);
        } else {
            const newThread: Thread = {
                id: foundUser.id,
                user: { id: foundUser.id, name: foundUser.name, avatarUrl: foundUser.avatarUrl, role: foundUser.role },
                lastMessage: '', timestamp: 'Just now', unreadCount: 0, messages: [],
            };
            setThreads(prev => [newThread, ...prev]);
            openThread(newThread);
        }
        setShowNewChat(false);
        setSearchQuery('');
        setSearchResult(null);
        setSearchError('');
    };

    const roleBadge = (role?: string) =>
        role === 'recruiter' || role === 'student'
            ? <span className={`${chip} !text-[11.5px] !px-2 !py-0.5 capitalize`}>{role}</span>
            : null;

    const closeNewChat = () => { setShowNewChat(false); setSearchQuery(''); setSearchResult(null); setSearchError(''); };
    const copyId = () => { navigator.clipboard.writeText(user?.id || ''); };

    const filteredThreads = threads.filter(t =>
        t.user.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
        t.lastMessage.toLowerCase().includes(sidebarSearch.toLowerCase())
    );

    const idBox = (
        <div className="p-4 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--border)] text-left">
            <p className="text-[12px] font-medium text-[var(--text-tertiary)] mb-1.5">Your user ID. Share it so others can message you.</p>
            <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[12.5px] text-[var(--text-primary)] select-all truncate flex-1">{user?.id}</span>
                <button onClick={copyId} className={`${btnSecondary} ${btnSm}`}>Copy</button>
            </div>
        </div>
    );

    return (
        <div className="max-w-screen-xl mx-auto px-0 sm:px-8 sm:py-6 h-[100vh] sm:h-[calc(100vh-80px)] overflow-hidden flex flex-col animate-fade-in">

            {showNewChat && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={closeNewChat}>
                    <div role="dialog" aria-modal="true" aria-labelledby="new-chat-title" onClick={e => e.stopPropagation()} className={`${card} shadow-[var(--shadow-lg)] w-full max-w-md p-6`}>
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <h3 id="new-chat-title" className="font-display text-[20px] font-semibold text-[var(--text-primary)]">New conversation</h3>
                                <p className={pageLead}>Find someone by user ID or email.</p>
                            </div>
                            <button onClick={closeNewChat} aria-label="Close" className={`${btnGhost} !px-2 -mr-2`}><XMarkIcon className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                                    <input
                                        type="text"
                                        autoFocus
                                        aria-label="User ID or email"
                                        placeholder="User ID or email"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                        className={`${input} pl-9`}
                                    />
                                </div>
                                <button onClick={handleSearch} disabled={searching || !searchQuery.trim()} className={btnPrimary}>
                                    {searching ? 'Searching…' : 'Find'}
                                </button>
                            </div>

                            {searchError && <p role="alert" className={errorNote}>{searchError}</p>}

                            {searchResult && (
                                <div className="border border-[var(--border)] rounded-[var(--radius)] p-3 flex items-center gap-3">
                                    <img src={avatarUrl(searchResult.name, searchResult.avatarUrl)} alt="" className="w-11 h-11 rounded-full object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">{searchResult.name}</p>
                                        <p className="text-[12.5px] text-[var(--text-secondary)] truncate">{searchResult.email}</p>
                                        <div className="mt-1">{roleBadge(searchResult.role)}</div>
                                    </div>
                                    <button onClick={() => startChatWith(searchResult)} className={`${btnPrimary} ${btnSm}`}>Message</button>
                                </div>
                            )}

                            {idBox}
                        </div>
                    </div>
                </div>
            )}

            <div className={`flex-1 flex ${card} !rounded-none sm:!rounded-[14px] overflow-hidden`}>

                <aside className={`w-full md:w-[320px] flex-shrink-0 border-r border-[var(--border)] flex-col bg-[var(--bg)] ${isChatListVisible ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-4 flex flex-col gap-3 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <h1 className="font-display text-[20px] font-semibold text-[var(--text-primary)]">Messages</h1>
                            <button onClick={() => setShowNewChat(true)} className={`${btnSecondary} ${btnSm}`} aria-label="New message">
                                <PlusIcon className="w-4 h-4" /> New
                            </button>
                        </div>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                            <input type="text" aria-label="Search conversations" placeholder="Search conversations" value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} className={`${input} pl-9`} />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
                        {loadingThreads ? (
                            <div className="p-10 flex justify-center" role="status" aria-label="Loading conversations"><div className={spinner} /></div>
                        ) : filteredThreads.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-[14px] font-medium text-[var(--text-primary)]">{sidebarSearch ? 'No matches' : 'No conversations yet'}</p>
                                {!sidebarSearch && (
                                    <>
                                        <p className={hint}>Start one with a recruiter or student.</p>
                                        <button onClick={() => setShowNewChat(true)} className={`${btnPrimary} mt-4`}>New message</button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <ul className="space-y-0.5">
                                {filteredThreads.map(thread => {
                                    const active = activeThread?.user.id === thread.user.id;
                                    return (
                                        <li key={thread.id}>
                                            <button
                                                onClick={() => openThread(thread)}
                                                aria-current={active ? 'true' : undefined}
                                                className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-[var(--radius)] transition-colors focus-ring ${active ? 'bg-[var(--surface)]' : 'hover:bg-[var(--surface-hover)]'}`}
                                            >
                                                <img src={avatarUrl(thread.user.name, thread.user.avatarUrl)} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className={`text-[14px] truncate ${thread.unreadCount > 0 ? 'font-semibold' : 'font-medium'} text-[var(--text-primary)]`}>{thread.user.name}</p>
                                                        <p className="text-[12px] text-[var(--text-tertiary)] flex-shrink-0">{thread.timestamp}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className={`text-[13px] truncate ${thread.unreadCount > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                                            {thread.lastMessage || 'No messages yet'}
                                                        </p>
                                                        {thread.unreadCount > 0 && (
                                                            <span aria-label={`${thread.unreadCount} unread`} className="bg-[var(--accent)] text-[var(--accent-fg)] text-[11px] font-semibold min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full flex-shrink-0">
                                                                {thread.unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </aside>

                <main className={`flex-1 flex flex-col min-w-0 bg-[var(--bg)] ${isChatListVisible && 'hidden md:flex'}`}>
                    {activeThread ? (
                        <>
                            <div className="px-4 sm:px-6 py-3 border-b border-[var(--border)] flex items-center gap-3 flex-shrink-0">
                                <button className={`${btnGhost} md:hidden !px-2 -ml-2`} onClick={() => setIsChatListVisible(true)} aria-label="Back to conversations">
                                    <ArrowLeftIcon className="w-5 h-5" />
                                </button>
                                <img src={avatarUrl(activeThread.user.name, activeThread.user.avatarUrl)} alt="" className="w-10 h-10 rounded-full object-cover" />
                                <div className="min-w-0">
                                    <h2 className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{activeThread.user.name}</h2>
                                    <div className="mt-0.5">{roleBadge(activeThread.user.role)}</div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 py-6 flex flex-col gap-1 min-h-0 bg-[var(--surface)]/40" aria-live="polite">
                                {loadingMessages ? (
                                    <div className="flex-1 flex items-center justify-center" role="status" aria-label="Loading messages"><div className={spinner} /></div>
                                ) : activeThread.messages.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center text-center">
                                        <div>
                                            <p className="text-[15px] font-medium text-[var(--text-primary)]">No messages yet</p>
                                            <p className={hint}>Say hello to {activeThread.user.name}.</p>
                                        </div>
                                    </div>
                                ) : (
                                    activeThread.messages.map((msg, idx) => {
                                        const isMe = msg.sender === 'me';
                                        const newGroup = idx === 0 || activeThread.messages[idx - 1].sender !== msg.sender;
                                        return (
                                            <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${newGroup && idx > 0 ? 'mt-3' : ''}`}>
                                                <div className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2 rounded-[14px] ${isMe ? 'bg-[var(--text-primary)] text-[var(--bg)] rounded-br-[4px]' : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] rounded-bl-[4px]'}`}>
                                                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                                                    <p className={`text-[11px] mt-0.5 text-right tabular-nums ${isMe ? 'opacity-60' : 'text-[var(--text-tertiary)]'}`}>{msg.time}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="px-4 sm:px-6 py-3 border-t border-[var(--border)] flex-shrink-0">
                                <div className="flex items-end gap-2">
                                    <textarea
                                        ref={textareaRef}
                                        rows={1}
                                        aria-label="Message"
                                        value={messageInput}
                                        onChange={handleTextareaChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Write a message"
                                        className={`${input} !h-auto resize-none py-2.5 leading-relaxed`}
                                        style={{ minHeight: '40px', maxHeight: '120px' }}
                                    />
                                    <button onClick={sendMessage} disabled={!messageInput.trim() || isSending} aria-label="Send message" className={`${btnPrimary} !px-3`}>
                                        {isSending ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <PaperAirplaneIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className={`${hint} !mt-1.5`}>Enter to send, Shift+Enter for a new line.</p>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center max-w-sm w-full">
                                <h2 className="font-display text-[22px] font-semibold text-[var(--text-primary)]">Select a conversation</h2>
                                <p className={`${pageLead} mb-6`}>Pick a chat from the list, or start a new one with a student or recruiter.</p>
                                <button onClick={() => setShowNewChat(true)} className={`${btnPrimary} mb-6`}>
                                    <PlusIcon className="w-4 h-4" /> New message
                                </button>
                                {idBox}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default MessagesPage;
