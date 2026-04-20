import React, { useState, useEffect } from 'react';
import { Page } from '../../types';
import { fetchWithAuth } from '../../services/api';
import { SearchIcon, XMarkIcon } from '../icons/Icons';

interface CandidatesPageProps { navigate: (page: Page) => void; }

interface Candidate {
    id: string; name: string; email?: string; avatarUrl?: string; title?: string; role: string;
    stats?: { applicationsSent: number; videosUploaded: number; };
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
        fetchWithAuth(`${API_BASE}/users`)
            .then(data => { const users = Array.isArray(data) ? data : (data.users || []); setCandidates(users.filter((u: any) => u.role === 'student' || u.isStudent)); })
            .catch(() => setCandidates([]))
            .finally(() => setLoading(false));
    }, []);

    const openProfile = async (candidate: Candidate) => {
        setViewingProfile(candidate);
        setLoadingProfile(true);
        try {
            const [profileData, contactData] = await Promise.allSettled([
                fetchWithAuth(`${API_BASE}/users/${candidate.id}`),
                fetchWithAuth(`${API_BASE}/users/${candidate.id}/contact`),
            ]);
            setViewingStats(profileData.status === 'fulfilled' ? profileData.value.stats : null);
            // If contact endpoint succeeds, recruiter has a hiring relationship — show email
            if (contactData.status === 'fulfilled' && contactData.value.email) {
                setViewingProfile(prev => prev ? { ...prev, email: contactData.value.email } : prev);
            }
        } catch {
            setViewingStats(null);
        }
        setLoadingProfile(false);
    };

    const filtered = candidates.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const avatar = (name?: string, url?: string) =>
        url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&size=48&background=e5e5e5&color=71717a`;

    return (
        <div className="max-w-screen-xl mx-auto px-6 py-8 animate-fade-in">
            {/* Profile Drawer */}
            {viewingProfile && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setViewingProfile(null)} />
                    <div className="relative w-full max-w-sm bg-[var(--bg)] border-l border-[var(--border)] h-full overflow-y-auto animate-slide-left">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                            <p className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Candidate Profile</p>
                            <button onClick={() => setViewingProfile(null)} className="p-1 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center gap-3 mb-6">
                                <img src={avatar(viewingProfile.name, viewingProfile.avatarUrl)} alt="" className="w-12 h-12 rounded-full" />
                                <div>
                                    <h2 className="text-sm font-medium text-[var(--text-primary)]">{viewingProfile.name}</h2>
                                    <p className="text-[11px] text-[var(--text-tertiary)]">{viewingProfile.title || 'Student'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="border border-[var(--border)] rounded-lg p-3">
                                    <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Contact</p>
                                    {viewingProfile.email ? (
                                        <p className="text-[13px] text-[var(--text-secondary)]">{viewingProfile.email}</p>
                                    ) : (
                                        <p className="text-[12px] text-[var(--text-tertiary)] italic">Available after they apply to your job</p>
                                    )}
                                </div>

                                {loadingProfile ? (
                                    <div className="flex justify-center py-6"><div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>
                                ) : viewingStats && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="border border-[var(--border)] rounded-lg p-3 text-center">
                                            <p className="text-xl font-semibold text-[var(--text-primary)] tabular-nums">{viewingStats.applicationsSent || 0}</p>
                                            <p className="text-[10px] text-[var(--text-tertiary)]">Applications</p>
                                        </div>
                                        <div className="border border-[var(--border)] rounded-lg p-3 text-center">
                                            <p className="text-xl font-semibold text-[var(--text-primary)] tabular-nums">{viewingStats.videosUploaded || 0}</p>
                                            <p className="text-[10px] text-[var(--text-tertiary)]">Videos</p>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => { setViewingProfile(null); navigate('messages'); }}
                                    className="w-full py-2.5 bg-[var(--text-primary)] text-[var(--bg)] text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity"
                                >
                                    Message {viewingProfile.name?.split(' ')[0]}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Candidates</h1>
                    <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">{filtered.length} students on the platform</p>
                </div>
                <div className="relative max-w-xs w-full">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                    <input
                        type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search candidates…"
                        className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all duration-100"
                    />
                </div>
            </div>

            {loading ? (
                <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 animate-pulse bg-[var(--surface)]" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="border border-dashed border-[var(--border)] rounded-lg p-16 text-center">
                    <p className="text-sm text-[var(--text-tertiary)]">{searchQuery ? 'No matches found' : 'No candidates yet'}</p>
                </div>
            ) : (
                <div className="border border-[var(--border)] rounded-lg overflow-hidden divide-y divide-[var(--border)]">
                    {filtered.map(candidate => (
                        <button
                            key={candidate.id}
                            onClick={() => openProfile(candidate)}
                            className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-[var(--surface-hover)] transition-colors duration-75 group"
                        >
                            <img src={avatar(candidate.name, candidate.avatarUrl)} alt="" className="w-9 h-9 rounded-full shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                                    {candidate.name}
                                    {filtered.some(c => c.id !== candidate.id && c.name === candidate.name) && candidate.email && (
                                        <span className="ml-2 text-[10px] font-normal text-[var(--text-tertiary)] opacity-60">
                                            ({candidate.email.substring(0, 3)}...)
                                        </span>
                                    )}
                                </p>
                                <p className="text-[11px] text-[var(--text-tertiary)] truncate">{candidate.title || 'Student'}</p>
                            </div>
                            <span className="text-[11px] text-[var(--text-tertiary)] shrink-0">View →</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CandidatesPage;
