
import React, { useEffect, useRef, useState } from 'react';
import { Page } from '../../types';
import {
    HeartIcon,
    ShareIcon,
    PaperAirplaneIcon,
    EyeIcon,
} from '../icons/Icons';
import { shortsAPI } from '../../services/api';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../../services/api';

interface ShortsPageProps {
    onApplyNow: (job: any) => void;
    onNavigateToJobDetail?: (jobId: string) => void;
    onNavigate?: (page: Page) => void;
}

// ─── ShortCard ────────────────────────────────────────────────────────────────
// Extracted into its own component so that useSwipeGesture is called at the
// top level of a component — not inside a .map() callback (Rules of Hooks).
interface ShortCardProps {
    item: any;
    index: number;
    videoRef: (el: HTMLVideoElement | null) => void;
    likedJobs: Set<string>;
    showHeartAnimation: string | null;
    showShareMenu: string | null;
    onLike: (id: string) => void;
    onShare: (item: any, platform: string) => void;
    onToggleShareMenu: (id: string | null) => void;
    onApplyNow: (item: any) => void;
    onNavigateToJobDetail?: (jobId: string) => void;
    onNavigate?: (page: Page) => void;
    onViewProfile: (authorId: string) => void;
}

const ShortCard: React.FC<ShortCardProps> = ({
    item,
    index,
    videoRef,
    likedJobs,
    showHeartAnimation,
    showShareMenu,
    onLike,
    onShare,
    onToggleShareMenu,
    onApplyNow,
    onNavigateToJobDetail,
    onNavigate,
    onViewProfile,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [connectState, setConnectState] = useState<'idle' | 'sending' | 'sent'>('idle');

    // ✅ Hook called at component top-level — this is now legal
    const swipeState = useSwipeGesture(containerRef as React.RefObject<HTMLElement>, {
        onSwipeLeft: () => {
            if (onNavigateToJobDetail) onNavigateToJobDetail(item.id);
        },
        minSwipeDistance: 50,
        minSwipeVelocity: 0.3,
    });

    const videoSrc = item.videoUrl
        ? item.videoUrl.startsWith('http')
            ? item.videoUrl
            : `${window.location.protocol}//${window.location.hostname}:3001${item.videoUrl}`
        : '';

    const isJob = item.type === 'job';

    return (
        <div
            ref={containerRef}
            data-job-id={item.id}
            className="h-full w-full flex-shrink-0 snap-start relative flex items-center justify-center"
            style={{
                transform: `translateX(${swipeState.swipeOffset}px)`,
                transition: swipeState.isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            {/* Video */}
            {videoSrc ? (
                <video
                    ref={videoRef}
                    src={videoSrc}
                    loop
                    muted
                    playsInline
                    controls={false}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // If video fails to load, hide it and show placeholder
                        (e.target as HTMLVideoElement).style.display = 'none';
                    }}
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
                    <span className="text-white/30 text-8xl">🎬</span>
                </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

            {/* Swipe Indicator */}
            {swipeState.isSwiping && swipeState.swipeOffset < -20 && (
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-4 shadow-lg z-20">
                    <div className="flex items-center gap-2">
                        <PaperAirplaneIcon className="w-6 h-6 text-indigo-600 rotate-45" />
                        <span className="text-indigo-600 font-bold">
                            {isJob ? 'Swipe to Apply' : 'Swipe for Details'}
                        </span>
                    </div>
                </div>
            )}

            {/* Heart Animation */}
            {showHeartAnimation === item.id && (
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
                    <HeartIcon className="w-40 h-40 text-red-500 animate-heart-burst" />
                </div>
            )}

            {/* Bottom Overlay */}
            <div className="absolute bottom-0 left-0 p-6 text-white w-full flex justify-between items-end drop-shadow-2xl z-10">
                {/* Left: Info */}
                <div className="w-3/4">
                    <div className="flex items-center gap-3 mb-3">
                        <img
                            src={item.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author?.name || 'A')}`}
                            alt={item.author?.name}
                            onClick={() => { if (item.author?.id) onViewProfile(item.author.id); }}
                            className="w-11 h-11 rounded-full border-2 border-white/50 object-cover cursor-pointer hover:scale-105 transition-transform"
                        />
                        <div>
                            <p onClick={() => { if (item.author?.id) onViewProfile(item.author.id); }} className="font-bold text-lg leading-tight cursor-pointer hover:underline">{item.author?.name}</p>
                            <p className="text-xs text-white/70">@{(item.author?.name || 'user').toLowerCase().replace(/\s+/g, '')}</p>
                        </div>
                        {!isJob && (
                            <button
                                onClick={() => {
                                    if (connectState !== 'idle') return;
                                    setConnectState('sending');
                                    setTimeout(() => setConnectState('sent'), 1000);
                                }}
                                className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ml-1 transition-colors ${
                                    connectState === 'sent' ? 'bg-green-600 text-white' :
                                    connectState === 'sending' ? 'bg-indigo-400 text-white' : 'bg-indigo-600/80 hover:bg-indigo-600 text-white'
                                }`}
                            >
                                {connectState === 'sent' ? 'Sent!' : connectState === 'sending' ? 'Sending...' : 'Connect'}
                            </button>
                        )}
                    </div>
                    <h2 className="text-xl font-bold mb-1 tracking-tight">{item.title}</h2>
                    <p className="text-sm line-clamp-2 text-white/90 mb-2">{item.description}</p>
                    {isJob && (
                        <div className="flex items-center gap-2">
                            <span className="font-extrabold text-green-400 text-lg">{item.pay}</span>
                            <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">Job Market Short</span>
                        </div>
                    )}
                    {/* Stats */}
                    <div className="flex items-center gap-5 mt-4 text-xs font-semibold text-white/80">
                        <div className="flex items-center gap-1.5">
                            <EyeIcon className="w-4 h-4" />
                            <span>{(item.views || 0) > 999 ? ((item.views || 0) / 1000).toFixed(1) + 'K' : (item.views || 0)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <HeartIcon className="w-4 h-4" />
                            <span>{item.likes || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <PaperAirplaneIcon className="w-4 h-4" />
                            <span>{item.comments || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex flex-col items-center gap-7 pb-4">
                    {/* Like */}
                    <button onClick={() => onLike(item.id)} className="flex flex-col items-center group">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                            likedJobs.has(item.id)
                                ? 'bg-red-500 scale-110'
                                : 'bg-white/10 backdrop-blur-md group-hover:bg-white/20 group-hover:scale-110'
                        }`}>
                            <HeartIcon className={`w-8 h-8 transition-all duration-300 ${likedJobs.has(item.id) ? 'fill-white text-white' : 'text-white'}`} />
                        </div>
                    </button>

                    {/* Share */}
                    <div className="relative">
                        <button
                            onClick={() => onToggleShareMenu(showShareMenu === item.id ? null : item.id)}
                            className="flex flex-col items-center group"
                        >
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-md group-hover:bg-white/20 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg">
                                <ShareIcon className="w-8 h-8 text-white" />
                            </div>
                        </button>
                        {showShareMenu === item.id && (
                            <div className="absolute right-16 bottom-0 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-2 space-y-1 min-w-[140px] z-50 border border-white/20">
                                <button onClick={() => onShare(item, 'whatsapp')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-800 dark:text-white text-xs font-bold">📱 WhatsApp</button>
                                <button onClick={() => onShare(item, 'twitter')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-800 dark:text-white text-xs font-bold">🐦 X / Twitter</button>
                                <button onClick={() => onShare(item, 'copy')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-800 dark:text-white text-xs font-bold">📋 Copy Link</button>
                            </div>
                        )}
                    </div>

                    {/* Apply / Navigate */}
                    <button
                        className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white p-4 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-110 hover:rotate-3"
                        onClick={() => {
                            if (isJob) {
                                if (item.jobId) onNavigateToJobDetail?.(item.jobId);
                                else onApplyNow(item);
                            }
                            else if (item.author?.id) onViewProfile(item.author.id);
                        }}
                    >
                        <PaperAirplaneIcon className="w-7 h-7 rotate-45" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── ShortsPage ───────────────────────────────────────────────────────────────
const ShortsPage: React.FC<ShortsPageProps> = ({ onApplyNow, onNavigateToJobDetail, onNavigate }) => {
    const { user } = useAuth();
    const [shorts, setShorts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const [likedJobs, setLikedJobs] = useState<Set<string>>(new Set());
    const [showHeartAnimation, setShowHeartAnimation] = useState<string | null>(null);
    const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
    const [showHint, setShowHint] = useState<boolean>(() => {
        return !localStorage.getItem('shortsSwipeHintSeen');
    });

    const [viewingProfile, setViewingProfile] = useState<any>(null);
    const [viewingStats, setViewingStats] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const viewedRefs = useRef<Set<string>>(new Set());
    const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001/api';

    const handleViewProfile = async (authorId: string) => {
        if (!authorId) return;
        setLoadingProfile(true);
        try {
            const data = await fetchWithAuth(`${API_BASE}/users/${authorId}`);
            setViewingProfile(data.user || data);
            setViewingStats(data.stats);
        } catch {
            // fallback generic profile info if failing
            setViewingProfile({ id: authorId, name: 'Candidate', role: 'student' });
        }
        setLoadingProfile(false);
    };

    // Load feed
    useEffect(() => {
        const loadFeed = async () => {
            try {
                setIsLoading(true);
                const feed = await shortsAPI.getFeed();
                setShorts(Array.isArray(feed) ? feed : []);
            } catch (error) {
                console.error('Failed to load shorts feed:', error);
                setShorts([]);
            } finally {
                setIsLoading(false);
            }
        };
        loadFeed();
    }, []);

    // Auto-play on scroll intersection
    useEffect(() => {
        if (shorts.length === 0) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const video = entry.target as HTMLVideoElement;
                    if (entry.isIntersecting) {
                        video.play().catch(() => {});
                        const id = video.dataset.id || video.getAttribute('data-id');
                        if (id && !viewedRefs.current.has(id)) {
                            viewedRefs.current.add(id);
                            setShorts(prev => prev.map(s => s.id === id ? { ...s, views: (s.views || 0) + 1 } : s));
                        }
                    } else {
                        video.pause();
                        video.currentTime = 0;
                    }
                });
            },
            { threshold: 0.5 }
        );
        const refs = videoRefs.current;
        refs.forEach(v => { if (v) observer.observe(v); });
        return () => { refs.forEach(v => { if (v) observer.unobserve(v); }); };
    }, [shorts]);

    // Arrow key navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && onNavigateToJobDetail) {
                const el = document.querySelector('[data-job-id]') as HTMLElement;
                if (el) onNavigateToJobDetail(el.getAttribute('data-job-id') || '');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNavigateToJobDetail]);

    // Dismiss hint after 3s
    useEffect(() => {
        if (!showHint) return;
        const t = setTimeout(() => {
            setShowHint(false);
            localStorage.setItem('shortsSwipeHintSeen', 'true');
        }, 3000);
        return () => clearTimeout(t);
    }, [showHint]);

    const handleLike = (id: string) => {
        setLikedJobs(prev => {
            const next = new Set(prev);
            if (next.has(id)) { 
                next.delete(id); 
                setShorts(prevShorts => prevShorts.map(s => s.id === id ? { ...s, likes: Math.max(0, (s.likes || 0) - 1) } : s));
            }
            else {
                next.add(id);
                setShorts(prevShorts => prevShorts.map(s => s.id === id ? { ...s, likes: (s.likes || 0) + 1 } : s));
                setShowHeartAnimation(id);
                setTimeout(() => setShowHeartAnimation(null), 1000);
            }
            return next;
        });
    };

    const handleShare = (item: any, platform: string) => {
        const url = `${window.location.origin}/shorts/${item.id}`;
        const text = `Check out this on RapidGig: ${item.title}`;
        if (platform === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        else if (platform === 'twitter') window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        else if (platform === 'copy') { navigator.clipboard.writeText(url); alert('Link copied!'); }
        setShowShareMenu(null);
    };

    // ── Render ──
    if (isLoading) {
        return (
            <div className="h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center bg-black text-white">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-lg font-semibold animate-pulse">Personalizing your feed...</p>
            </div>
        );
    }

    if (shorts.length === 0) {
        return (
            <div className="h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center bg-black text-white p-8 text-center">
                <div className="text-6xl mb-4">📺</div>
                <h2 className="text-2xl font-bold mb-2">No Shorts Yet</h2>
                <p className="text-slate-400 max-w-sm">
                    {user?.isRecruiter
                        ? 'Check back later to see candidate introductions.'
                        : 'Follow some companies to see their job marketing shorts.'}
                </p>
                <p className="text-slate-500 text-sm mt-4">
                    {user?.isRecruiter
                        ? 'Upload a short job video to attract candidates!'
                        : 'Upload an intro video so recruiters can discover you!'}
                </p>
            </div>
        );
    }

    const avatarUrl = (name?: string, url?: string) =>
        url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&size=80&background=6366f1&color=fff`;

    return (
        <div className="relative h-[calc(100vh-64px)] w-full overflow-y-auto snap-y snap-mandatory scroll-smooth bg-black">
            {/* Profile Drawer */}
            {viewingProfile && (
                <div className="fixed inset-0 z-[60] flex justify-end">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingProfile(null)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl animate-slide-in">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-36 relative">
                            <button
                                onClick={() => setViewingProfile(null)}
                                className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                            >✕</button>
                        </div>
                        <div className="px-6 pb-8 -mt-12">
                            <div className="flex items-end gap-4 mb-4">
                                <img src={avatarUrl(viewingProfile.name, viewingProfile.avatarUrl)} alt={viewingProfile.name} className="w-20 h-20 rounded-2xl ring-4 ring-white dark:ring-slate-900 object-cover shadow-lg" />
                                <div className="pb-1">
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{viewingProfile.name}</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{viewingProfile.title || (viewingProfile.role === 'recruiter' ? 'Recruiter' : 'Student')}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Contact Info</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-400">📧</span>
                                            <span className="text-slate-700 dark:text-slate-300">{viewingProfile.email || 'Contact via message'}</span>
                                        </div>
                                    </div>
                                </div>
                                {loadingProfile ? (
                                    <div className="text-center py-6 text-slate-400 text-sm">Loading stats...</div>
                                ) : viewingStats && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 text-center">
                                            <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{viewingStats.applicationsSent ?? 0}</p>
                                            <p className="text-xs text-indigo-500 dark:text-indigo-300 mt-1">Applications</p>
                                        </div>
                                        <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4 text-center">
                                            <p className="text-3xl font-extrabold text-pink-600 dark:text-pink-400">{viewingStats.videosUploaded ?? 0}</p>
                                            <p className="text-xs text-pink-500 dark:text-pink-300 mt-1">Videos</p>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        setViewingProfile(null);
                                        if (onNavigate) onNavigate('messages');
                                    }}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                    💬 Message {viewingProfile.name?.split(' ')[0]}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Swipe Hint */}
            {showHint && (
                <div
                    className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl cursor-pointer"
                    onClick={() => { setShowHint(false); localStorage.setItem('shortsSwipeHintSeen', 'true'); }}
                >
                    <div className="flex flex-col items-center gap-3 max-w-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-4xl">👈</span>
                            <PaperAirplaneIcon className="w-8 h-8 text-indigo-600 rotate-45" />
                        </div>
                        <p className="text-center text-lg font-bold text-slate-800">
                            {user?.isRecruiter ? 'Swipe left to view info!' : 'Swipe left to apply!'}
                        </p>
                        <p className="text-center text-sm text-slate-600">Or press ← arrow key</p>
                        <button className="text-xs text-slate-400 hover:text-slate-600 mt-2">Got it</button>
                    </div>
                </div>
            )}

            {/* ✅ Each card is now its own component — hooks are called legally */}
            {shorts.map((item, index) => (
                <ShortCard
                    key={item.id || index}
                    item={item}
                    index={index}
                    videoRef={(el) => { videoRefs.current[index] = el; }}
                    likedJobs={likedJobs}
                    showHeartAnimation={showHeartAnimation}
                    showShareMenu={showShareMenu}
                    onLike={handleLike}
                    onShare={handleShare}
                    onToggleShareMenu={setShowShareMenu}
                    onApplyNow={onApplyNow}
                    onNavigateToJobDetail={onNavigateToJobDetail}
                    onNavigate={onNavigate}
                    onViewProfile={handleViewProfile}
                />
            ))}
        </div>
    );
};

export default ShortsPage;
