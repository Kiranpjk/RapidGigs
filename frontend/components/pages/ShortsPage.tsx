
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

/** Compact count formatter: 1200 → "1.2K", 3500000 → "3.5M" */
const formatCount = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
};

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
    user: any;
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
    user,
}) => {
    const { hasApplied } = useJobs();
    const containerRef = useRef<HTMLDivElement>(null);
    const [connectState, setConnectState] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    
    const isJob = item.type === 'job';
    // Use item.jobId if it exists, else item.id
    const jobId = String(item.jobId || item.id);
    const userHasApplied = isJob ? hasApplied(jobId) : false;

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
            <div className="relative h-full w-full flex items-center justify-center p-0">
                {/* Full-width container that fills the vertical space */}
                <div className="relative h-full w-full">
                    {videoSrc ? (
                        <video
                            ref={videoRef}
                            src={videoSrc}
                            loop
                            muted
                            playsInline
                            controls={false}
                            className="w-full h-full object-contain bg-black"
                            onError={(e) => {
                                // If video fails to load, hide it and show placeholder
                                (e.target as HTMLVideoElement).style.display = 'none';
                            }}
                        />
                    ) : (
                        <div className="w-full h-full rounded-2xl bg-zinc-900 flex items-center justify-center">
                            <span className="text-zinc-600 text-sm font-medium">No Video</span>
                        </div>
                    )}

                    {/* Gradient overlay — removed rounding */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

            {/* Swipe Indicator */}
            {swipeState.isSwiping && swipeState.swipeOffset < -20 && (
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 rounded-lg px-4 py-3 z-20">
                    <div className="flex items-center gap-2">
                        <PaperAirplaneIcon className="w-5 h-5 text-[var(--accent)] rotate-45" />
                        <span className="text-zinc-900 text-sm font-medium">
                            {isJob ? 'Swipe to Apply' : 'Swipe for Details'}
                        </span>
                    </div>
                </div>
            )}

                    {/* Bottom Overlay - Adjusted for better spacing and layering */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white w-full flex justify-between items-end drop-shadow-2xl z-20 pointer-events-none">
                        {/* Left: Info area (re-enable pointer events for text and buttons) */}
                        <div className="flex-1 min-w-0 pr-6 pointer-events-auto max-w-[calc(100%-80px)]">
                            <div className="flex items-center gap-3 mb-3">
                                <img
                                    src={item.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author?.name || 'A')}`}
                                    alt={item.author?.name}
                                    onClick={() => { if (item.author?.id) onViewProfile(item.author.id); }}
                                    className="w-10 h-10 rounded-full border-2 border-white/40 object-cover cursor-pointer hover:scale-105 transition-transform shadow-lg"
                                />
                                <div className="min-w-0">
                                    <p onClick={() => { if (item.author?.id) onViewProfile(item.author.id); }} className="font-bold text-base leading-tight cursor-pointer hover:underline truncate">{item.author?.name}</p>
                                    <p className="text-[10px] text-white/60 truncate">@{(item.author?.name || 'user').toLowerCase().replace(/\s+/g, '')}</p>
                                </div>
                                {!isJob && (
                                    <button
                                        onClick={() => {
                                            if (connectState !== 'idle') return;
                                            setConnectState('sending');
                                            setTimeout(() => setConnectState('sent'), 1000);
                                        }}
                                        className={`text-[9px] font-medium px-2.5 py-1 rounded-md uppercase tracking-wider transition-all ${
                                            connectState === 'sent' ? 'bg-green-500 text-white' :
                                            connectState === 'sending' ? 'bg-blue-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                                        }`}
                                    >
                                        {connectState === 'sent' ? 'Sent!' : connectState === 'sending' ? 'Sending…' : 'Connect'}
                                    </button>
                                )}
                            </div>
                            <h2 className="text-lg font-bold mb-1 tracking-tight drop-shadow-md truncate">{item.title}</h2>
                            
                            {/* Scrollable description container */}
                            <div 
                                className={`text-left text-sm text-white/95 mb-1 transition-all duration-300 drop-shadow-sm ${isDescriptionExpanded ? 'max-h-32 overflow-y-auto pr-2 custom-scrollbar' : 'line-clamp-2'}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {item.description}
                            </div>
                            {(item.description || '').length > 90 && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDescriptionExpanded(prev => !prev);
                                    }}
                                    className="text-[10px] font-medium text-white/70 hover:text-white mb-2 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-all mt-1 flex items-center gap-1"
                                >
                                    {isDescriptionExpanded ? 'Less' : 'More'}
                                    <span className={`transform transition-transform ${isDescriptionExpanded ? 'rotate-180' : ''}`}>↓</span>
                                </button>
                            )}

                            {isJob && (
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="font-black text-green-400 text-base">{item.pay}</span>
                                    <span className="bg-white/10 text-[9px] px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-sm uppercase tracking-wider font-bold">Job Post</span>
                                </div>
                            )}

                            {/* Stats */}
                            <div className="flex items-center gap-4 mt-3 text-[11px] font-bold text-white/90">
                                <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                                    <EyeIcon className="w-3.5 h-3.5" />
                                    <span>{(item.views || 0) > 999 ? ((item.views || 0) / 1000).toFixed(1) + 'K' : (item.views || 0)}</span>
                                </div>
                                <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                                    <HeartIcon className="w-3.5 h-3.5 text-red-400" />
                                    <span>{item.likes || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom-right direct actions: Like, Share, Save, Apply — with counts */}
                    <div className="absolute right-4 bottom-6 z-30 flex flex-col items-center gap-3">
                        {/* Like button + count */}
                        <div className="flex flex-col items-center">
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
                            <span className="text-[10px] font-bold text-white/80 mt-0.5">{formatCount(item.likes || 0)}</span>
                        </div>

                        {/* Share button + count */}
                        <div className="flex flex-col items-center relative">
                            <button
                                onClick={() => onToggleShareMenu(showShareMenu === item.id ? null : item.id)}
                                className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 flex items-center justify-center shadow-lg"
                                aria-label="Share"
                            >
                                <ShareIcon className="w-6 h-6 text-white" />
                            </button>
                            <span className="text-[10px] font-bold text-white/80 mt-0.5">{formatCount(item.shares || 0)}</span>
                            {showShareMenu === item.id && (
                                <div className="absolute right-14 top-0 bg-[var(--bg)] border border-[var(--border)] rounded-lg p-1 space-y-0.5 min-w-[130px] z-50 animate-fade-in">
                                    <button onClick={() => onShare(item, 'whatsapp')} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-hover)] rounded-md text-[var(--text-primary)] text-[12px] font-medium">WhatsApp</button>
                                    <button onClick={() => onShare(item, 'twitter')} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-hover)] rounded-md text-[var(--text-primary)] text-[12px] font-medium">X / Twitter</button>
                                    <button onClick={() => onShare(item, 'copy')} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-hover)] rounded-md text-[var(--text-primary)] text-[12px] font-medium">Copy Link</button>
                                </div>
                            )}
                        </div>

                        {/* Save button + count (students only) */}
                        {isJob && !user?.isRecruiter && (
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={() => onToggleSave(item)}
                                    className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                                        isSaved ? 'bg-emerald-500' : 'bg-white/15 backdrop-blur-md hover:bg-white/25'
                                    }`}
                                    aria-label={isSaved ? 'Unsave job' : 'Save job'}
                                >
                                    <BookmarkIcon className="w-6 h-6 text-white" />
                                </button>
                                <span className="text-[10px] font-bold text-white/80 mt-0.5">{formatCount(item.saves || 0)}</span>
                            </div>
                        )}

                        {/* Apply / View button — clear labeled CTA */}
                        {/* Apply / View button — clear labeled CTA */}
                        {isJob ? (
                            // Only show if NOT a recruiter viewing a job short
                            !user?.isRecruiter && (
                                <div className="flex flex-col items-center">
                                    <button
                                        className={`px-5 py-2.5 rounded-full text-[13px] font-bold tracking-wide flex items-center gap-2 shadow-lg transition-all duration-150 ${
                                            userHasApplied
                                                ? 'bg-emerald-500 text-white opacity-90 cursor-default'
                                                : 'bg-white text-zinc-900 hover:bg-zinc-100 active:scale-95 cursor-pointer'
                                        }`}
                                        onClick={() => {
                                            if (userHasApplied) return;
                                            if (item.id && !item.id.startsWith('job_')) {
                                                shortsAPI.engage(item.id, { action: 'apply_click' }).catch(() => {});
                                            }
                                            onApplyNow(item);
                                        }}
                                        disabled={userHasApplied}
                                    >
                                        {userHasApplied ? <><span className="text-base">✓</span> Applied</> : <>Apply Now</>}
                                    </button>
                                </div>
                            )
                        ) : (
                            // Candidate short
                            <div className="flex flex-col items-center">
                                <button
                                    className="px-5 py-2.5 rounded-full bg-white text-zinc-900 hover:bg-zinc-100 text-[13px] font-bold tracking-wide flex items-center gap-2 shadow-lg transition-all active:scale-95"
                                    onClick={() => item.author?.id && onViewProfile(item.author.id)}
                                >
                                    {user?.isRecruiter ? 'View Profile' : 'Connect'}
                                </button>
                            </div>
                        )}
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
                const feedArr = Array.isArray(feed) ? feed : [];
                setShorts(feedArr);
                // Initialize liked/saved state from server
                const initialLiked = new Set<string>();
                feedArr.forEach((item: any) => {
                    if (item.isLiked) initialLiked.add(item.id);
                });
                setLikedJobs(initialLiked);
            } catch (error) {
                console.error('Failed to load shorts feed:', error);
                setShorts([]);
            } finally {
                setIsLoading(false);
            }
        };
        loadFeed();
    }, []);

    // Auto-play on scroll intersection + track view engagement
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
                            // Track view engagement on backend
                            if (id && !id.startsWith('job_')) {
                                shortsAPI.engage(id, { action: 'view' }).catch(() => {});
                            }
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

        if (container.scrollTop < topThreshold || container.scrollTop > bottomThreshold) {
            // Momentarily disable snap to avoid jitter during the jump
            container.style.scrollSnapType = 'none';
            container.style.scrollBehavior = 'auto'; // Instant jump

            if (container.scrollTop < topThreshold) {
                container.scrollTop += segmentHeight;
            } else {
                container.scrollTop -= segmentHeight;
            }

            // Restore snap after the jump
            requestAnimationFrame(() => {
                container.style.scrollSnapType = 'y mandatory';
                container.style.scrollBehavior = 'smooth';
            });
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
        if (!user) {
            if (onNavigate) onNavigate('login');
            return;
        }
        setLikedJobs(prev => {
            const next = new Set(prev);
            if (next.has(id)) { 
                next.delete(id); 
                setShorts(prevShorts => prevShorts.map(s => s.id === id ? { ...s, likes: Math.max(0, (s.likes || 0) - 1) } : s));
                // Track unlike on backend
                if (id && !id.startsWith('job_')) {
                    shortsAPI.engage(id, { action: 'unlike' }).catch(() => {});
                }
            }
            else {
                next.add(id);
                setShorts(prevShorts => prevShorts.map(s => s.id === id ? { ...s, likes: (s.likes || 0) + 1 } : s));
                setShowHeartAnimation(id);
                setTimeout(() => setShowHeartAnimation(null), 1000);
                // Track like on backend
                if (id && !id.startsWith('job_')) {
                    shortsAPI.engage(id, { action: 'like' }).catch(() => {});
                }
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
        // Track share on backend + update count
        setShorts(prev => prev.map(s => s.id === item.id ? { ...s, shares: (s.shares || 0) + 1 } : s));
        if (item.id && !item.id.startsWith('job_')) {
            shortsAPI.engage(item.id, { action: 'share' }).catch(() => {});
        }
    };

    const handleToggleSave = (item: any) => {
        if (!user) {
            if (onNavigate) onNavigate('login');
            return;
        }

        const jobId = String(item.jobId || item.id);
        if (!jobId) return;

        if (isJobSaved(jobId)) {
            unsaveJob(jobId);
            // Track unsave
            setShorts(prev => prev.map(s => s.id === item.id ? { ...s, saves: Math.max(0, (s.saves || 0) - 1) } : s));
            if (item.id && !item.id.startsWith('job_')) {
                shortsAPI.engage(item.id, { action: 'unsave' }).catch(() => {});
            }
            return;
        }

        // Track save
        setShorts(prev => prev.map(s => s.id === item.id ? { ...s, saves: (s.saves || 0) + 1 } : s));
        if (item.id && !item.id.startsWith('job_')) {
            shortsAPI.engage(item.id, { action: 'save' }).catch(() => {});
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
            <div className="h-[calc(100vh-49px)] w-full flex flex-col items-center justify-center bg-black text-white">
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin mb-3" />
                <p className="text-sm text-white/50">Loading feed…</p>
            </div>
        );
    }

    if (shorts.length === 0) {
        return (
            <div className="h-[calc(100vh-49px)] w-full flex flex-col items-center justify-center bg-black text-white p-8 text-center">
                <h2 className="text-base font-medium mb-2">No shorts yet</h2>
                <p className="text-zinc-500 text-sm max-w-sm">
                    {user?.isRecruiter
                        ? 'Check back later to see candidate introductions.'
                        : 'Upload an intro video so recruiters can discover you.'}
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
            className="relative h-[calc(100vh-49px)] w-full overflow-y-auto snap-y snap-mandatory scroll-smooth bg-black"
        >
            {/* Profile Drawer */}
            {viewingProfile && (
                <div className="fixed inset-0 z-[60] flex justify-end">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setViewingProfile(null)} />
                    <div className="relative w-full max-w-sm bg-[var(--bg)] border-l border-[var(--border)] h-full overflow-y-auto animate-slide-left">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                            <p className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Profile</p>
                            <button onClick={() => setViewingProfile(null)} className="p-1 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]">✕</button>
                        </div>
                        <div className="p-4">
                            <div className="flex items-center gap-3 mb-5">
                                <img src={avatarUrl(viewingProfile.name, viewingProfile.avatarUrl)} alt={viewingProfile.name} className="w-12 h-12 rounded-full object-cover" />
                                <div>
                                    <h2 className="text-sm font-medium text-[var(--text-primary)]">{viewingProfile.name}</h2>
                                    <p className="text-[11px] text-[var(--text-tertiary)]">{viewingProfile.title || (viewingProfile.role === 'recruiter' ? 'Recruiter' : 'Student')}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="border border-[var(--border)] rounded-lg p-3">
                                    <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Contact</p>
                                    <p className="text-[13px] text-[var(--text-secondary)]">
                                        {viewingProfile.email ? (
                                            /* Only show email if it's already a connection or truncated for privacy */
                                            viewingProfile.email.includes('...') ? viewingProfile.email : 
                                            `${viewingProfile.email.substring(0, 3)}...${viewingProfile.email.split('@')[1] || ''}`
                                        ) : 'Contact via message'}
                                    </p>
                                    <p className="text-[11px] text-[var(--text-tertiary)] italic mt-1 font-medium">Full contact available after connection</p>
                                </div>
                                {loadingProfile ? (
                                    <div className="text-center py-4 text-[var(--text-tertiary)] text-[12px]">Loading…</div>
                                ) : viewingStats && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="border border-[var(--border)] rounded-lg p-3 text-center">
                                            <p className="text-xl font-semibold text-[var(--text-primary)] tabular-nums">{viewingStats.applicationsSent ?? 0}</p>
                                            <p className="text-[10px] text-[var(--text-tertiary)]">Applications</p>
                                        </div>
                                        <div className="border border-[var(--border)] rounded-lg p-3 text-center">
                                            <p className="text-xl font-semibold text-[var(--text-primary)] tabular-nums">{viewingStats.videosUploaded ?? 0}</p>
                                            <p className="text-[10px] text-[var(--text-tertiary)]">Videos</p>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => { setViewingProfile(null); if (onNavigate) onNavigate('messages'); }}
                                    className="w-full py-2.5 bg-[var(--text-primary)] text-[var(--bg)] text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity"
                                >
                                    Message {viewingProfile.name?.split(' ')[0]}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Swipe Hint */}
            {showHint && (
                <div
                    className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg px-5 py-4 cursor-pointer animate-fade-in"
                    onClick={() => { setShowHint(false); localStorage.setItem('shortsSwipeHintSeen', 'true'); }}
                >
                    <div className="flex flex-col items-center gap-2 max-w-[200px]">
                        <PaperAirplaneIcon className="w-5 h-5 text-[var(--accent)] rotate-45" />
                        <p className="text-center text-sm font-medium text-zinc-900">
                            {user?.isRecruiter ? 'Swipe left for details' : 'Swipe left to apply'}
                        </p>
                        <p className="text-center text-[11px] text-zinc-500">Or press ← key</p>
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
                    user={user}
                />
            ))}
        </div>
    );
};

export default ShortsPage;
