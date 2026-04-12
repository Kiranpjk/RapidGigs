import React, { useState, useEffect } from 'react';
import { Page } from '../../types';
import { fetchWithAuth } from '../../services/api';

interface CandidatesPageProps {
    navigate: (page: Page) => void;
}

interface Candidate {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    title?: string;
    role: string;
    stats?: {
        applicationsSent: number;
        videosUploaded: number;
    };
}

const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001/api';

const CandidatesPage: React.FC<CandidatesPageProps> = ({ navigate }) => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewingProfile, setViewingProfile] = useState<Candidate | null>(null);
    const [viewingStats, setViewingStats] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    useEffect(() => {
        // Try recruiting endpoint first (recruiter/admin), fall back to public users
        fetchWithAuth(`${API_BASE}/users`)
            .then(data => {
                const users = Array.isArray(data) ? data : (data.users || []);
                setCandidates(users.filter((u: any) => u.role === 'student' || u.isStudent));
            })
            .catch(() => {
                setCandidates([]);
            })
            .finally(() => setLoading(false));
    }, []);

    const openProfile = async (candidate: Candidate) => {
        setViewingProfile(candidate);
        setLoadingProfile(true);
        try {
            const data = await fetchWithAuth(`${API_BASE}/users/${candidate.id}`);
            setViewingStats(data.stats);
        } catch {
            setViewingStats(null);
        }
        setLoadingProfile(false);
    };

    const filtered = candidates.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const avatarUrl = (name?: string, url?: string) =>
        url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&size=80&background=6366f1&color=fff`;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-slide-up">
            {/* ── Profile Drawer ─────────────────────────────────────────────────── */}
            {viewingProfile && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setViewingProfile(null)} />
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl animate-slide-in-right">
                        <div className="bg-gray-50 dark:bg-slate-800 h-48 relative">
                            {/* Profile Header Image/Graphic could go here */}
                             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10"></div>
                            <button
                                onClick={() => setViewingProfile(null)}
                                className="absolute top-6 right-6 w-10 h-10 bg-white/80 dark:bg-slate-700/80 backdrop-blur-md hover:bg-white dark:hover:bg-slate-600 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-200 transition-all shadow-sm z-10 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="px-10 pb-12 -mt-16 relative">
                            <div className="flex items-end gap-6 mb-8">
                                <img
                                    src={avatarUrl(viewingProfile.name, viewingProfile.avatarUrl)}
                                    alt={viewingProfile.name}
                                    className="w-32 h-32 rounded-3xl ring-8 ring-white dark:ring-slate-900 object-cover shadow-2xl"
                                />
                                <div className="pb-2">
                                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{viewingProfile.name}</h2>
                                    <p className="text-lg text-gray-500 dark:text-slate-400 font-medium">{viewingProfile.title || 'Professional Candidate'}</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 dark:bg-slate-800 rounded-3xl p-6 transition-all hover:bg-gray-100/50">
                                        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Email</p>
                                        <p className="text-gray-900 dark:text-white font-bold truncate">{viewingProfile.email}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-slate-800 rounded-3xl p-6 transition-all hover:bg-gray-100/50">
                                        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Role</p>
                                        <p className="text-gray-900 dark:text-white font-bold capitalize">{viewingProfile.role}</p>
                                    </div>
                                </div>

                                {loadingProfile ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                                    </div>
                                ) : viewingStats && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-3xl p-6 text-center">
                                            <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{viewingStats.applicationsSent || 0}</p>
                                            <p className="text-xs font-bold text-blue-500 dark:text-blue-300 uppercase tracking-widest mt-1">Applications</p>
                                        </div>
                                        <div className="bg-purple-50/50 dark:bg-purple-900/20 rounded-3xl p-6 text-center">
                                            <p className="text-4xl font-black text-purple-600 dark:text-purple-400">{viewingStats.videosUploaded || 0}</p>
                                            <p className="text-xs font-bold text-purple-500 dark:text-purple-300 uppercase tracking-widest mt-1">Video Shorts</p>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-gray-50 dark:bg-slate-800 rounded-3xl p-8">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-4">About Candidate</h3>
                                    <p className="text-gray-600 dark:text-slate-400 leading-relaxed">
                                        {viewingProfile.name} is a dedicated {viewingProfile.role} profile on RapidGig. 
                                        {viewingStats?.videosUploaded > 0 ? " They have high engagement with video content." : " They are actively looking for new opportunities."}
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        setViewingProfile(null);
                                        navigate('messages');
                                    }}
                                    className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-200 dark:shadow-none cursor-pointer text-lg"
                                >
                                    Send Message
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Page Header ───────────────────────────────────────────────────── */}
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Candidates</h1>
                    <p className="text-lg text-gray-500 dark:text-slate-400">Discover and connect with top talent waiting to join your team.</p>
                </div>
                
                {/* Search Bar - Apple Style */}
                <div className="relative w-full max-w-md group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">🔍</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by name, role, or title..."
                        className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm shadow-sm transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-3xl p-8 animate-pulse h-64"></div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
                    <div className="text-6xl mb-6">🔍</div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                        {searchQuery ? 'Matching candidates' : 'No candidates yet'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'Try exploring different keywords.' : 'New students will appear here as they join.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-8">
                        <p className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                            Showing {filtered.length} Results
                        </p>
                        <div className="flex gap-2">
                             {/* Potential filtering dropdowns here */}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filtered.map(candidate => (
                            <div
                                key={candidate.id}
                                onClick={() => openProfile(candidate)}
                                className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group"
                            >
                                <div className="flex flex-col items-center">
                                    <div className="relative mb-6">
                                        <img
                                            src={avatarUrl(candidate.name, candidate.avatarUrl)}
                                            alt={candidate.name}
                                            className="w-24 h-24 rounded-[2rem] object-cover ring-4 ring-gray-50 dark:ring-slate-700 group-hover:ring-indigo-100 dark:group-hover:ring-indigo-900 transition-all duration-300 shadow-lg"
                                        />
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white dark:border-slate-800"></div>
                                    </div>
                                    
                                    <div className="text-center w-full mb-6">
                                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{candidate.name}</h3>
                                        <p className="text-sm font-bold text-indigo-500 dark:text-indigo-400 truncate mt-1">{candidate.title || 'Candidate'}</p>
                                        <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-1">{candidate.email}</p>
                                    </div>

                                    <div className="w-full flex items-center justify-between pt-6 border-t border-gray-50 dark:border-slate-700">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">
                                            Profile
                                        </span>
                                        <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:translate-x-1 transition-transform">
                                            View →
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default CandidatesPage;
