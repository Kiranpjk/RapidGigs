import React, { useState, useEffect, useMemo } from 'react';
import { Page } from '../../types';
import { jobsAPI, videosAPI, fetchWithAuth } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DateTime } from 'luxon';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

interface RecruiterDashboardPageProps {
    navigate: (page: Page) => void;
    onReviewFilter?: (filter: { status?: string; appId?: string; jobId?: string }) => void;
}

const RecruiterDashboardPage: React.FC<RecruiterDashboardPageProps> = ({ navigate, onReviewFilter }) => {
    const { user } = useAuth();
    const [myJobs, setMyJobs] = useState<any[]>([]);
    const [myVideos, setMyVideos] = useState<any[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [loadingVideos, setLoadingVideos] = useState(true);
    const [appDates, setAppDates] = useState<string[]>([]);

    const BASE_URL = import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:3001';
    const getMediaUrl = (url?: string) => url ? (url.startsWith('http') ? url : `${BASE_URL}${url}`) : '';

    const [topCandidate, setTopCandidate] = useState<any>(null);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [stats, setStats] = useState({
        newCount: 0,
        maxNewScore: 0,
        schedulingCount: 0,
        mismatchCount: 0
    });

    const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001/api';

    useEffect(() => {
        jobsAPI.getMyJobs()
            .then(async (data) => {
                const arr = Array.isArray(data) ? data : [];
                setMyJobs(arr);
                setLoadingJobs(false);

                let newCount = 0;
                let maxNewScore = 0;
                let schedulingCount = 0;
                let mismatchCount = 0;
                let allApps: any[] = [];
                let topCand: any = null;

                const last24h = DateTime.now().minus({ hours: 24 });

                await Promise.all(arr.map(async (job: any) => {
                    try {
                        const jobId = job._id || job.id;
                        const apps = await fetchWithAuth(`${API_BASE}/applications/job/${jobId}`);
                        if (Array.isArray(apps)) {
                            apps.forEach((a: any) => {
                                const score = a.aiMatchResult?.matchScore || 0;
                                const appDate = DateTime.fromISO(a.createdAt || a.dateApplied);
                                
                                if (appDate >= last24h) {
                                    allApps.push({ ...a, jobTitle: job.title, jobId: job._id || job.id });
                                }

                                // Action counts
                                if (a.status === 'pending') {
                                    newCount++;
                                    if (score > maxNewScore) maxNewScore = score;
                                    if (!topCand || score > (topCand.aiMatchResult?.matchScore || 0)) {
                                        topCand = { ...a, jobTitle: job.title, jobId: job._id || job.id };
                                    }
                                }
                                if (a.status === 'shortlisted') schedulingCount++;
                                
                                // Mismatch
                                const match = a.aiMatchResult;
                                if (match) {
                                    if ((a.status === 'rejected' && match.matchScore >= 80) || 
                                        ((a.status === 'shortlisted' || a.status === 'interviewing') && match.matchScore <= 40)) {
                                        mismatchCount++;
                                    }
                                }
                            });
                        }
                    } catch {}
                }));

                setTopCandidate(topCand);
                setRecentActivity(allApps.sort((a,b) => DateTime.fromISO(b.createdAt).toMillis() - DateTime.fromISO(a.createdAt).toMillis()).slice(0, 5));
                setStats({ newCount, maxNewScore, schedulingCount, mismatchCount });
                setAppDates(allApps.map(a => a.createdAt || a.dateApplied));
            })
            .catch(() => { setMyJobs([]); setLoadingJobs(false); });

        videosAPI.getMyVideos()
            .then(data => setMyVideos(Array.isArray(data) ? data : []))
            .catch(() => setMyVideos([]))
            .finally(() => setLoadingVideos(false));
    }, []);

    const totalApplications = myJobs.reduce((sum, j) => sum + (j.applicationCount || 0), 0);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#18181b',
                titleFont: { size: 10, weight: 'bold' as const },
                bodyFont: { size: 12 },
                padding: 10,
                displayColors: false,
            }
        },
        scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { color: '#71717a', font: { size: 10 } } },
            y: { grid: { color: '#27272a' }, border: { display: false }, ticks: { display: false } }
        }
    };

    const chartData = useMemo(() => {
        const last7Days = [...Array(7)].map((_, i) => DateTime.now().minus({ days: 6 - i }).toFormat('ccc'));
        const counts = [...Array(7)].map((_, i) => {
            const d = DateTime.now().minus({ days: 6 - i });
            return appDates.filter(ad => DateTime.fromISO(ad).hasSame(d, 'day')).length;
        });

        return {
            labels: last7Days,
            datasets: [{
                data: counts,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2,
            }]
        };
    }, [appDates]);

    return (
        <div className="max-w-screen-xl mx-auto px-6 py-8 animate-fade-in space-y-10">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-[13px] text-[var(--text-tertiary)] mt-1">
                        Acting as {user?.name} · {myJobs.length} active roles
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('post_job')}
                        className="px-4 py-2 bg-[var(--text-primary)] text-[var(--bg)] text-[13px] font-bold rounded-lg hover:opacity-90 transition-all active:scale-95"
                    >
                        + Post Job
                    </button>
                    <button
                        onClick={() => navigate('review_applications')}
                        className="px-4 py-2 text-[13px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-all"
                    >
                        Review Workspace
                    </button>
                </div>
            </div>
            
            {/* ── Search Bar (Decision Entry) ─────────────────────────────────── */}
            <div className="flex flex-col items-center">
                <form 
                    onSubmit={(e) => {
                        e.preventDefault();
                        const query = (e.currentTarget.elements.namedItem('search') as HTMLInputElement).value;
                        if (query.trim()) {
                            // If it's a specific candidate name we found, navigate to them
                            const found = recentActivity.find(a => a.applicant?.name?.toLowerCase().includes(query.toLowerCase()));
                            if (found) onReviewFilter?.({ appId: found._id || found.id, jobId: found.jobId, status: 'all' });
                            else navigate('review_applications');
                        }
                    }}
                    className="relative w-full max-w-2xl group"
                >
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-tertiary)] group-focus-within:text-[var(--accent)] transition-colors"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                        name="search"
                        type="text"
                        placeholder="Search candidates, roles, or insights..."
                        className="w-full pl-12 pr-4 py-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl text-[15px] text-[var(--text-primary)] shadow-xl shadow-black/5 placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all duration-200"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-[var(--bg)] border border-[var(--border)] rounded text-[10px] font-bold text-[var(--text-tertiary)]">
                        <span>⌘</span><span>K</span>
                    </div>
                </form>
            </div>

            {/* 🔥 TASK 1: TOP CANDIDATE TODAY (Decision Hero) ──────────────── */}
            {topCandidate && (
                <section className="relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-transparent to-transparent opacity-50 rounded-2xl" />
                    <div className="relative border border-violet-500/30 bg-[var(--surface)] p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <img 
                                    src={topCandidate.applicant?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(topCandidate.applicant?.name || 'C')}&size=64&background=8b5cf6&color=fff`} 
                                    className="w-16 h-16 rounded-2xl border-2 border-violet-500/30 shadow-xl object-cover" 
                                    alt="" 
                                />
                                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-lg border-2 border-[var(--surface)] shadow-lg animate-bounce">
                                    TOP
                                </div>
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-[var(--text-primary)] mb-1">{topCandidate.applicant?.name}</h2>
                                <p className="text-[12px] text-violet-400 font-bold uppercase tracking-widest mb-2">{topCandidate.jobTitle}</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                                        <span className="text-emerald-500 text-[12px] font-black tabular-nums">
                                            {topCandidate.aiMatchResult?.matchScore ? `${topCandidate.aiMatchResult.matchScore}% Match` : 'Processing'}
                                        </span>
                                    </div>
                                    {topCandidate.aiMatchResult?.topStrength && (
                                        <span className="text-[12px] text-[var(--text-secondary)] font-medium leading-tight max-w-[200px] truncate">
                                            ▲ {topCandidate.aiMatchResult.topStrength}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                            <button 
                                onClick={() => onReviewFilter?.({ appId: topCandidate._id || topCandidate.id, jobId: topCandidate.jobId, status: 'all' })} 
                                className="flex-1 md:flex-none px-6 py-3 bg-violet-600 text-white text-[13px] font-black uppercase tracking-widest rounded-xl hover:bg-violet-500 shadow-xl shadow-violet-600/30 transition-all active:scale-95"
                            >
                                View Profile
                            </button>
                            <button 
                                onClick={() => onReviewFilter?.({ status: 'ready_to_interview' })}
                                className="flex-1 md:flex-none px-6 py-3 border border-[var(--border)] text-[var(--text-primary)] text-[13px] font-bold rounded-xl hover:bg-[var(--surface-hover)] transition-all"
                            >
                                Shortlist
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* 🔥 TASK 2 & 4: ENHANCED ACTION CARDS (Urgency & Intelligence) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`relative border rounded-2xl p-6 transition-all group overflow-hidden ${stats.newCount > 0 ? 'bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/20 shadow-xl shadow-amber-500/5' : 'bg-[var(--surface)] border-[var(--border)]'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-amber-500">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2 h-2 rounded-full ${stats.newCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <p className={`text-[11px] font-black uppercase tracking-widest ${stats.newCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>Review Queue</p>
                    </div>
                    <h3 className="text-3xl font-black text-[var(--text-primary)] mb-1">{stats.newCount}</h3>
                    <p className="text-[13px] text-[var(--text-secondary)] font-medium mb-5">
                        {stats.newCount > 0 
                            ? `${stats.newCount} new candidates (Top: ${stats.maxNewScore}%)` 
                            : 'All clear! No pending reviews.'}
                    </p>
                    <button 
                        onClick={() => {
                            // Find the first job with pending applications
                            const firstJobWithPending = myJobs.find(j => j.applicationCount > 0); // Simplified check
                            onReviewFilter?.({ status: 'needs_review', jobId: firstJobWithPending?._id || firstJobWithPending?.id });
                        }}
                        className={`w-full py-3 text-[12px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg ${stats.newCount > 0 ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'}`}
                    >
                        {stats.newCount > 0 ? 'Start Review' : 'View History'}
                    </button>
                </div>

                <div className={`relative border rounded-2xl p-6 transition-all group overflow-hidden ${stats.schedulingCount > 0 ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[var(--surface)] border-[var(--border)]'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-emerald-500">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2 h-2 rounded-full ${stats.schedulingCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} />
                        <p className={`text-[11px] font-black uppercase tracking-widest ${stats.schedulingCount > 0 ? 'text-emerald-500' : 'text-zinc-500'}`}>Scheduling</p>
                    </div>
                    <h3 className="text-3xl font-black text-[var(--text-primary)] mb-1">{stats.schedulingCount}</h3>
                    <p className="text-[13px] text-[var(--text-secondary)] font-medium mb-5">
                        {stats.schedulingCount > 0 ? 'Candidates moving to interview phase' : 'No interviews to schedule'}
                    </p>
                    <button 
                        onClick={() => {
                            const firstJobWithShortlisted = myJobs.find(j => j.applicationCount > 0);
                            onReviewFilter?.({ status: 'ready_to_interview', jobId: firstJobWithShortlisted?._id || firstJobWithShortlisted?.id });
                        }}
                        className={`w-full py-3 text-[12px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg ${stats.schedulingCount > 0 ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
                    >
                        Schedule Now
                    </button>
                </div>

                <div className={`relative border rounded-2xl p-6 transition-all group overflow-hidden ${stats.mismatchCount > 0 ? 'bg-red-500/5 border-red-500/30 ring-1 ring-red-500/20' : 'bg-zinc-500/5 border-[var(--border)]'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-red-500">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2 h-2 rounded-full ${stats.mismatchCount > 0 ? 'bg-red-500 animate-bounce' : 'bg-emerald-500'}`} />
                        <p className={`text-[11px] font-black uppercase tracking-widest ${stats.mismatchCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>AI Audit</p>
                    </div>
                    <h3 className="text-3xl font-black text-[var(--text-primary)] mb-1">{stats.mismatchCount}</h3>
                    <p className="text-[13px] text-[var(--text-secondary)] font-medium mb-5">
                        {stats.mismatchCount > 0 
                            ? `${stats.mismatchCount} decisions clash with AI analysis` 
                            : 'AI aligned with decisions'}
                    </p>
                    <button 
                        onClick={() => onReviewFilter?.({ status: 'mismatch' })}
                        className={`w-full py-3 text-[12px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg ${stats.mismatchCount > 0 ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20' : 'bg-[var(--surface-hover)] text-[var(--border-strong)] border border-[var(--border)]'}`}
                    >
                        {stats.mismatchCount > 0 ? 'Resolve Warning' : 'View Audit Logs'}
                    </button>
                </div>
            </div>

            {/* 🔥 TASK 5: LAST 24H ACTIVITY (High Priority) ─────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">Last 24h Activity</h2>
                        <span className="text-[10px] font-bold text-violet-400 bg-violet-400/5 px-2 py-0.5 rounded border border-violet-400/20">LIVE FEED</span>
                    </div>
                    <div className="border border-[var(--border)] rounded-2xl bg-[var(--bg)] overflow-hidden shadow-sm">
                        {recentActivity.length === 0 ? (
                            <div className="p-12 text-center text-[var(--text-tertiary)] italic text-sm">
                                No activity in the last 24 hours
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--border)]">
                                {recentActivity.map((act, i) => (
                                    <div key={act.id || i} className="p-4 flex items-center justify-between hover:bg-[var(--surface)] transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 font-bold border border-violet-500/10 group-hover:scale-105 transition-transform">
                                                {act.applicant?.name?.charAt(0) || 'C'}
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-bold text-[var(--text-primary)]">
                                                    {act.applicant?.name} applied to <span className="text-violet-400">{act.jobTitle}</span>
                                                </p>
                                                <p className="text-[11px] text-[var(--text-tertiary)] font-medium">{DateTime.fromISO(act.createdAt).toRelative()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {act.aiMatchResult?.matchScore != null && (
                                                <span className={`text-[12px] font-black tabular-nums ${act.aiMatchResult.matchScore >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    {act.aiMatchResult.matchScore}%
                                                </span>
                                            )}
                                            <button onClick={() => {
                                                console.log('Navigating to candidate:', act.applicant?.name, 'Job:', act.jobId);
                                                onReviewFilter?.({ appId: act._id || act.id, jobId: act.jobId, status: 'all' });
                                            }} className="p-2 text-[var(--text-tertiary)] hover:text-white hover:bg-[var(--bg)] rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">Efficiency</h2>
                    <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-5">
                        <div className="flex justify-between items-center text-[12px] font-bold text-[var(--text-secondary)]">
                            <span>Sourcing Health</span>
                            <span className="text-emerald-500">OPTIMAL</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full w-[85%]" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl">
                                <p className="text-[10px] uppercase tracking-widest font-black text-[var(--text-tertiary)] mb-1">Avg Score</p>
                                <p className="text-lg font-black text-[var(--text-primary)]">74%</p>
                            </div>
                            <div className="p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl">
                                <p className="text-[10px] uppercase tracking-widest font-black text-[var(--text-tertiary)] mb-1">Time-to-Hire</p>
                                <p className="text-lg font-black text-violet-400">4.2d</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔥 TASK 3: REDUCED PROMINENCE (Lower Section) ─────────────── */}
            <div className="pt-10 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xs font-black text-[var(--text-tertiary)] uppercase tracking-[0.3em]">Lifecycle & Analytics</h2>
                        <p className="text-[11px] text-[var(--text-tertiary)] mt-1 opacity-50">Background data for long-term tracking</p>
                    </div>
                    <button className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest hover:underline">Export Report</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                            <div className="h-[200px]">
                                <Line options={chartOptions} data={chartData} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]">
                            <h3 className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-4">Quick Stats</h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Active Roles', value: myJobs.length, icon: '💼', color: 'text-blue-400' },
                                    { label: 'Total Apps', value: totalApplications, icon: '📄', color: 'text-violet-400' },
                                    { label: 'Marketing', value: myVideos.length, icon: '🎬', color: 'text-emerald-400' },
                                ].map(stat => (
                                    <div key={stat.label} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="scale-75 opacity-50">{stat.icon}</span>
                                            <span className="text-[11px] font-bold text-[var(--text-secondary)]">{stat.label}</span>
                                        </div>
                                        <span className={`text-[12px] font-black ${stat.color}`}>{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Roles (Most Collapsed) */}
            <div className="pt-6">
                <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                        <h2 className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.3em] group-open:text-[var(--text-primary)] transition-colors">Active Role Inventory</h2>
                        <span className="text-[10px] text-[var(--accent)] font-bold group-open:rotate-180 transition-transform tracking-widest uppercase">View All</span>
                    </summary>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        {myJobs.map(job => (
                            <div key={job._id || job.id} className="p-4 border border-[var(--border)] rounded-xl bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all cursor-pointer">
                                <h3 className="text-[12px] font-bold text-[var(--text-primary)] mb-1 truncate">{job.title}</h3>
                                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest">{job.applicationCount || 0} applicants</p>
                            </div>
                        ))}
                    </div>
                </details>
            </div>
        </div>
    );
};

export default RecruiterDashboardPage;
