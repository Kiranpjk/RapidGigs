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

            setThreads(prev => prev.map(thread => {
                if (thread.user.id === data.senderId) {
                    const newMsg: Msg = { id: Date.now().toString(), sender: 'them', text: data.message, time: timeStr };
                    return { ...thread, lastMessage: data.message, timestamp: 'Just now', unreadCount: thread.unreadCount + 1, messages: [...thread.messages, newMsg] };
                }
                return thread;
            }));

            setActiveThread(prev => {
                if (prev && prev.user.id === data.senderId) {
                    const newMsg: Msg = { id: Date.now().toString(), sender: 'them', text: data.message, time: timeStr };
                    return { ...prev, messages: [...prev.messages, newMsg] };
                }
                return prev;
            });
        });

        return () => { socket.current?.disconnect(); };
    }, [user]);

    useEffect(() => { loadThreads(); }, []);

    const loadThreads = async () => {
        setLoadingThreads(true);
        try {
            const data = await messagesAPI.getThreads();
            const loaded = Array.isArray(data) ? data.map((t: any) => ({
                id: t.id || t.user?.id,
                user: { id: t.user?.id, name: t.user?.name, avatarUrl: t.user?.avatarUrl, role: t.user?.role },
                lastMessage: t.lastMessage || '',
                timestamp: t.timestamp || '',
                unreadCount: t.unreadCount || 0,
                messages: [],
            })) : [];
            setThreads(loaded);
            if (loaded.length > 0 && !activeThread) openThread(loaded[0]);
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
        setThreads(prev => prev.map(t =>
            t.user.id === activeThread.user.id ? { ...t, lastMessage: text, timestamp: 'Just now' } : t
        ));

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
                lastMessage: '', timestamp: '', unreadCount: 0, messages: [],
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
        url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&size=48&background=6366f1&color=fff`;

    const roleBadge = (role?: string) => {
        if (role === 'recruiter') return <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 px-2 py-0.5 rounded-lg">Recruiter</span>;
        if (role === 'student') return <span className="text-[10px] font-black uppercase tracking-widest bg-green-50 dark:bg-green-900/20 text-green-500 px-2 py-0.5 rounded-lg">Student</span>;
        return null;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-slide-up">
            {/* New Chat Modal */}
            {showNewChat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl shadow-gray-200/50 dark:shadow-black/30 w-full max-w-md p-8 border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">New Message</h3>
                            <button onClick={() => { setShowNewChat(false); setSearchQuery(''); setSearchResult(null); setSearchError(''); }}
                                className="w-9 h-9 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all cursor-pointer">
                                <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
                            Enter a <strong className="text-gray-900 dark:text-white">User ID</strong> or <strong className="text-gray-900 dark:text-white">Email</strong> to start a conversation.
                        </p>

                        <div className="flex gap-3 mb-5">
                            <input
                                type="text"
                                placeholder="User ID or email..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-600"
                            />
                            <button
                                onClick={handleSearch}
                                disabled={searching || !searchQuery.trim()}
                                className="px-5 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-40 disabled:scale-100 cursor-pointer shadow-lg shadow-gray-200 dark:shadow-none"
                            >
                                {searching ? '...' : 'Find'}
                            </button>
                        </div>

                        {searchError && (
                            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20 rounded-2xl px-4 py-3 mb-4 font-medium">
                                {searchError}
                            </div>
                        )}

                        {searchResult && (
                            <div className="border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4 bg-gray-50 dark:bg-slate-900/50 mb-4">
                                <img src={avatarUrl(searchResult.name, searchResult.avatarUrl)} alt={searchResult.name}
                                    className="w-12 h-12 rounded-2xl object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900 dark:text-white truncate">{searchResult.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{searchResult.email}</p>
                                    <div className="mt-1">{roleBadge(searchResult.role)}</div>
                                </div>
                                <button
                                    onClick={() => startChatWith(searchResult)}
                                    className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold rounded-2xl hover:scale-[1.02] transition-all cursor-pointer shadow-lg shadow-gray-200 dark:shadow-none"
                                >
                                    Message
                                </button>
                            </div>
                        )}

                        <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700">
                            <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                                💡 Your User ID — share it so others can find you:<br />
                                <span className="font-mono text-indigo-500 select-all text-xs break-all mt-1 block">{user?.id}</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Chat Container */}
            <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-[2rem] overflow-hidden shadow-sm">

                {/* Sidebar */}
                <aside className={`w-full md:w-80 flex-shrink-0 border-r border-gray-50 dark:border-slate-700/60 flex flex-col ${isChatListVisible ? 'flex' : 'hidden md:flex'}`}>
                    {/* Sidebar Header */}
                    <div className="px-6 py-5 border-b border-gray-50 dark:border-slate-700/60 flex items-center justify-between flex-shrink-0">
                        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Messages</h2>
                        <button
                            onClick={() => setShowNewChat(true)}
                            className="w-9 h-9 flex items-center justify-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl hover:scale-110 transition-all cursor-pointer shadow-lg shadow-gray-200 dark:shadow-none"
                            title="New message"
                        >
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Thread List */}
                    <div className="flex-1 overflow-y-auto">
                        {loadingThreads ? (
                            <div className="p-10 text-center">
                                <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm text-gray-400 font-medium">Loading...</p>
                            </div>
                        ) : threads.length === 0 ? (
                            <div className="p-10 text-center">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-4 text-2xl">💬</div>
                                <p className="text-gray-900 dark:text-white font-bold mb-1">No messages yet</p>
                                <p className="text-gray-400 dark:text-slate-500 text-sm">Click + to start a conversation</p>
                            </div>
                        ) : (
                            threads.map(thread => (
                                <div
                                    key={thread.id}
                                    onClick={() => openThread(thread)}
                                    className={`flex items-center gap-3.5 px-5 py-4 cursor-pointer transition-all ${
                                        activeThread?.user.id === thread.user.id
                                            ? 'bg-gray-50 dark:bg-slate-700/50'
                                            : 'hover:bg-gray-50/60 dark:hover:bg-slate-700/30'
                                    }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <img
                                            src={avatarUrl(thread.user.name, thread.user.avatarUrl)}
                                            alt={thread.user.name}
                                            className="w-12 h-12 rounded-2xl object-cover"
                                        />
                                        <span className="absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full bg-green-400 ring-2 ring-white dark:ring-slate-800" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                            <p className={`text-sm truncate ${thread.unreadCount > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-700 dark:text-slate-200'}`}>
                                                {thread.user.name}
                                            </p>
                                            <p className="text-[10px] text-gray-400 dark:text-slate-500 flex-shrink-0 font-medium">{thread.timestamp}</p>
                                        </div>
                                        <div className="flex items-center justify-between gap-1">
                                            <p className={`text-xs truncate ${thread.unreadCount > 0 ? 'text-gray-700 dark:text-slate-300 font-medium' : 'text-gray-400 dark:text-slate-500'}`}>
                                                {thread.lastMessage || 'Start a conversation'}
                                            </p>
                                            {thread.unreadCount > 0 && (
                                                <span className="bg-indigo-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">
                                                    {thread.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* Chat Window */}
                <main className={`flex-1 flex flex-col min-w-0 ${isChatListVisible && 'hidden md:flex'}`}>
                    {activeThread ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-gray-50 dark:border-slate-700/60 bg-white dark:bg-slate-800 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <button className="md:hidden p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all" onClick={() => setIsChatListVisible(true)}>
                                        <span className="text-gray-500 text-lg">←</span>
                                    </button>
                                    <div className="relative">
                                        <img
                                            src={avatarUrl(activeThread.user.name, activeThread.user.avatarUrl)}
                                            alt={activeThread.user.name}
                                            className="w-10 h-10 rounded-2xl object-cover"
                                        />
                                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white dark:ring-slate-800" />
                                    </div>
                                    <div>
                                        <h2 className="font-extrabold text-gray-900 dark:text-white text-sm leading-none tracking-tight">{activeThread.user.name}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            {roleBadge(activeThread.user.role)}
                                            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">● Online</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-300 dark:text-slate-600 font-mono hidden sm:block">ID: {activeThread.user.id.slice(-8)}</span>
                                    <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all cursor-pointer">
                                        <EllipsisVerticalIcon className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-3 bg-gray-50/50 dark:bg-slate-900/20">
                                {loadingMessages ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                            <p className="text-sm text-gray-400 font-medium">Loading messages...</p>
                                        </div>
                                    </div>
                                ) : activeThread.messages.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center py-12">
                                            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm text-4xl">👋</div>
                                            <p className="font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Say hello to {activeThread.user.name}!</p>
                                            <p className="text-sm text-gray-400 dark:text-slate-500">This is the start of your conversation.</p>
                                        </div>
                                    </div>
                                ) : (
                                    activeThread.messages.map((msg, idx) => {
                                        const isMe = msg.sender === 'me';
                                        return (
                                            <div key={msg.id || idx} className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                {!isMe && (
                                                    <img src={avatarUrl(activeThread.user.name, activeThread.user.avatarUrl)}
                                                        className="w-8 h-8 rounded-xl object-cover flex-shrink-0 mb-1" alt="" />
                                                )}
                                                <div className={`max-w-xs sm:max-w-sm lg:max-w-md ${
                                                    isMe
                                                        ? 'bg-gray-900 dark:bg-indigo-600 text-white rounded-3xl rounded-br-lg'
                                                        : 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-3xl rounded-bl-lg shadow-sm border border-gray-50 dark:border-slate-600'
                                                } px-5 py-3`}>
                                                    <p className="text-sm leading-relaxed">{msg.text}</p>
                                                    <div className={`flex items-center justify-end gap-1 mt-1.5 ${isMe ? 'text-white/50' : 'text-gray-300 dark:text-slate-500'}`}>
                                                        <p className="text-[10px] font-medium">{msg.time}</p>
                                                        {isMe && (
                                                            <span className="text-[10px]">
                                                                {msg.isRead
                                                                    ? <span className="text-sky-300">✓✓</span>
                                                                    : <span className="opacity-70">✓</span>
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Bar */}
                            <div className="px-5 py-4 border-t border-gray-50 dark:border-slate-700/60 bg-white dark:bg-slate-800 flex-shrink-0">
                                <div className="flex items-end gap-3 bg-gray-50 dark:bg-slate-900/50 rounded-3xl px-5 py-3 border border-gray-100 dark:border-slate-700">
                                    <textarea
                                        ref={textareaRef}
                                        rows={1}
                                        value={messageInput}
                                        onChange={handleTextareaChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Message..."
                                        className="flex-1 bg-transparent resize-none focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-600 font-medium leading-relaxed"
                                        style={{ minHeight: '24px', maxHeight: '120px' }}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!messageInput.trim() || isSending}
                                        className="w-9 h-9 flex items-center justify-center bg-gray-900 dark:bg-indigo-600 text-white rounded-2xl hover:scale-110 transition-all disabled:opacity-30 disabled:scale-100 cursor-pointer flex-shrink-0"
                                    >
                                        <PaperAirplaneIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-300 dark:text-slate-600 mt-2 px-2 font-bold uppercase tracking-widest text-center">
                                    Enter to send · Shift+Enter for new line
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-gray-50/30 dark:bg-slate-900/10">
                            <div className="text-center py-12 px-8">
                                <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-4xl flex items-center justify-center mx-auto mb-6 shadow-sm text-5xl border border-gray-100 dark:border-slate-700">💬</div>
                                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Your Messages</h3>
                                <p className="text-gray-400 dark:text-slate-500 mb-8 max-w-xs text-sm leading-relaxed">Connect with students and recruiters. Find someone to start a conversation.</p>
                                <button
                                    onClick={() => setShowNewChat(true)}
                                    className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl hover:scale-[1.02] transition-all shadow-xl shadow-gray-200 dark:shadow-none cursor-pointer"
                                >
                                    Start a Conversation
                                </button>
                                <div className="mt-6 p-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-left">
                                    <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-widest font-bold mb-1">Your User ID</p>
                                    <span className="font-mono text-indigo-500 select-all text-xs break-all">{user?.id}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default MessagesPage;
