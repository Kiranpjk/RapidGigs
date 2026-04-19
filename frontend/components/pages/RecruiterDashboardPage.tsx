import React, { useState, useEffect } from 'react';
import { Page } from '../../types';
import { jobsAPI, videosAPI, applicationsAPI, fetchWithAuth } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DateTime } from 'luxon';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface RecruiterDashboardPageProps {
    navigate: (page: Page) => void;
}

const RecruiterDashboardPage: React.FC<RecruiterDashboardPageProps> = ({ navigate }) => {
    const { user } = useAuth();
    const [myJobs, setMyJobs] = useState<any[]>([]);
    const [myVideos, setMyVideos] = useState<any[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [loadingVideos, setLoadingVideos] = useState(true);
    const [appDates, setAppDates] = useState<string[]>([]);

    const BASE_URL = import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:3001';
    const getMediaUrl = (url?: string) => url ? (url.startsWith('http') ? url : `${BASE_URL}${url}`) : '';

    useEffect(() => {
        // Single fetch for jobs + application dates for chart
        jobsAPI.getMyJobs()
            .then(async (data) => {
                const arr = Array.isArray(data) ? data : [];
                setMyJobs(arr);
                setLoadingJobs(false);

                // For each job, fetch its applications to get real dates for the chart
                const allDates: string[] = [];
                const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001/api';
                await Promise.all(arr.map(async (job: any) => {
                    try {
                        const jobId = job._id || job.id;
                        const apps = await fetchWithAuth(`${API_BASE}/applications/job/${jobId}`);
                        if (Array.isArray(apps)) {
                            apps.forEach((a: any) => {
                                if (a.createdAt || a.dateApplied) {
                                    allDates.push(a.createdAt || a.dateApplied);
                                }
                            });
                        }
                    } catch {}
                }));
                setAppDates(allDates);
            })
            .catch(() => { setMyJobs([]); setLoadingJobs(false); });

        videosAPI.getMyVideos()
            .then(data => setMyVideos(Array.isArray(data) ? data : []))
            .catch(() => setMyVideos([]))
            .finally(() => setLoadingVideos(false));
    }, []);

    const StatCard = ({ value, label, icon }: { value: string | number; label: string; icon: string }) => (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl">
                    {icon}
                </div>
                <div>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white">{value}</p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                </div>
            </div>
        </div>
    );

    const totalApplications = myJobs.reduce((sum, j) => sum + (j.applicationCount || 0), 0);

    // Build REAL chart data from actual application dates
    const chartData = React.useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Show last 7 months
        const labels: string[] = [];
        const counts: number[] = [];
        for (let i = 6; i >= 0; i--) {
            const m = (currentMonth - i + 12) % 12;
            const y = currentMonth - i < 0 ? currentYear - 1 : currentYear;
            labels.push(months[m]);
            const count = appDates.filter(d => {
                const dt = new Date(d);
                return dt.getMonth() === m && dt.getFullYear() === y;
            }).length;
            counts.push(count);
        }

        return {
            labels,
            datasets: [
                {
                    fill: true,
                    label: 'Applications Received',
                    data: counts,
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                },
            ],
        };
    }, [appDates]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: false } },
        scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-slide-up">
            {/* ── Welcome Header ─────────────────────────────────────────────────── */}
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                        Welcome, {user?.name?.split(' ')[0]}
                    </h1>
                    <p className="text-lg text-gray-500 dark:text-slate-400">
                        Here's what's happening with your job posts and candidates today.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('post_job')}
                        className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-gray-200 dark:shadow-none cursor-pointer whitespace-nowrap"
                    >
                        Post a Job
                    </button>
                    <button
                        onClick={() => navigate('candidates')}
                        className="px-6 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                    >
                        Browse Candidates
                    </button>
                </div>
            </div>

            {/* ── Stats Row ──────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                <StatCard value={myJobs.length} label="Active Jobs" icon="💼" />
                <StatCard value={totalApplications} label="Total Applications" icon="📋" />
                <StatCard value={myVideos.length} label="Company Videos" icon="🎬" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* ── Analytics Column ────────────────────────────────────────────── */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Application Trends</h2>
                        <span className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-blue-500">
                            +12% from last week
                        </span>
                    </div>
                    <div className="h-[280px] w-full">
                        <Line options={chartOptions} data={chartData} />
                    </div>
                </div>

                {/* ── Quick Actions / Summary Column ─────────────────────────────── */}
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quick Overview</h2>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">⚡</div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Active Recruiter</p>
                                <p className="text-xs text-gray-500">Highly responsive score</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">✅</div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Verified Account</p>
                                <p className="text-xs text-gray-500">Trusted by candidates</p>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-gray-50 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Goal Progress</h3>
                            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                                <div className="bg-gray-900 dark:bg-white h-2 rounded-full w-[65%]"></div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">Hire 5 developers this month</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Active Jobs Section ────────────────────────────────────────────── */}
            <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Active Job Posts</h2>
                    <button
                        onClick={() => navigate('review_applications')}
                        className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        View All Applications →
                    </button>
                </div>

                {loadingJobs ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 rounded-3xl p-6 animate-pulse h-48"></div>
                        ))}
                    </div>
                ) : myJobs.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-3xl p-16 text-center">
                        <div className="text-5xl mb-4">📭</div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No Jobs Posted Yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">Start attracting great candidates by posting your first job today.</p>
                        <button
                            onClick={() => navigate('post_job')}
                            className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl hover:scale-105 transition-all shadow-lg cursor-pointer"
                        >
                            Post Your First Job
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myJobs.map(job => {
                            const id = job._id || job.id;
                            const filledPercent = Math.min(100, ((job.filledSlots || 0) / (job.maxSlots || 1)) * 100);
                            return (
                                <div key={id} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer" onClick={() => navigate('review_applications')}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-xl font-bold text-gray-900 dark:text-white shadow-inner">
                                            {(job.company || 'J').substring(0, 1)}
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${job.status === 'Full' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                            {job.status === 'Full' ? 'Full' : 'Hiring'}
                                        </div>
                                    </div>

                                    <div className="min-w-0 flex-1 mb-4">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{job.title}</h3>
                                        <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{job.location}</p>
                                    </div>

                                    {/* Video Preview / Placeholder */}
                                    {(job.companyVideoUrl || job.shortVideoUrl) ? (
                                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 mb-5 group/video shadow-inner">
                                            <video
                                                src={getMediaUrl(job.companyVideoUrl || job.shortVideoUrl)}
                                                className="w-full h-full object-cover opacity-80 group-hover/video:opacity-100 transition-opacity duration-300"
                                                muted
                                                loop
                                                playsInline
                                                onMouseEnter={(e) => { e.currentTarget.play().catch(() => {}); }}
                                                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-100 group-hover/video:opacity-0 transition-opacity duration-300">
                                                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white text-xs">▶</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full aspect-video rounded-2xl bg-gray-50 dark:bg-slate-700/30 border border-dashed border-gray-200 dark:border-slate-700 mb-5 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">No Video preview</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mb-6">
                                        <span className="text-[11px] font-bold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-3 py-1 rounded-lg">{job.type || 'Remote'}</span>
                                        <span className="text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg">{job.pay}</span>
                                    </div>

                                    {(job.maxSlots && job.maxSlots > 0) && (
                                        <div className="mb-2">
                                            <div className="flex justify-between text-[11px] font-bold text-gray-500 dark:text-slate-400 mb-2">
                                                <span>{job.filledSlots || 0}/{job.maxSlots} filled</span>
                                                <span>{Math.round(filledPercent)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-1000 ${job.status === 'Full' ? 'bg-red-500' : 'bg-indigo-500'}`} 
                                                    style={{ width: `${filledPercent}%` }} 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ── Video Content Section ─────────────────────────────────────────── */}
            <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Marketing Videos</h2>
                    <button
                        onClick={() => navigate('upload_video')}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none cursor-pointer text-sm"
                    >
                        + Upload Video
                    </button>
                </div>

                {loadingVideos ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-[9/16] bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 animate-pulse"></div>
                        ))}
                    </div>
                ) : myVideos.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-3xl p-12 text-center">
                        <div className="text-5xl mb-4">🎬</div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No Company Videos</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto text-sm">Videos significantly increase engagement with your job posts.</p>
                        <button
                            onClick={() => navigate('upload_video')}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all cursor-pointer"
                        >
                            Upload Video
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {myVideos.map(video => (
                            <div key={video._id} className="group relative aspect-[9/16] bg-gray-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                                <video
                                    src={getMediaUrl(video.videoUrl)}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    loop
                                    muted
                                    playsInline
                                    onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                                    onMouseLeave={e => { (e.currentTarget as HTMLVideoElement).pause(); (e.currentTarget as HTMLVideoElement).currentTime = 0; }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 flex flex-col justify-end translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                    <h3 className="text-white font-bold text-sm truncate mb-1">{video.title}</h3>
                                    <p className="text-white/60 text-[10px] font-medium">
                                        {DateTime.fromISO(video.createdAt).toRelative()}
                                    </p>
                                </div>
                                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs">▶</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default RecruiterDashboardPage;
