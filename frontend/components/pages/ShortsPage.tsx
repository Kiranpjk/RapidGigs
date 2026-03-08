
import React, { useEffect, useRef, useState } from 'react';
import { Job, Page } from '../../types';
import {
    HeartIcon,
    ShareIcon,
    PaperAirplaneIcon,
    EyeIcon,
} from '../icons/Icons';
import { shortsAPI } from '../../services/api';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useAuth } from '../../context/AuthContext';

interface ShortsPageProps {
    onApplyNow: (job: any) => void;
    onNavigateToJobDetail?: (jobId: string) => void;
    onNavigate?: (page: Page) => void;
}

const ShortsPage: React.FC<ShortsPageProps> = ({ onApplyNow, onNavigateToJobDetail, onNavigate }) => {
    const { user } = useAuth();
    const [shorts, setShorts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [likedJobs, setLikedJobs] = useState<Set<string>>(new Set());
    const [showHeartAnimation, setShowHeartAnimation] = useState<string | null>(null);
    const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
    const [showHint, setShowHint] = useState<boolean>(() => {
        const hasSeenHint = localStorage.getItem('shortsSwipeHintSeen');
        return !hasSeenHint;
    });

    useEffect(() => {
        const loadFeed = async () => {
            try {
                setIsLoading(true);
                const feed = await shortsAPI.getFeed();
                setShorts(Array.isArray(feed) ? feed : []);
            } catch (error) {
                console.error('Failed to load shorts feed:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadFeed();
    }, []);

    useEffect(() => {
        if (shorts.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const videoElement = entry.target as HTMLVideoElement;
                    if (entry.isIntersecting) {
                        videoElement.play().catch(error => console.log("Autoplay was prevented:", error));
                    } else {
                        videoElement.pause();
                        videoElement.currentTime = 0;
                    }
                });
            },
            { threshold: 0.5 }
        );

        const currentVideoRefs = videoRefs.current;
        currentVideoRefs.forEach(video => {
            if (video) observer.observe(video);
        });

        return () => {
            currentVideoRefs.forEach(video => {
                if (video) observer.unobserve(video);
            });
        };
    }, [shorts]);

    // Keyboard navigation support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && onNavigateToJobDetail) {
                const container = document.querySelector('.snap-start') as HTMLElement;
                if (container) {
                    const jobId = container.getAttribute('data-job-id');
                    if (jobId) {
                        onNavigateToJobDetail(jobId);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNavigateToJobDetail]);

    // First-time user hint
    useEffect(() => {
        if (showHint) {
            const timer = setTimeout(() => {
                setShowHint(false);
                localStorage.setItem('shortsSwipeHintSeen', 'true');
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [showHint]);

    const handleDismissHint = () => {
        setShowHint(false);
        localStorage.setItem('shortsSwipeHintSeen', 'true');
    };

    const handleLike = (id: string) => {
        setLikedJobs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
                setShowHeartAnimation(id);
                setTimeout(() => setShowHeartAnimation(null), 1000);
            }
            return newSet;
        });
    };

    const handleShare = (item: any, platform: string) => {
        const url = `${window.location.origin}/shorts/${item.id}`;
        const text = `Check out this on RapidGig: ${item.title}`;

        switch (platform) {
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
                break;
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                break;
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                break;
            case 'copy':
                navigator.clipboard.writeText(url);
                alert('Link copied to clipboard!');
                break;
        }
        setShowShareMenu(null);
    };

    if (isLoading) {
        return (
            <div className="h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center bg-black text-white">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
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
                        ? "Check back later to see candidate introductions." 
                        : "Follow some companies to see their job marketing shorts."}
                </p>
            </div>
        );
    }

    return (
        <div className="relative h-[calc(100vh-64px)] w-full overflow-y-auto snap-y snap-mandatory scroll-smooth bg-black">
            {/* First-time user hint */}
            {showHint && (
                <div
                    className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl animate-fade-in"
                    onClick={handleDismissHint}
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
                        <button
                            className="text-xs text-slate-400 hover:text-slate-600 mt-2"
                            onClick={handleDismissHint}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            {shorts.map((item, index) => {
                const containerRef = { current: containerRefs.current[index] };

                // eslint-disable-next-line react-hooks/rules-of-hooks
                const swipeState = useSwipeGesture(containerRef, {
                    onSwipeLeft: () => {
                        if (onNavigateToJobDetail) {
                            onNavigateToJobDetail(item.id);
                        }
                    },
                    minSwipeDistance: 50,
                    minSwipeVelocity: 0.3,
                });

                // Ensure video URL is correct (handles both absolute and relative)
                const videoSrc = item.videoUrl.startsWith('http') 
                    ? item.videoUrl 
                    : `${window.location.protocol}//${window.location.hostname}:3001${item.videoUrl}`;

                const isJob = item.type === 'job';

                return (
                    <div
                        key={item.id}
                        ref={el => { containerRefs.current[index] = el; }}
                        data-job-id={item.id}
                        className="h-full w-full flex-shrink-0 snap-start relative flex items-center justify-center"
                        style={{
                            transform: `translateX(${swipeState.swipeOffset}px)`,
                            transition: swipeState.isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        <video
                            ref={el => { videoRefs.current[index] = el; }}
                            src={videoSrc}
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>

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

                        {/* Video Overlay UI */}
                        <div className="absolute bottom-0 left-0 p-6 text-white w-full flex justify-between items-end drop-shadow-2xl z-10">
                            {/* Left side: Item Info */}
                            <div className="w-3/4">
                                <div className="flex items-center gap-3 mb-3">
                                    <img 
                                        src={item.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author?.name || 'A')}`}
                                        alt={item.author?.name}
                                        className="w-11 h-11 rounded-full border-2 border-white/50 object-cover"
                                    />
                                    <div>
                                        <p className="font-bold text-lg leading-tight">{item.author?.name}</p>
                                        <p className="text-xs text-white/70">@{item.author?.name.toLowerCase().replace(' ', '')}</p>
                                    </div>
                                    {!isJob && (
                                        <button className="bg-indigo-600/80 hover:bg-indigo-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ml-1">
                                            Connect
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

                                {/* Engagement Stats */}
                                <div className="flex items-center gap-5 mt-4 text-xs font-semibold text-white/80">
                                    <div className="flex items-center gap-1.5">
                                        <EyeIcon className="w-4 h-4" />
                                        <span>{item.views > 999 ? (item.views / 1000).toFixed(1) + 'K' : item.views}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <HeartIcon className="w-4 h-4" />
                                        <span>{item.likes}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <PaperAirplaneIcon className="w-4 h-4" />
                                        <span>{item.comments || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right side: Action Buttons */}
                            <div className="flex flex-col items-center gap-7 pb-4">
                                {/* Like Button */}
                                <button
                                    onClick={() => handleLike(item.id)}
                                    className="flex flex-col items-center group"
                                >
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${likedJobs.has(item.id)
                                            ? 'bg-red-500 scale-110'
                                            : 'bg-white/10 backdrop-blur-md group-hover:bg-white/20 group-hover:scale-110'
                                        }`}>
                                        <HeartIcon className={`w-8 h-8 transition-all duration-300 ${likedJobs.has(item.id) ? 'fill-white text-white' : 'text-white'
                                            }`} />
                                    </div>
                                </button>

                                {/* Share Button */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowShareMenu(showShareMenu === item.id ? null : item.id)}
                                        className="flex flex-col items-center group"
                                    >
                                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md group-hover:bg-white/20 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg">
                                            <ShareIcon className="w-8 h-8 text-white" />
                                        </div>
                                    </button>

                                    {showShareMenu === item.id && (
                                        <div className="absolute right-16 bottom-0 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-2 space-y-1 min-w-[140px] z-50 border border-white/20">
                                            <button onClick={() => handleShare(item, 'whatsapp')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-800 dark:text-white text-xs font-bold">
                                                📱 WhatsApp
                                            </button>
                                            <button onClick={() => handleShare(item, 'twitter')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-800 dark:text-white text-xs font-bold">
                                                🐦 X / Twitter
                                            </button>
                                            <button onClick={() => handleShare(item, 'copy')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-800 dark:text-white text-xs font-bold">
                                                📋 Copy Link
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Main Action (Apply/Interested) */}
                                <button
                                    className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white p-4 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-110 hover:rotate-3"
                                    onClick={() => {
                                        if (isJob) {
                                            onApplyNow(item);
                                        } else if (onNavigate) {
                                            onNavigate('profile');
                                        }
                                    }}
                                >
                                    <PaperAirplaneIcon className="w-7 h-7 rotate-45" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ShortsPage;
