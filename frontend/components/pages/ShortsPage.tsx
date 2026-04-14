
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Job, Page } from '../../types';
import {
    BookmarkIcon,
    HeartIcon,
    ShareIcon,
    PaperAirplaneIcon,
    EyeIcon,
} from '../icons/Icons';
import { shortsAPI } from '../../services/api';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useAuth } from '../../context/AuthContext';
import { useJobs } from '../../context/JobContext';
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
    isSaved: boolean;
    onLike: (id: string) => void;
    onShare: (item: any, platform: string) => void;
    onToggleShareMenu: (id: string | null) => void;
    onToggleSave: (item: any) => void;
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
    isSaved,
    onLike,
    onShare,
    onToggleShareMenu,
    onToggleSave,
    onApplyNow,
    onNavigateToJobDetail,
    onNavigate,
    onViewProfile,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [connectState, setConnectState] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // ✅ Hook called at component top-level — this is now legal
    const swipeState = useSwipeGesture(containerRef as React.RefObject<HTMLElement>, {
        onSwipeLeft: () => {
            if (isJob) {
                if (item.jobId) onNavigateToJobDetail?.(item.jobId);
                else onApplyNow(item);
            }
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
            data-job-id={item.jobId || item.id}
            className="h-full w-full flex-shrink-0 snap-start relative flex items-center justify-center"
            style={{
                transform: `translateX(${swipeState.swipeOffset}px)`,
                transition: swipeState.isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            <div className="relative h-full w-full flex items-center justify-center px-0 sm:px-2 py-0">
                {/* Use object-contain so the video keeps aspect ratio and fits viewport */}
                <div className="relative h-full w-full max-w-[560px]">
                    {videoSrc ? (
                        <video
                            ref={videoRef}
                            src={videoSrc}
                            loop
                            muted
                            playsInline
                            controls={false}
                            className="w-full h-full object-cover rounded-none sm:rounded-2xl bg-black"
                            onError={(e) => {
                                // If video fails to load, hide it and show placeholder
                                (e.target as HTMLVideoElement).style.display = 'none';
                            }}
                        />
                    ) : (
                        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
                            <span className="text-white/30 text-8xl">🎬</span>
                        </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/80 via-transparent to-black/30" />

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

                    {/* Bottom Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white w-full flex justify-between items-end drop-shadow-2xl z-10 transition-all duration-300 min-h-[200px] pr-24 pl-4">
                        {/* Left: Info */}
                        <div className="flex-1 min-w-0 pr-4">
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
                            <button
                                type="button"
                                onClick={() => setIsDescriptionExpanded(prev => !prev)}
                                className={`text-left text-sm text-white/90 mb-1 ${isDescriptionExpanded ? '' : 'line-clamp-2'}`}
                            >
                                {item.description}
                            </button>
                            {(item.description || '').length > 90 && (
                                <button
                                    type="button"
                                    onClick={() => setIsDescriptionExpanded(prev => !prev)}
                                    className="text-xs font-semibold text-indigo-200 hover:text-white mb-2"
                                >
                                    {isDescriptionExpanded ? 'Show less' : 'Show more'}
                                </button>
                            )}
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

                    </div>

                    {/* Bottom-right direct actions: Like, Share, Save */}
                    <div className="absolute right-4 bottom-6 z-30 flex flex-col items-center gap-2">
                        <button
                            onClick={() => onLike(item.id)}
                            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                                likedJobs.has(item.id)
                                    ? 'bg-red-500 scale-110'
                                    : 'bg-white/15 backdrop-blur-md hover:bg-white/25'
                            }`}
                            aria-label="Like"
                        >
                            {showHeartAnimation === item.id && (
                                <span className="absolute w-11 h-11 rounded-full bg-red-400/60 animate-ping" />
                            )}
                            <HeartIcon className={`w-6 h-6 ${likedJobs.has(item.id) ? 'fill-white text-white' : 'text-white'}`} />
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => onToggleShareMenu(showShareMenu === item.id ? null : item.id)}
                                className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 flex items-center justify-center shadow-lg"
                                aria-label="Share"
                            >
                                <ShareIcon className="w-6 h-6 text-white" />
                            </button>
                            {showShareMenu === item.id && (
                                <div className="absolute left-14 -top-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-2 space-y-1 min-w-[140px] z-50 border border-white/20">
                                    <button onClick={() => onShare(item, 'whatsapp')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-800 dark:text-white text-xs font-bold">📱 WhatsApp</button>
                                    <button onClick={() => onShare(item, 'twitter')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-800 dark:text-white text-xs font-bold">🐦 X / Twitter</button>
                                    <button onClick={() => onShare(item, 'copy')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-800 dark:text-white text-xs font-bold">📋 Copy Link</button>
                                </div>
                            )}
                        </div>

                        {isJob && (
                            <button
                                onClick={() => onToggleSave(item)}
                                className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                                    isSaved ? 'bg-emerald-500' : 'bg-white/15 backdrop-blur-md hover:bg-white/25'
                                }`}
                                aria-label={isSaved ? 'Unsave job' : 'Save job'}
                            >
                                <BookmarkIcon className="w-6 h-6 text-white" />
                            </button>
                        )}

                        <button
                            className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white flex items-center justify-center shadow-lg transition-all duration-300 transform hover:scale-105"
                            onClick={() => {
                                if (isJob) {
                                    if (item.jobId) onNavigateToJobDetail?.(item.jobId);
                                    else onApplyNow(item);
                                }
                                else if (item.author?.id) onViewProfile(item.author.id);
                            }}
                            aria-label="Apply or view details"
                        >
                            <PaperAirplaneIcon className="w-6 h-6 rotate-45" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── ShortsPage ───────────────────────────────────────────────────────────────
const ShortsPage: React.FC<ShortsPageProps> = ({ onApplyNow, onNavigateToJobDetail, onNavigate }) => {
    const { user } = useAuth();
    const { saveJob, unsaveJob, isJobSaved } = useJobs();
    const [shorts, setShorts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
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
    const loopedShorts = useMemo(
        () => (shorts.length > 1 ? [...shorts, ...shorts, ...shorts] : shorts),
        [shorts]
    );

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
        if (loopedShorts.length === 0) return;
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
    }, [loopedShorts]);

    // Start in the middle segment so users can scroll both directions infinitely.
    useEffect(() => {
        if (shorts.length <= 1) return;
        const container = scrollContainerRef.current;
        if (!container) return;
        const t = setTimeout(() => {
            container.scrollTop = container.clientHeight * shorts.length;
        }, 0);
        return () => clearTimeout(t);
    }, [shorts.length]);

    const handleLoopScroll = () => {
        if (shorts.length <= 1) return;
        const container = scrollContainerRef.current;
        if (!container) return;

        const pageHeight = container.clientHeight;
        const segmentHeight = pageHeight * shorts.length;
        const topThreshold = segmentHeight - pageHeight / 2;
        const bottomThreshold = segmentHeight * 2 + pageHeight / 2;

        if (container.scrollTop < topThreshold) {
            container.scrollTop += segmentHeight;
        } else if (container.scrollTop > bottomThreshold) {
            container.scrollTop -= segmentHeight;
        }
    };

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

    const handleToggleSave = (item: any) => {
        const jobId = String(item.jobId || item.id);
        if (!jobId) return;

        if (isJobSaved(jobId)) {
            unsaveJob(jobId);
            return;
        }

        const normalizedType: Job['type'] = item.type === 'On-site' || item.type === 'Hybrid' || item.type === 'Remote'
            ? item.type
            : 'Remote';

        const jobToSave: Job = {
            id: jobId,
            title: item.title || 'Untitled job',
            company: item.company || item.author?.name || 'Unknown company',
            location: item.location || 'Remote',
            type: normalizedType,
            pay: item.pay || 'Not specified',
            description: item.description || '',
            postedAgo: item.postedAgo || 'Recently',
            category: item.category,
            shortVideoUrl: item.videoUrl || item.shortVideoUrl,
            likes: item.likes,
            comments: item.comments,
            shares: item.shares,
        };

        saveJob(jobToSave);
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
        <div
            ref={scrollContainerRef}
            onScroll={handleLoopScroll}
            className="relative h-[calc(100vh-64px)] w-full overflow-y-auto snap-y snap-mandatory scroll-smooth bg-black"
        >
            {/* Profile Drawer */}
            {viewingProfile && (
                <div className="fixed inset-0 z-[60] flex justify-end">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingProfile(null)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 mt-4 mb-4 mr-0 sm:mr-4 rounded-2xl max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl animate-slide-in">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-28 relative rounded-t-2xl">
                            <button
                                onClick={() => setViewingProfile(null)}
                                className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                            >✕</button>
                        </div>
                        <div className="px-6 pt-4 pb-6">
                            <div className="flex items-center gap-4 mb-4">
                                <img src={avatarUrl(viewingProfile.name, viewingProfile.avatarUrl)} alt={viewingProfile.name} className="w-16 h-16 rounded-2xl ring-4 ring-white dark:ring-slate-900 object-cover shadow-lg" />
                                <div>
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
            {loopedShorts.map((item, index) => (
                <ShortCard
                    key={`${item.id || 'short'}-${index}`}
                    item={item}
                    index={index}
                    videoRef={(el) => { videoRefs.current[index] = el; }}
                    likedJobs={likedJobs}
                    showHeartAnimation={showHeartAnimation}
                    showShareMenu={showShareMenu}
                    isSaved={item.type === 'job' && isJobSaved(String(item.jobId || item.id))}
                    onLike={handleLike}
                    onShare={handleShare}
                    onToggleShareMenu={setShowShareMenu}
                    onToggleSave={handleToggleSave}
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
