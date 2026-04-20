
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
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    
    const isJob = item.type === 'job';
    const jobId = String(item.jobId || item.id);
    const userHasApplied = isJob ? hasApplied(jobId) : false;

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

    // Robust fallbacks for older jobs or missing data
    const skills = (item.skills && item.skills.length > 0) ? item.skills : ['Engineering', 'Product', 'Innovation'];
    const matchScore = item.matchScore || (user?.isRecruiter ? 92 : 88);
    const displayPay = item.pay || (isJob ? '$80k - $140k' : null);
    const displayCompany = item.company || item.author?.name || 'RapidGig Partner';

    const handleVideoRef = (el: HTMLVideoElement | null) => {
        localVideoRef.current = el;
        videoRef(el);
    };

    const handleContainerClick = (e: React.MouseEvent) => {
        // Only toggle overlay if clicking the card generally, not a button
        if ((e.target as HTMLElement).closest('button')) return;

        if (localVideoRef.current) {
            if (localVideoRef.current.paused) {
                localVideoRef.current.play().catch(() => {});
            } else {
                localVideoRef.current.pause();
            }
        }
    };

    const isVisible = showOverlay || isPaused;

    return (
        <div
            ref={containerRef}
            data-job-id={item.jobId || item.id}
            onMouseEnter={() => setShowOverlay(true)}
            onMouseLeave={() => setShowOverlay(false)}
            onClick={handleContainerClick}
            className="h-full w-full flex-shrink-0 snap-start relative flex items-center justify-center group cursor-pointer"
            style={{
                transform: `translateX(${swipeState.swipeOffset}px)`,
                transition: swipeState.isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            <div className="relative h-full w-full flex items-center justify-center p-0 overflow-hidden">
                <div className="relative h-full w-full">
                    {videoSrc ? (
                        <video
                            ref={handleVideoRef}
                            src={videoSrc}
                            loop
                            muted
                            playsInline
                            controls={false}
                            onPlay={() => setIsPaused(false)}
                            onPause={() => setIsPaused(true)}
                            className="w-full h-full object-contain bg-black"
                            onError={(e) => {
                                (e.target as HTMLVideoElement).style.display = 'none';
                            }}
                            data-id={item.id}
                        />
                    ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                            <span className="text-zinc-600 text-sm font-medium">No Video</span>
                        </div>
                    )}

                    {/* Permanent subtle gradient for readability */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none z-10" />

                    {/* Hover/Tap Details Overlay */}
                    <div 
                        className={`absolute inset-x-0 bottom-0 pt-32 pb-8 px-6 flex flex-col justify-end transition-all duration-200 z-20 pointer-events-none ${
                            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        } bg-gradient-to-t from-black/90 via-black/50 to-transparent`}
                    >
                        <div className="pointer-events-auto flex flex-col items-start text-left">
                            <div className="flex items-center gap-3 mb-2.5">
                                <img
                                    src={item.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author?.name || 'A')}`}
                                    alt={item.author?.name}
                                    onClick={(e) => { e.stopPropagation(); if (item.author?.id) onViewProfile(item.author.id); }}
                                    className="w-9 h-9 rounded-lg border-2 border-white/20 object-cover cursor-pointer hover:border-white/40 transition-colors shadow-lg"
                                />
                                <div className="min-w-0">
                                    <h2 className="text-xl font-black leading-tight drop-shadow-lg text-white truncate max-w-[320px]">{item.title || 'Untitled Role'}</h2>
                                    <p className="text-[12px] text-white/70 font-bold uppercase tracking-wider truncate">{displayCompany}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {isJob && displayPay && (
                                    <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded border border-emerald-400/20 shadow-md">
                                        {displayPay}
                                    </span>
                                )}
                                <span className="bg-white/10 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded border border-white/10 uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {matchScore}% Match
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mb-4 max-w-[320px]">
                                {skills.slice(0, 5).map((skill: string) => (
                                    <span key={skill} className="text-[9px] font-black uppercase tracking-wider bg-black/40 border border-white/5 px-2 py-0.5 rounded text-white/70">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Permanent Basic Info (Fades out when overlay shows) */}
                    <div className={`absolute bottom-6 left-6 right-24 z-20 pointer-events-none transition-all duration-300 ${isVisible ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                        <h2 className="text-xl font-black text-white mb-0.5 drop-shadow-lg">{item.title || 'Untitled Role'}</h2>
                        <p className="text-[11px] font-black text-white/60 uppercase tracking-[0.2em]">{displayCompany}</p>
                    </div>

                    {/* Bottom-right direct actions: Like, Share, Save, Apply — with counts */}
                    <div className="absolute right-4 bottom-6 z-30 flex flex-col items-center gap-3">
                        {/* Like button + count */}
                        <div className="flex flex-col items-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); onLike(item.id); }}
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
                                onClick={(e) => { e.stopPropagation(); onToggleShareMenu(showShareMenu === item.id ? null : item.id); }}
                                className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 flex items-center justify-center shadow-lg"
                                aria-label="Share"
                            >
                                <ShareIcon className="w-6 h-6 text-white" />
                            </button>
                            <span className="text-[10px] font-bold text-white/80 mt-0.5">{formatCount(item.shares || 0)}</span>
                            {showShareMenu === item.id && (
                                <div className="absolute right-14 top-0 bg-[var(--bg)] border border-[var(--border)] rounded-lg p-1 space-y-0.5 min-w-[130px] z-50 animate-fade-in" onClick={(e) => e.stopPropagation()}>
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
                                    onClick={(e) => { e.stopPropagation(); onToggleSave(item); }}
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
                        {isJob ? (
                            // Only show if NOT a recruiter viewing a job short
                            !user?.isRecruiter && (
                                <div className="flex flex-col items-center">
                                    <button
                                        className={`px-5 py-3 rounded-full text-[13px] font-black tracking-widest uppercase flex items-center gap-2 shadow-2xl transition-all duration-150 ${
                                            userHasApplied
                                                ? 'bg-emerald-500 text-white opacity-90 cursor-default'
                                                : 'bg-white text-zinc-900 hover:bg-zinc-100 hover:scale-105 active:scale-95 cursor-pointer'
                                        }`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (userHasApplied) return;
                                            if (item.id && !item.id.startsWith('job_')) {
                                                shortsAPI.engage(item.id, { action: 'apply_click' }).catch(() => {});
                                            }
                                            onApplyNow(item);
                                        }}
                                        disabled={userHasApplied}
                                    >
                                        {userHasApplied ? <><span className="text-sm">✓</span> Applied</> : <>Apply</>}
                                    </button>
                                </div>
                            )
                        ) : (
                            // Candidate short
                            <div className="flex flex-col items-center">
                                <button
                                    className="px-5 py-3 rounded-full bg-white text-zinc-900 hover:bg-zinc-100 text-[13px] font-black tracking-widest uppercase flex items-center gap-2 shadow-2xl transition-all active:scale-95 hover:scale-105"
                                    onClick={(e) => { e.stopPropagation(); item.author?.id && onViewProfile(item.author.id); }}
                                >
                                    {user?.isRecruiter ? 'Review' : 'Connect'}
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
