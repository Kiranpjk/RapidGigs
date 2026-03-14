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
        fetchWithAuth(`${API_BASE}/admin/users?role=student&limit=50`)
            .then(data => {
                const users = Array.isArray(data) ? data : (data.users || []);
                setCandidates(users.filter((u: any) => u.role === 'student' || u.isStudent));
            })
            .catch(() => {
                // Fallback: use the public users search
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Profile Drawer */}
            {viewingProfile && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingProfile(null)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl animate-slide-in">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-36 relative">
                            <button
                                onClick={() => setViewingProfile(null)}
                                className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="px-6 pb-8 -mt-12">
                            <div className="flex items-end gap-4 mb-4">
                                <img
                                    src={avatarUrl(viewingProfile.name, viewingProfile.avatarUrl)}
                                    alt={viewingProfile.name}
                                    className="w-20 h-20 rounded-2xl ring-4 ring-white dark:ring-slate-900 object-cover shadow-lg"
                                />
                                <div className="pb-1">
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{viewingProfile.name}</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{viewingProfile.title || 'Student'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Contact Info</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-400">📧</span>
                                            <span className="text-slate-700 dark:text-slate-300">{viewingProfile.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-400">🆔</span>
                                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 select-all">{viewingProfile.id}</span>
                                        </div>
                                    </div>
                                </div>

                                {loadingProfile ? (
                                    <div className="text-center py-6 text-slate-400 text-sm">Loading stats...</div>
                                ) : viewingStats && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 text-center">
                                            <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{viewingStats.applicationsSent || 0}</p>
                                            <p className="text-xs text-indigo-500 dark:text-indigo-300 mt-1">Applications Sent</p>
                                        </div>
                                        <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4 text-center">
                                            <p className="text-3xl font-extrabold text-pink-600 dark:text-pink-400">{viewingStats.videosUploaded || 0}</p>
                                            <p className="text-xs text-pink-500 dark:text-pink-300 mt-1">Videos Uploaded</p>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Role</p>
                                    <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold px-3 py-1 rounded-full capitalize">
                                        {viewingProfile.role}
                                    </span>
                                </div>

                                <button
                                    onClick={() => {
                                        setViewingProfile(null);
                                        navigate('messages');
                                    }}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                    💬 Message {viewingProfile.name.split(' ')[0]}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-1">Candidates</h1>
                <p className="text-slate-500 dark:text-slate-400">Browse student profiles and find the right fit for your jobs.</p>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6 max-w-lg">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or title..."
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm"
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 animate-pulse">
                            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-4"></div>
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mx-auto mb-2"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto"></div>
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-24">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                        {searchQuery ? 'No candidates found' : 'No candidates yet'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                        {searchQuery ? 'Try a different search term.' : 'Students will appear here once they register.'}
                    </p>
                </div>
            ) : (
                <>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{filtered.length} candidate{filtered.length !== 1 ? 's' : ''} found</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filtered.map(candidate => (
                            <div
                                key={candidate.id}
                                onClick={() => openProfile(candidate)}
                                className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
                            >
                                <div className="text-center mb-4">
                                    <div className="relative inline-block">
                                        <img
                                            src={avatarUrl(candidate.name, candidate.avatarUrl)}
                                            alt={candidate.name}
                                            className="w-16 h-16 rounded-full object-cover mx-auto ring-2 ring-slate-200 dark:ring-slate-600 group-hover:ring-indigo-300 dark:group-hover:ring-indigo-600 transition-all"
                                        />
                                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full ring-2 ring-white dark:ring-slate-800 flex items-center justify-center"></span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="font-bold text-slate-800 dark:text-white truncate">{candidate.name}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">{candidate.title || 'Student'}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-1">{candidate.email}</p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold px-2.5 py-1 rounded-full capitalize">
                                        Student
                                    </span>
                                    <span className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                                        View Profile →
                                    </span>
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
