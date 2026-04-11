import React, { useState, useEffect } from 'react';
import { Page } from '../../types';
import { jobsAPI, videosAPI } from '../../services/api';
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

    const BASE_URL = import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:3001';
    const getMediaUrl = (url?: string) => url ? (url.startsWith('http') ? url : `${BASE_URL}${url}`) : '';

    useEffect(() => {
        jobsAPI.getMyJobs()
            .then(data => setMyJobs(Array.isArray(data) ? data : []))
            .catch(() => setMyJobs([]))
            .finally(() => setLoadingJobs(false));

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

    // Mock Chart Data for Applications
    const chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [
            {
                fill: true,
                label: 'Applications Received',
                data: [12, 19, 15, 25, 22, 30, Math.max(30, totalApplications)],
                borderColor: 'rgb(99, 102, 241)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: false } },
        scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8" data-aos="fade-in">
            {/* Welcome Section */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6" data-aos="fade-up">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
                        Welcome back, {user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Manage your job posts, track Applications and find candidate.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('post_job')}
                        className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        Post a Job
                    </button>
                    <button
                        onClick={() => navigate('candidates')}
                        className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Browse Candidates
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                <StatCard value={myJobs.length} label="Jobs Posted" icon="💼" />
                <StatCard value={totalApplications} label="Applications" icon="📋" />
                <StatCard value={myVideos.length} label="Videos" icon="🎬" />
            </div>

            {/* Analytics Chart Row */}
            <div className="mb-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm" data-aos="fade-up" data-aos-delay="100">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Application Trends</h2>
                <div className="h-[250px] w-full">
                    <Line options={chartOptions} data={chartData} />
                </div>
            </div>

            {/* My Job Posts */}
            <section className="mb-10" data-aos="fade-up" data-aos-delay="200">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">My Job Posts</h2>
                    <button
                        onClick={() => navigate('post_job')}
                        className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                    >
                        + Post New Job
                    </button>
                </div>

                {loadingJobs ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 animate-pulse">
                                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                            </div>
                        ))}
                    </div>
                ) : myJobs.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-16 text-center">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No Jobs Posted Yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">Start attracting great candidates by posting your first job.</p>
                        <button
                            onClick={() => navigate('post_job')}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
                        >
                            Post Your First Job
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {myJobs.map(job => {
                            const id = job._id || job.id;
                            return (
                                <div key={id} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg flex-shrink-0">
                                            {(job.company || 'J').substring(0, 1)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-slate-800 dark:text-white truncate">{job.title}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{job.company} · {job.location}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full">{job.type || 'Remote'}</span>
                                        <span className="text-xs text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">{job.pay}</span>
                                    </div>

                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{job.description}</p>

                                    {(job.maxSlots && job.maxSlots > 1) && (
                                        <div className="mb-4">
                                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                                <span>{job.filledSlots || 0}/{job.maxSlots} positions filled</span>
                                                <span className={job.status === 'Full' ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}>{job.status === 'Full' ? 'Full' : 'Open'}</span>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                                <div className={`h-1.5 rounded-full transition-all ${job.status === 'Full' ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, ((job.filledSlots || 0) / job.maxSlots) * 100)}%` }} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                        <span className="text-xs text-slate-400">
                                            {DateTime.fromISO(job.createdAt || new Date().toISOString()).toRelative() || 'Just now'}
                                        </span>
                                        <button
                                            onClick={() => navigate('review_applications')}
                                            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                        >
                                            View Applications →
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* My Videos */}
            <section data-aos="fade-up" data-aos-delay="300">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">My Video Posts</h2>
                    <button
                        onClick={() => navigate('upload_video')}
                        className="text-sm px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition-colors"
                    >
                        + Upload Video
                    </button>
                </div>

                {loadingVideos ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden animate-pulse">
                                <div className="aspect-video bg-slate-200 dark:bg-slate-700"></div>
                                <div className="p-4">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : myVideos.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-12 text-center">
                        <div className="text-6xl mb-4">🎬</div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No Videos Yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">Upload videos to showcase your company culture.</p>
                        <button
                            onClick={() => navigate('upload_video')}
                            className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl transition-colors"
                        >
                            Upload First Video
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {myVideos.map(video => (
                            <div key={video._id} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group">
                                <div className="relative aspect-video bg-slate-200 dark:bg-slate-800 rounded-t-xl overflow-hidden shadow-inner">
                                    <video
                                        src={getMediaUrl(video.videoUrl)}
                                        className="w-full h-full object-cover"
                                        controls
                                        preload="metadata"
                                    />
                                </div>
                                <div className="p-3">
                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white truncate">{video.title}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Uploaded {DateTime.fromISO(video.createdAt).toRelative() || 'recently'}
                                    </p>
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
