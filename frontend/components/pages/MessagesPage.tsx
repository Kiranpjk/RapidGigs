import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { messagesAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
    SearchIcon,
    PlusIcon,
    EllipsisVerticalIcon,
    PaperAirplaneIcon,
    XMarkIcon,
    SparklesIcon,
} from '../icons/Icons';

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

    const avatarUrl = (name?: string, url?: string) =>
        url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&size=80&background=6366f1&color=fff&bold=true`;

    const roleBadge = (role?: string) => {
        if (role === 'recruiter') return <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-500/20">Recruiter</span>;
        if (role === 'student') return <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">Student</span>;
        return null;
    };

    const filteredThreads = threads.filter(t => 
        t.user.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
        t.lastMessage.toLowerCase().includes(sidebarSearch.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-6 h-[100vh] sm:h-[calc(100vh-80px)] overflow-hidden flex flex-col animate-slide-up">
            
            {/* New Chat Modal */}
            {showNewChat && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4 transition-all duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 w-full max-w-md p-8 border border-white/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                        
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">New Conversation</h3>
                                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1">Start chatting with talent</p>
                            </div>
                            <button onClick={() => { setShowNewChat(false); setSearchQuery(''); setSearchResult(null); setSearchError(''); }}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all cursor-pointer">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div className="relative">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Enter User ID or email..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700 rounded-[1.5rem] pl-11 pr-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-600"
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={searching || !searchQuery.trim()}
                                    className="absolute right-2 top-2 bottom-2 bg-gray-900 dark:bg-indigo-600 text-white px-5 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.05] active:scale-[0.95] disabled:opacity-40 transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
                                >
                                    {searching ? '...' : 'Find'}
                                </button>
                            </div>

                            {searchError && (
                                <div className="text-[11px] text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20 rounded-2xl px-5 py-3 font-bold uppercase tracking-wider animate-shake">
                                    ⚠️ {searchError}
                                </div>
                            )}

                            {searchResult && (
                                <div className="border border-indigo-100 dark:border-indigo-500/20 rounded-[2rem] p-5 flex items-center gap-5 bg-indigo-50/30 dark:bg-indigo-500/5 transition-all animate-slide-up group">
                                    <div className="relative">
                                        <img src={avatarUrl(searchResult.name, searchResult.avatarUrl)} alt={searchResult.name}
                                            className="w-14 h-14 rounded-2xl object-cover shadow-md group-hover:scale-105 transition-transform" />
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-slate-800" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-gray-900 dark:text-white truncate text-base leading-tight mb-0.5">{searchResult.name}</p>
                                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 truncate opacity-80">{searchResult.email}</p>
                                        <div className="mt-2">{roleBadge(searchResult.role)}</div>
                                    </div>
                                    <button
                                        onClick={() => startChatWith(searchResult)}
                                        className="h-12 w-12 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
                                    >
                                        <PaperAirplaneIcon className="w-5 h-5 rotate-45" />
                                    </button>
                                </div>
                            )}

                            <div className="p-5 bg-gray-50 dark:bg-slate-900/50 rounded-[1.5rem] border border-gray-100 dark:border-slate-700">
                                <p className="text-[10px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-[0.1em] mb-2 leading-none">Your User ID (Public)</p>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-mono text-indigo-500 font-bold select-all text-[11px] truncate flex-1">{user?.id}</span>
                                    <button onClick={() => { navigator.clipboard.writeText(user?.id || ''); }} className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-widest cursor-pointer shrink-0">Copy</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Chat Container */}
            <div className="flex-1 flex bg-white dark:bg-slate-800 border-x sm:border border-gray-100 dark:border-slate-700/60 rounded-none sm:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-500/5 relative">
                
                {/* Sidebar */}
                <aside className={`w-full md:w-85 flex-shrink-0 border-r border-gray-50 dark:border-slate-700/60 flex flex-col bg-slate-50/30 dark:bg-slate-900/40 ${isChatListVisible ? 'flex' : 'hidden md:flex'}`}>
                    
                    {/* Sidebar Header */}
                    <div className="px-7 py-7 pb-5 flex flex-col gap-5 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Messages</h2>
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Active Conversations</p>
                            </div>
                            <button
                                onClick={() => setShowNewChat(true)}
                                className="w-11 h-11 flex items-center justify-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[1.1rem] hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer shadow-xl shadow-indigo-500/5"
                                title="New message"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search conversations */}
                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search chats..." 
                                value={sidebarSearch}
                                onChange={e => setSidebarSearch(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-600 shadow-sm focus:ring-2 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>
                    </div>

                    {/* Thread List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-6">
                        {loadingThreads ? (
                            <div className="p-12 text-center animate-pulse">
                                <div className="w-10 h-10 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Sycing inbox...</p>
                            </div>
                        ) : filteredThreads.length === 0 ? (
                            <div className="p-10 text-center animate-slide-up">
                                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-5 text-4xl shadow-sm border border-gray-50 dark:border-slate-700">💭</div>
                                <p className="text-gray-900 dark:text-white font-black tracking-tight text-lg">Empty Inbox</p>
                                <p className="text-gray-400 dark:text-slate-500 text-xs mt-1 font-medium italic">Your social circle is quiet...</p>
                                <button onClick={() => setShowNewChat(true)} className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:text-indigo-500 underline cursor-pointer">Invite Someone</button>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredThreads.map(thread => (
                                    <div
                                        key={thread.id}
                                        onClick={() => openThread(thread)}
                                        className={`flex items-center gap-4 px-4 py-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 relative group ${
                                            activeThread?.user.id === thread.user.id
                                                ? 'bg-white dark:bg-slate-800 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/10'
                                                : 'hover:bg-white/60 dark:hover:bg-slate-800/40'
                                        }`}
                                    >
                                        {activeThread?.user.id === thread.user.id && (
                                            <div className="absolute left-0 w-1.5 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-r-full" />
                                        )}
                                        <div className="relative flex-shrink-0">
                                            <img
                                                src={avatarUrl(thread.user.name, thread.user.avatarUrl)}
                                                alt={thread.user.name}
                                                className="w-13 h-13 rounded-[1.1rem] object-cover shadow-sm group-hover:scale-105 transition-transform"
                                            />
                                            <span className="absolute -bottom-0.5 -right-0.5 block h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white dark:border-slate-900" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className={`text-sm truncate leading-none ${thread.unreadCount > 0 ? 'font-black text-indigo-600 dark:text-indigo-400' : 'font-bold text-gray-900 dark:text-white'}`}>
                                                    {thread.user.name}
                                                </p>
                                                <p className="text-[9px] text-gray-400 dark:text-slate-500 flex-shrink-0 font-black uppercase tracking-tighter opacity-70">{thread.timestamp}</p>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-xs truncate max-w-[140px] leading-tight ${thread.unreadCount > 0 ? 'text-gray-900 dark:text-slate-100 font-bold' : 'text-gray-400 dark:text-slate-500 font-medium'}`}>
                                                    {thread.lastMessage || 'Click to reveal chat...'}
                                                </p>
                                                {thread.unreadCount > 0 && (
                                                    <span className="bg-indigo-600 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 shadow-lg shadow-indigo-600/30 animate-pulse">
                                                        {thread.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Chat Window */}
                <main className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-800/50 relative ${isChatListVisible && 'hidden md:flex'}`}>
                    
                    {activeThread ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-7 py-5 border-b border-gray-50 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-20">
                                <div className="flex items-center gap-4">
                                    <button className="md:hidden p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all text-gray-500" onClick={() => setIsChatListVisible(true)}>
                                        <span className="text-xl">←</span>
                                    </button>
                                    <div className="relative group cursor-pointer">
                                        <img
                                            src={avatarUrl(activeThread.user.name, activeThread.user.avatarUrl)}
                                            alt={activeThread.user.name}
                                            className="w-11 h-11 rounded-[1.1rem] object-cover shadow-md group-hover:scale-105 transition-transform"
                                        />
                                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-slate-800 animate-pulse" />
                                    </div>
                                    <div className="cursor-pointer">
                                        <h2 className="font-black text-gray-900 dark:text-white text-[15px] leading-tight tracking-tight flex items-center gap-2">
                                            {activeThread.user.name}
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            {roleBadge(activeThread.user.role)}
                                            <span className="text-[9px] font-black text-green-500 uppercase tracking-[0.2em] opacity-80">Online now</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="hidden lg:flex flex-col items-end mr-2">
                                        <span className="text-[9px] font-black text-gray-300 dark:text-slate-600 uppercase tracking-widest leading-none">Global Network</span>
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 tracking-tighter mt-0.5 truncate max-w-[80px]">#{activeThread.user.id.slice(-8)}</span>
                                    </div>
                                    <button className="w-11 h-11 flex items-center justify-center rounded-2xl border border-gray-50 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all cursor-pointer">
                                        <EllipsisVerticalIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 sm:px-10 py-8 flex flex-col gap-5 bg-slate-50/20 dark:bg-slate-900/10">
                                {loadingMessages ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="w-10 h-10 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Decrypting messages...</p>
                                        </div>
                                    </div>
                                ) : activeThread.messages.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center py-16 px-10 bg-white/50 dark:bg-slate-800/50 rounded-[3rem] border border-dashed border-gray-200 dark:border-slate-700">
                                            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/10 text-5xl animate-bounce">👋</div>
                                            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Break the ice!</h3>
                                            <p className="text-xs text-gray-400 dark:text-slate-500 font-medium leading-relaxed max-w-[200px] mx-auto">Start a conversation with <strong className="text-indigo-600 dark:text-indigo-400">{activeThread.user.name}</strong> and grow your network.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {activeThread.messages.map((msg, idx) => {
                                            const isMe = msg.sender === 'me';
                                            const showAvatar = idx === 0 || activeThread.messages[idx-1].sender !== msg.sender;
                                            
                                            return (
                                                <div key={msg.id || idx} className={`flex items-end gap-3.5 group animate-zoom-in ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    {!isMe && (
                                                        <div className="w-9 h-9 flex-shrink-0">
                                                            {showAvatar && (
                                                                <img src={avatarUrl(activeThread.user.name, activeThread.user.avatarUrl)}
                                                                    className="w-9 h-9 rounded-2xl object-cover shadow-sm ring-2 ring-white dark:ring-slate-800 hover:scale-110 transition-transform" alt="" />
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className={`relative max-w-[80%] sm:max-w-[70%] lg:max-w-[55%] ${
                                                        isMe
                                                            ? 'bg-gray-900 dark:bg-indigo-600 text-white rounded-[2rem] rounded-br-[0.5rem] shadow-xl shadow-indigo-600/5'
                                                            : 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-[2rem] rounded-bl-[0.5rem] shadow-sm border border-gray-50 dark:border-slate-600/50 hover:bg-gray-50/50 dark:hover:bg-slate-700/80 transition-colors'
                                                    } px-6 py-4`}>
                                                        <p className="text-[13px] leading-relaxed font-medium whitespace-pre-wrap">{msg.text}</p>
                                                        <div className={`flex items-center justify-end gap-1.5 mt-2 ${isMe ? 'text-white/40' : 'text-gray-300 dark:text-slate-500'}`}>
                                                            <p className="text-[9px] font-black uppercase tracking-tighter">{msg.time}</p>
                                                            {isMe && (
                                                                <span className="text-[10px]">
                                                                    {msg.isRead
                                                                        ? <span className="text-sky-300 font-black">✓✓</span>
                                                                        : <span className="opacity-70">✓</span>
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isMe && (
                                                       <div className="w-4" /> /* spacer */
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Bar */}
                            <div className="px-6 sm:px-10 py-6 border-t border-gray-50 dark:border-slate-700/60 bg-white dark:bg-slate-800 flex-shrink-0 z-20">
                                <div className="flex items-end gap-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-[2rem] px-6 py-4 border border-gray-50 dark:border-slate-700 focus-within:ring-4 focus-within:ring-indigo-500/5 focus-within:border-indigo-500/30 transition-all duration-300">
                                    <textarea
                                        ref={textareaRef}
                                        rows={1}
                                        value={messageInput}
                                        onChange={handleTextareaChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type your message..."
                                        className="flex-1 bg-transparent resize-none focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-500 font-bold leading-relaxed"
                                        style={{ minHeight: '22px', maxHeight: '150px' }}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!messageInput.trim() || isSending}
                                        className={`w-12 h-12 flex items-center justify-center rounded-[1.2rem] transition-all duration-300 flex-shrink-0 shadow-lg ${
                                            !messageInput.trim() || isSending
                                                ? 'bg-gray-100 dark:bg-slate-800 text-gray-300 cursor-not-allowed shadow-none'
                                                : 'bg-gray-900 dark:bg-indigo-600 text-white hover:scale-110 active:scale-95 shadow-indigo-600/20 shadow-xl'
                                        }`}
                                    >
                                        {isSending ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <PaperAirplaneIcon className="w-5 h-5 rotate-45" />
                                        )}
                                    </button>
                                </div>
                                <div className="flex items-center justify-center gap-6 mt-3 px-2">
                                    <p className="text-[9px] text-gray-300 dark:text-slate-600 font-black uppercase tracking-[0.2em]">Enter to send</p>
                                    <p className="text-[9px] text-gray-300 dark:text-slate-600 font-black uppercase tracking-[0.2em]">Shift+Enter for break</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center relative max-w-sm">
                                <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] rounded-full scale-150" />
                                
                                <div className="relative z-10">
                                    <div className="w-32 h-32 bg-white dark:bg-slate-800 rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/5 text-6xl border border-gray-50 dark:border-slate-700 animate-pulse">
                                        <SparklesIcon className="w-16 h-16 text-indigo-500 opacity-20 absolute" />
                                        💬
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-4 leading-tight">Your Digital Workspace.</h3>
                                    <p className="text-gray-400 dark:text-slate-500 mb-10 font-bold text-sm leading-relaxed mx-auto max-w-[280px]">Connect with top student talent and visionary recruiters globally in real-time.</p>
                                    
                                    <button
                                        onClick={() => setShowNewChat(true)}
                                        className="w-full py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-black uppercase tracking-widest rounded-[1.5rem] hover:scale-[1.05] active:scale-[0.95] transition-all shadow-2xl shadow-gray-300 dark:shadow-none cursor-pointer flex items-center justify-center gap-3 mb-8"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Start a Conversation
                                    </button>
                                    
                                    <div className="p-6 bg-slate-50/50 dark:bg-slate-900/40 rounded-[2rem] border border-gray-50 dark:border-slate-700 text-left">
                                        <h4 className="text-[9px] text-gray-300 dark:text-slate-600 uppercase tracking-[0.25em] font-black mb-2">My Network ID</h4>
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="font-mono text-indigo-500 font-black select-all text-xs truncate break-all">{user?.id}</span>
                                            <button 
                                                onClick={() => { navigator.clipboard.writeText(user?.id || ''); }}
                                                className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-widest cursor-pointer whitespace-nowrap"
                                            >
                                                Copy Key
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.1); border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.3); }
                
                @keyframes zoom-in { 
                    from { opacity: 0; transform: scale(0.95) translateY(10px); } 
                    to { opacity: 1; transform: scale(1) translateY(0); } 
                }
                .animate-zoom-in { animation: zoom-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake { animation: shake 0.4s ease-in-out; }
            `}</style>
        </div>
    );
};

export default MessagesPage;
