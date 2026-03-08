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
    BellIcon,
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

    // Scroll to bottom of chat
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
                    return {
                        ...thread,
                        lastMessage: data.message,
                        timestamp: 'Just now',
                        unreadCount: thread.unreadCount + 1,
                        messages: [...thread.messages, newMsg],
                    };
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

        return () => {
            socket.current?.disconnect();
        };
    }, [user]);

    // Load threads on mount
    useEffect(() => {
        loadThreads();
    }, []);

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
            if (loaded.length > 0 && !activeThread) {
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
                id: m.id,
                sender: m.sender,
                text: m.text,
                time: m.time,
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
        setIsSending(true);

        const optimisticMsg: Msg = {
            id: `optimistic-${Date.now()}`,
            sender: 'me',
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        // Optimistic update
        setActiveThread(t => t ? { ...t, messages: [...t.messages, optimisticMsg] } : t);
        setThreads(prev => prev.map(t =>
            t.user.id === activeThread.user.id ? { ...t, lastMessage: text, timestamp: 'Just now' } : t
        ));

        try {
            await messagesAPI.send(activeThread.user.id, text);
            // Also emit via socket for real-time
            socket.current?.emit('send-message', {
                receiverId: activeThread.user.id,
                message: text,
                senderId: user?.id,
            });
        } catch {
            // Remove optimistic message on failure
            setActiveThread(t => t ? { ...t, messages: t.messages.filter(m => m.id !== optimisticMsg.id) } : t);
        }
        setIsSending(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Search user by ID or email
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
                lastMessage: '',
                timestamp: '',
                unreadCount: 0,
                messages: [],
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
        if (role === 'recruiter') return <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">Recruiter</span>;
        if (role === 'student') return <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full">Student</span>;
        return null;
    };

    return (
        <div className="container mx-auto p-4">
            {/* New Chat Modal */}
            {showNewChat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Start a New Chat</h3>
                            <button onClick={() => { setShowNewChat(false); setSearchQuery(''); setSearchResult(null); setSearchError(''); }}
                                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                                <XMarkIcon className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            Enter a user's <strong>User ID</strong> or <strong>Email Address</strong> to find them and start a conversation.
                        </p>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="User ID or email address..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                className="flex-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                onClick={handleSearch}
                                disabled={searching || !searchQuery.trim()}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                                {searching ? '...' : 'Search'}
                            </button>
                        </div>

                        {searchError && (
                            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mb-3">
                                {searchError}
                            </div>
                        )}

                        {searchResult && (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-3">
                                <img src={avatarUrl(searchResult.name, searchResult.avatarUrl)} alt={searchResult.name}
                                    className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-200 dark:ring-indigo-700" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 dark:text-white truncate">{searchResult.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{searchResult.email}</p>
                                    {searchResult.title && <p className="text-xs text-slate-400 truncate">{searchResult.title}</p>}
                                    <div className="mt-1">{roleBadge(searchResult.role)}</div>
                                </div>
                                <button
                                    onClick={() => startChatWith(searchResult)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                                >
                                    Message
                                </button>
                            </div>
                        )}

                        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                💡 <strong>Tip:</strong> Share your User ID with others so they can find you.<br />
                                Your ID: <span className="font-mono text-indigo-500 dark:text-indigo-400 select-all text-xs">{user?.id}</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex h-[calc(100vh-88px)] bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-lg">
                {/* Chat List Sidebar */}
                <aside className={`w-full md:w-72 lg:w-80 flex-shrink-0 bg-white dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700/50 flex-col ${isChatListVisible ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Messages</h2>
                            <button
                                onClick={() => setShowNewChat(true)}
                                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                                title="Start new chat"
                            >
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loadingThreads ? (
                            <div className="p-8 text-center text-slate-400">
                                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                                Loading conversations...
                            </div>
                        ) : threads.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="text-4xl mb-3">💬</div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">No conversations yet</p>
                                <p className="text-slate-400 dark:text-slate-500 text-xs">Click + to start a new chat</p>
                            </div>
                        ) : (
                            threads.map(thread => (
                                <div
                                    key={thread.id}
                                    onClick={() => openThread(thread)}
                                    className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700/30 ${activeThread?.user.id === thread.user.id
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                        }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <img
                                            src={avatarUrl(thread.user.name, thread.user.avatarUrl)}
                                            alt={thread.user.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-slate-800"></span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{thread.user.name}</p>
                                            <p className="text-xs text-slate-400 flex-shrink-0">{thread.timestamp}</p>
                                        </div>
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{thread.lastMessage || 'Start a conversation'}</p>
                                            {thread.unreadCount > 0 && (
                                                <span className="bg-indigo-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">
                                                    {thread.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-0.5">{roleBadge(thread.user.role)}</div>
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
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <button className="md:hidden p-1" onClick={() => setIsChatListVisible(true)}>
                                        <span className="text-slate-500">←</span>
                                    </button>
                                    <div className="relative">
                                        <img
                                            src={avatarUrl(activeThread.user.name, activeThread.user.avatarUrl)}
                                            alt={activeThread.user.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-1 ring-white dark:ring-slate-800"></span>
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-800 dark:text-white leading-none">{activeThread.user.name}</h2>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {roleBadge(activeThread.user.role)}
                                            <span className="text-xs text-green-500">● Online</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <span className="font-mono hidden sm:block">ID: {activeThread.user.id.slice(-8)}</span>
                                    <EllipsisVerticalIcon className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-600" />
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-3 bg-slate-50 dark:bg-gray-900/30">
                                {loadingMessages ? (
                                    <div className="flex-1 flex items-center justify-center text-slate-400">
                                        <div className="text-center">
                                            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                                            Loading messages...
                                        </div>
                                    </div>
                                ) : activeThread.messages.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center py-12">
                                            <div className="text-5xl mb-4">👋</div>
                                            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Say hello to {activeThread.user.name}!</p>
                                            <p className="text-sm text-slate-400">This is the beginning of your conversation.</p>
                                        </div>
                                    </div>
                                ) : (
                                    activeThread.messages.map((msg, idx) => {
                                        const isMe = msg.sender === 'me';
                                        return (
                                            <div key={msg.id || idx} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                {!isMe && (
                                                    <img src={avatarUrl(activeThread.user.name, activeThread.user.avatarUrl)}
                                                        className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
                                                )}
                                                <div className={`max-w-xs sm:max-w-md lg:max-w-lg ${isMe
                                                    ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
                                                    : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl rounded-bl-sm shadow-sm'
                                                    } px-4 py-2.5`}
                                                >
                                                    <p className="text-sm leading-relaxed">{msg.text}</p>
                                                    <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                        <p className="text-xs">{msg.time}</p>
                                                        {isMe && (
                                                            <span className="text-xs" title={msg.isRead ? 'Read' : 'Sent'}>
                                                                {msg.isRead
                                                                    ? <span className="text-sky-300" title="Read">✓✓</span>
                                                                    : <span className="opacity-70" title="Sent">✓</span>
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

                            {/* Input */}
                            <div className="p-3 md:p-4 border-t border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 flex-shrink-0">
                                <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-700 rounded-xl p-1.5">
                                    <textarea
                                        rows={1}
                                        value={messageInput}
                                        onChange={e => setMessageInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type a message... (Enter to send)"
                                        className="flex-1 bg-transparent resize-none focus:outline-none px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 max-h-32"
                                        style={{ minHeight: '40px' }}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!messageInput.trim() || isSending}
                                        className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-all flex-shrink-0"
                                    >
                                        <PaperAirplaneIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5 px-1">Press <kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">Enter</kbd> to send · <kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">Shift+Enter</kbd> for new line</p>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-gray-900/30">
                            <div className="text-center py-12 px-6">
                                <div className="text-6xl mb-6">💬</div>
                                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Your Messages</h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-xs">Connect with students and recruiters. Find someone by their ID or email to start chatting.</p>
                                <button
                                    onClick={() => setShowNewChat(true)}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                    Start a New Conversation
                                </button>
                                <div className="mt-6 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        🆔 Your User ID<br />
                                        <span className="font-mono text-indigo-500 dark:text-indigo-400 select-all text-xs break-all">{user?.id}</span>
                                    </p>
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
