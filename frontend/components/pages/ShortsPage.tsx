
import React, { useEffect, useRef, useState } from 'react';
import { Job } from '../../types';
import {
    HeartIcon,
    ShareIcon,
    PaperAirplaneIcon,
    EyeIcon,
} from '../icons/Icons';
import { ALL_JOBS } from '../../data/mockData';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

interface ShortsPageProps {
    onApplyNow: (job: Job) => void;
    onNavigateToJobDetail?: (jobId: number) => void;
}

const ShortsPage: React.FC<ShortsPageProps> = ({ onApplyNow, onNavigateToJobDetail }) => {
    const jobsWithShorts = ALL_JOBS.filter(job => job.shortVideoUrl && job.shortVideoUrl !== '');
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [likedJobs, setLikedJobs] = useState<Set<number>>(new Set());
    const [showHeartAnimation, setShowHeartAnimation] = useState<number | null>(null);
    const [showShareMenu, setShowShareMenu] = useState<number | null>(null);
    const [showHint, setShowHint] = useState<boolean>(() => {
        // Check if user has seen the hint before
        const hasSeenHint = localStorage.getItem('shortsSwipeHintSeen');
        return !hasSeenHint;
    });

    useEffect(() => {
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
            { threshold: 0.5 } // Play when 50% of the video is visible
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
    }, [jobsWithShorts.length]);

    // Keyboard navigation support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && onNavigateToJobDetail) {
                // Find the currently visible video
                const container = document.querySelector('.snap-start') as HTMLElement;
                if (container) {
                    const jobId = parseInt(container.getAttribute('data-job-id') || '0');
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

    const handleLike = (jobId: number) => {
        setLikedJobs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(jobId)) {
                newSet.delete(jobId);
            } else {
                newSet.add(jobId);
                // Show heart animation
                setShowHeartAnimation(jobId);
                setTimeout(() => setShowHeartAnimation(null), 1000);
            }
            return newSet;
        });
    };

    const handleShare = (job: Job, platform: string) => {
        const url = `https://rapid-gigs.vercel.app/shorts/${job.id}`;
        const text = `Check out this opportunity: ${job.title} at ${job.company}`;

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
            case 'linkedin':
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
                break;
            case 'copy':
                navigator.clipboard.writeText(url);
                alert('Link copied to clipboard!');
                break;
        }
        setShowShareMenu(null);
    };

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
                        <p className="text-center text-lg font-bold text-slate-800">Swipe left to apply!</p>
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

            {jobsWithShorts.map((job, index) => {
                const containerRef = { current: containerRefs.current[index] };

                // eslint-disable-next-line react-hooks/rules-of-hooks
                const swipeState = useSwipeGesture(containerRef, {
                    onSwipeLeft: () => {
                        if (onNavigateToJobDetail) {
                            onNavigateToJobDetail(job.id);
                        }
                    },
                    minSwipeDistance: 50,
                    minSwipeVelocity: 0.3,
                });

                return (
                    <div
                        key={job.id}
                        ref={el => { containerRefs.current[index] = el; }}
                        data-job-id={job.id}
                        className="h-full w-full flex-shrink-0 snap-start relative flex items-center justify-center"
                        style={{
                            transform: `translateX(${swipeState.swipeOffset}px)`,
                            transition: swipeState.isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                        role="article"
                        aria-label={`Job posting: ${job.title} at ${job.company}`}
                    >
                        <video
                            ref={el => { videoRefs.current[index] = el; }}
                            src={job.shortVideoUrl}
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                        {/* Swipe Indicator */}
                        {swipeState.isSwiping && swipeState.swipeOffset < -20 && (
                            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-4 shadow-lg">
                                <div className="flex items-center gap-2">
                                    <PaperAirplaneIcon className="w-6 h-6 text-indigo-600 rotate-45" />
                                    <span className="text-indigo-600 font-bold">Swipe to Apply</span>
                                </div>
                            </div>
                        )}

                        {/* Heart Animation */}
                        {showHeartAnimation === job.id && (
                            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                <HeartIcon className="w-32 h-32 text-red-500 animate-heart-burst" />
                            </div>
                        )}

                        {/* Video Overlay UI */}
                        <div className="absolute bottom-0 left-0 p-4 md:p-6 text-white w-full flex justify-between items-end drop-shadow-lg">
                            {/* Left side: Job Info */}
                            <div className="w-4/5 pr-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-slate-100/20 backdrop-blur-sm rounded-lg flex items-center justify-center font-bold text-white text-lg">{job.company.substring(0, 2)}</div>
                                    <p className="font-bold text-lg">{job.company}</p>
                                </div>
                                <h2 className="text-xl font-bold">{job.title}</h2>
                                <p className="text-sm mt-1 line-clamp-2">{job.description}</p>
                                <p className="font-semibold text-green-400 mt-2">{job.pay}</p>

                                {/* Engagement Stats */}
                                <div className="flex items-center gap-4 mt-3 text-xs">
                                    <div className="flex items-center gap-1">
                                        <EyeIcon className="w-4 h-4" />
                                        <span>{job.likes ? (job.likes / 1000).toFixed(1) + 'K' : '0'} views</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <HeartIcon className="w-4 h-4" />
                                        <span>{job.likes || 0} likes</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <ShareIcon className="w-4 h-4" />
                                        <span>{job.shares || 0} shared</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <PaperAirplaneIcon className="w-4 h-4" />
                                        <span>{job.comments || 0} applied</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right side: Action Buttons */}
                            <div className="flex flex-col items-center space-y-6">
                                {/* Like Button */}
                                <button
                                    onClick={() => handleLike(job.id)}
                                    className="flex flex-col items-center text-center group"
                                >
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${likedJobs.has(job.id)
                                            ? 'bg-red-500 scale-110'
                                            : 'bg-white/20 backdrop-blur-sm group-hover:scale-110'
                                        }`}>
                                        <HeartIcon className={`w-8 h-8 transition-all duration-300 ${likedJobs.has(job.id) ? 'fill-white text-white' : ''
                                            }`} />
                                    </div>
                                </button>

                                {/* Share Button with Menu */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowShareMenu(showShareMenu === job.id ? null : job.id)}
                                        className="flex flex-col items-center text-center group"
                                    >
                                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                                            <ShareIcon className="w-8 h-8" />
                                        </div>
                                    </button>

                                    {/* Share Menu */}
                                    {showShareMenu === job.id && (
                                        <div className="absolute right-16 bottom-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-2 space-y-1 min-w-[160px] z-50">
                                            <button onClick={() => handleShare(job, 'whatsapp')} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-800 dark:text-white text-sm">
                                                <span>📱</span> WhatsApp
                                            </button>
                                            <button onClick={() => handleShare(job, 'facebook')} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-800 dark:text-white text-sm">
                                                <span>👤</span> Facebook
                                            </button>
                                            <button onClick={() => handleShare(job, 'twitter')} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-800 dark:text-white text-sm">
                                                <span>🐦</span> Twitter
                                            </button>
                                            <button onClick={() => handleShare(job, 'linkedin')} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-800 dark:text-white text-sm">
                                                <span>💼</span> LinkedIn
                                            </button>
                                            <button onClick={() => handleShare(job, 'copy')} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-800 dark:text-white text-sm">
                                                <span>📋</span> Copy Link
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Apply Button */}
                                <button
                                    className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-4 rounded-full transition-all duration-300 transform hover:scale-110 shadow-lg"
                                    onClick={() => onApplyNow(job)}
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
