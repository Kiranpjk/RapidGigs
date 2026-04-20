import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { jobsAPI, applicationsAPI, categoriesAPI, matchingAPI, fetchWithAuth, fetchBlobWithAuth } from '../../services/api';
import { XMarkIcon } from '../icons/Icons';
import Swal from 'sweetalert2';

const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001/api';
const BASE_URL = (import.meta.env.VITE_API_BASE as string)?.replace('/api', '') || 'http://localhost:3001';

const getMediaUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`;
};

function getEmbedUrl(url: string) {
    if (!url) return '';
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
            let videoId = '';
            if (u.hostname.includes('youtu.be')) videoId = u.pathname.substring(1).split(/[?#]/)[0];
            else if (u.pathname.includes('/shorts/')) videoId = u.pathname.split('/shorts/')[1].split(/[?#]/)[0];
            else videoId = u.searchParams.get('v') || '';
            if (videoId) return `https://www.youtube.com/embed/${videoId}`;
        }
        if (u.hostname.includes('github.com') || u.hostname.includes('linkedin.com') || u.hostname.includes('behance.net')) return '';
    } catch {}
    return url;
}

// ── PDF Preview Component ──────────────────────────────────────────────────
const PdfPreview: React.FC<{ applicationId: string }> = ({ applicationId }) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let localBlobUrl: string | null = null;
        const endpoint = applicationsAPI.getResumeEndpoint(applicationId, 'inline');
        fetchBlobWithAuth(endpoint)
            .then(rawBlob => {
                if (!cancelled) {
                    const pdfBlob = new Blob([rawBlob], { type: 'application/pdf' });
                    localBlobUrl = URL.createObjectURL(pdfBlob);
                    setBlobUrl(localBlobUrl);
                    setLoading(false);
                }
            })
            .catch(() => { if (!cancelled) { setLoadError(true); setLoading(false); } });
        return () => { cancelled = true; if (localBlobUrl) URL.revokeObjectURL(localBlobUrl); };
    }, [applicationId]);

    if (loading) return <div className="flex items-center justify-center h-full text-[var(--text-tertiary)]"><div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;
    if (loadError || !blobUrl) return <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)] text-sm p-8 text-center"><p className="mb-2">Preview unavailable</p><p className="text-[11px]">Could not load the resume.</p></div>;
    return (
        <div className="w-full h-full relative">
            <object data={blobUrl} type="application/pdf" className="absolute inset-0 w-full h-full">
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <p className="text-sm text-[var(--text-secondary)] mb-4">PDF viewer not supported in this browser.</p>
                    <a href={blobUrl} download="resume.pdf" className="px-4 py-2 bg-[var(--accent)] text-white rounded-md text-[13px] font-medium">Download PDF</a>
                </div>
            </object>
        </div>
    );
};

// ── Status Config ──────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
    pending:      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    reviewing:    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    shortlisted:  'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    interviewing: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400',
    hired:        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    rejected:     'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
};

// ═══════════════════════════════════════════════════════════════════════════
interface ReviewApplicationsPageProps {
    initialFilter?: string;
    autoExpandAppId?: string;
    initialJobId?: string;
}

const ReviewApplicationsPage: React.FC<ReviewApplicationsPageProps> = ({ initialFilter, autoExpandAppId, initialJobId }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId || null);
    const [applications, setApplications] = useState<any[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [loadingApps, setLoadingApps] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [expandedApp, setExpandedApp] = useState<string | null>(autoExpandAppId || null);
    const [filter, setFilter] = useState<string>(initialFilter || 'all');
    const [isDeletingJob, setIsDeletingJob] = useState(false);
    
    // Interview Scheduling state
    const [schedulingApp, setSchedulingApp] = useState<any>(null);
    const [scheduleForm, setScheduleForm] = useState({
        timeSlots: [''],
        meetingType: 'Google Meet',
        meetingLink: '',
    });
    const [isScheduling, setIsScheduling] = useState(false);

    const [isEditingJob, setIsEditingJob] = useState(false);
    const [editingForm, setEditingForm] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [isSavingJob, setIsSavingJob] = useState(false);
    const [resumeOpen, setResumeOpen] = useState(false);
    const [projectsOpen, setProjectsOpen] = useState(false);

    // AI Feedback Loop
    const [feedbackApp, setFeedbackApp] = useState<any>(null);
    const [feedbackReason, setFeedbackReason] = useState<string | null>(null);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    
    // Filtering & Sorting
    const [sort, setSort] = useState('match_score_desc');
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'pipeline'>('grid');
    const [compareSelection, setCompareSelection] = useState<string[]>([]);

    const toggleCompare = (id: string) => {
        setCompareSelection(prev => {
            if (!Array.isArray(prev)) return [id];
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= 4) {
                Swal.fire({ title: 'Limit Reached', text: 'You can compare up to 4 candidates at a time.', icon: 'warning', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000 });
                return prev;
            }
            return [...prev, id];
        });
    };

    // AI Match state
    const [matchResults, setMatchResults] = useState<Record<string, any>>({});
    const [matchLoading, setMatchLoading] = useState<string | null>(null);

    const handleComputeMatch = async (applicationId: string) => {
        setMatchLoading(applicationId);
        try {
            const result = await matchingAPI.computeMatch(applicationId);
            setMatchResults(prev => ({ ...prev, [applicationId]: result }));
        } catch (err: any) {
            Swal.fire({ title: 'AI Match Failed', text: err.message, icon: 'error', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2500 });
        } finally {
            setMatchLoading(null);
        }
    };

    useEffect(() => {
        jobsAPI.getMyJobs()
            .then(data => { 
                const arr = Array.isArray(data) ? data : (data.jobs || []); 
                setJobs(arr); 
                if (arr.length > 0) {
                    // Only set default if we don't already have one from props OR previous selection
                    if (!selectedJobId && !initialJobId) {
                        setSelectedJobId(arr[0]._id || arr[0].id);
                    } else if (initialJobId && !selectedJobId) {
                        // Ensure initialJobId is set if selectedJobId is still null
                        setSelectedJobId(initialJobId);
                    }
                }
            })
            .catch(() => {})
            .finally(() => setLoadingJobs(false));
        categoriesAPI.getAll().then(data => setCategories(Array.isArray(data) ? data : [])).catch(() => {});
    }, [initialJobId]);

    // Auto-fetch match scores for visible applications
    const handleBatchScore = useCallback(async (jobId: string) => {
        try {
            const batchResult = await matchingAPI.batchMatch(jobId);
            if (batchResult?.results) {
                const newResults: Record<string, any> = {};
                for (const item of batchResult.results) {
                    newResults[item.applicationId] = item.result;
                }
                setMatchResults(prev => ({ ...prev, ...newResults }));
            }
        } catch (err) {
            console.warn('Batch score failed:', err);
        }
    }, [matchingAPI]);

    useEffect(() => {
        if (initialJobId) setSelectedJobId(initialJobId);
        if (initialFilter) setFilter(initialFilter);
        if (autoExpandAppId) setExpandedApp(autoExpandAppId);
    }, [initialJobId, initialFilter, autoExpandAppId]);

    useEffect(() => {
        if (!selectedJobId) return;
        setLoadingApps(true);
        fetchWithAuth(`${API_BASE}/applications/job/${selectedJobId}`)
            .then(data => {
                const apps = Array.isArray(data) ? data : [];
                setApplications(apps);
                
                // Pre-fill aiMatchResult if it already exists on the database
                const existingMatches: Record<string, any> = {};
                apps.forEach(app => {
                    if (app.aiMatchResult) existingMatches[app._id || app.id] = app.aiMatchResult;
                });
                if (Object.keys(existingMatches).length > 0) {
                    setMatchResults(prev => ({ ...prev, ...existingMatches }));
                }

                // 🔥 Trigger batch scoring if applications exist
                if (apps.length > 0) {
                    handleBatchScore(selectedJobId);
                }
            })
            .catch(() => setApplications([]))
            .finally(() => setLoadingApps(false));
    }, [selectedJobId, handleBatchScore]);

    const handleStatusChange = async (appId: string, status: string) => {
        setUpdatingId(appId);
        try {
            const currentApp = applications.find(a => (a._id === appId || a.id === appId));
            const match = matchResults[appId] || currentApp?.aiMatchResult;
            
            await applicationsAPI.updateStatus(appId, status, match || null);
            setApplications(prev => prev.map(a => (a._id === appId || a.id === appId) ? { ...a, status, aiMatchResult: match || a.aiMatchResult } : a));
            
            // Trigger AI Feedback Loop if surprising decision
            if (status === 'rejected' && match && match.matchScore >= 80) {
                setFeedbackApp({ id: appId, name: currentApp?.userId?.name || 'Candidate', score: match.matchScore, type: 'rejected_high' });
            }

            Swal.fire({ title: status === 'shortlisted' ? 'Shortlisted' : 'Rejected', icon: status === 'shortlisted' ? 'success' : 'error', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 1500 });
        } catch {}
        setUpdatingId(null);
    };

    const handleSubmitFeedback = async (reasonCode: string) => {
        if (!feedbackApp) return;
        setIsSubmittingFeedback(true);
        try {
            await applicationsAPI.submitFeedback(feedbackApp.id, {
                wasAiWrong: true,
                reasonCode
            });
            Swal.fire({ title: 'Feedback Recorded', text: 'AI will learn from this decision.', icon: 'info', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000 });
            setFeedbackApp(null);
        } catch (err) {
            console.error('Feedback failed:', err);
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const handleDeleteJob = async () => {
        if (!selectedJobId || !window.confirm("Delete this job permanently?")) return;
        setIsSavingJob(true);
        try {
            await jobsAPI.delete(selectedJobId);
            setJobs(prev => prev.filter(j => j._id !== selectedJobId && j.id !== selectedJobId));
            const remaining = jobs.filter(j => j._id !== selectedJobId && j.id !== selectedJobId);
            setSelectedJobId(remaining.length > 0 ? (remaining[0]._id || remaining[0].id) : null);
        } catch { alert('Failed to delete'); }
        finally { setIsSavingJob(false); }
    };

    const handleUpdateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedJobId || !editingForm) return;
        setIsSavingJob(true);
        try {
            const updated = await jobsAPI.update(selectedJobId, editingForm);
            setJobs(prev => prev.map(j => (j._id === selectedJobId || j.id === selectedJobId) ? updated : j));
            setIsEditingJob(false);
        } catch { alert('Failed to update'); }
        finally { setIsSavingJob(false); }
    };

    const handleScheduleInterview = async () => {
        if (!schedulingApp) return;
        setIsScheduling(true);
        try {
            const appId = schedulingApp._id || schedulingApp.id;
            const match = matchResults[appId] || schedulingApp.aiMatchResult;

            await applicationsAPI.scheduleInterview(appId, {
                timeSlots: scheduleForm.timeSlots.filter(t => t.trim() !== ''),
                meetingType: scheduleForm.meetingType,
                meetingLink: scheduleForm.meetingLink
            });
            
            setApplications(prev => prev.map(a => (a._id || a.id) === appId ? { ...a, status: 'interviewing' } : a));
            
            // Trigger AI Feedback Loop if surprising decision
            if (match && match.matchScore <= 50) {
                setFeedbackApp({ id: appId, name: schedulingApp.applicant?.name || 'Candidate', score: match.matchScore, type: 'selected_low' });
            }

            Swal.fire({ title: 'Interview Scheduled', icon: 'success', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000 });
            setSchedulingApp(null);
        } catch {
            Swal.fire({ title: 'Schedule Failed', icon: 'error', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000 });
        } finally {
            setIsScheduling(false);
        }
    };

    const handleSkipScheduling = async () => {
        if (!schedulingApp) return;
        const appId = schedulingApp._id || schedulingApp.id;
        await handleStatusChange(appId, 'interviewing');
        setSchedulingApp(null);
    };

    const startEditing = () => {
        const job = jobs.find(j => (j._id === selectedJobId || j.id === selectedJobId));
        if (job) {
            setEditingForm({ title: job.title, company: job.company, location: job.location, type: job.type || 'Remote', pay: job.pay, description: job.description });
            setIsEditingJob(true);
        }
    };

    const handleResumeDownload = async (applicationId: string, applicantName?: string) => {
        try {
            const endpoint = applicationsAPI.getResumeEndpoint(applicationId, 'download');
            const blob = await fetchBlobWithAuth(endpoint);
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = downloadUrl; a.download = `${(applicantName || 'candidate').replace(/\s+/g, '_')}_resume`;
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(downloadUrl);
        } catch { Swal.fire({ title: 'Download failed', icon: 'error', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 1500 }); }
    };

    // Keyboard shortcuts when dossier is open
    useEffect(() => {
        if (!expandedApp) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setExpandedApp(null);
            if (e.key === 's' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); handleStatusChange(expandedApp, 'shortlisted'); }
            if (e.key === 'r' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); handleStatusChange(expandedApp, 'rejected'); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [expandedApp]);

    // Auto-trigger AI match when dossier opens (if not already computed)
    useEffect(() => {
        if (!expandedApp) {
            setResumeOpen(false);
            setProjectsOpen(false);
            return;
        }
        if (!matchResults[expandedApp] && matchLoading !== expandedApp) {
            handleComputeMatch(expandedApp);
        }
    }, [expandedApp]);

    // Processed applications based on filter and sort
    const processedApplications = useMemo(() => {
        let filtered = applications.filter(app => {
            const match = matchResults[app._id || app.id] || app.aiMatchResult;
            
            // Base filters (status)
            if (filter === 'shortlisted' && app.status !== 'shortlisted') return false;
            if (filter === 'needs_review' && app.status !== 'pending' && app.status !== 'reviewing') return false;
            
            // AI Performance filters
            if (filter === 'high_match' && (!match || match.matchScore < 80)) return false;
            if (filter === 'strong_comm' && (!match || match.subScores?.communication < 80)) return false;
            if (filter === 'has_projects' && !((app.customLinks && app.customLinks.length > 0) || match?.signalAvailability?.projects)) return false;
            if (filter === 'low_risk') {
                const hasNoRedFlags = match?.subScores ? Object.values(match.subScores).every((score: any) => typeof score === 'number' && score >= 60) : true;
                if (!(match?.matchScore >= 75 && hasNoRedFlags && !!app.videoUrl)) return false;
            }

            // New High-Speed filters
            if (filter === 'ready_to_interview' && app.status !== 'shortlisted') return false;
            if (filter === 'top_10') {
                // This will be handled after sorting, but for now we filter by score
                if (!match || match.matchScore < 90) return false;
            }
            if (filter === 'recently_applied') {
                const oneDayAgo = new Date(); oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                if (new Date(app.createdAt) < oneDayAgo) return false;
            }

            if (filter === 'mismatch') {
                if (!match) return false;
                const isMismatch = (app.status === 'rejected' && match.matchScore >= 80) || 
                                  ((app.status === 'shortlisted' || app.status === 'interviewing') && match.matchScore <= 40);
                if (!isMismatch) return false;
            }
            
            return true;
        });

        filtered.sort((a, b) => {
            if (sort === 'communication') {
                const scoreA = matchResults[a._id || a.id]?.subScores?.communication || a.aiMatchResult?.subScores?.communication || 0;
                const scoreB = matchResults[b._id || b.id]?.subScores?.communication || b.aiMatchResult?.subScores?.communication || 0;
                return scoreB - scoreA;
            }
            if (sort === 'newest' || sort === 'recent') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            if (sort === 'match_score_desc') {
                const scoreA = matchResults[a._id || a.id]?.matchScore || a.aiMatchResult?.matchScore || -1;
                const scoreB = matchResults[b._id || b.id]?.matchScore || b.aiMatchResult?.matchScore || -1;
                if (scoreA !== scoreB) return scoreB - scoreA;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return 0;
        });

        return filtered;
    }, [applications, matchResults, filter, sort]);

    // ── MATCH SCORE HELPERS FOR CARD ──────────────────────────────────────
    const getScoreColor = (score: number) => score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
    const getScoreRingColor = (score: number) => score >= 75 ? 'stroke-emerald-400' : score >= 50 ? 'stroke-amber-400' : 'stroke-red-400';
    const getScoreBorderColor = (score: number) => score >= 75 ? 'border-emerald-500/30' : score >= 50 ? 'border-amber-500/30' : 'border-red-500/30';

    // ── INPUT STYLE ────────────────────────────────────────────────────────
    const inputClass = "w-full bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all duration-100";

    return (
        <div className="h-[calc(100vh-49px)] flex animate-fade-in">

            {/* ── Sidebar: Job List ────────────────────────────────────────── */}
            <aside className="w-64 shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--bg)] hidden lg:flex">
                <div className="p-3 border-b border-[var(--border)]">
                    <p className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Your Roles</p>
                </div>
                {loadingJobs ? (
                    <div className="p-4 text-center text-[11px] text-[var(--text-tertiary)]">Loading…</div>
                ) : jobs.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-[var(--text-tertiary)]">No jobs posted</div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        {jobs.map(job => {
                            const id = job._id || job.id;
                            const isActive = selectedJobId === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => setSelectedJobId(id)}
                                    className={`w-full text-left px-3 py-2.5 border-b border-[var(--border)] transition-colors duration-75
                                        ${isActive ? 'bg-[var(--accent-subtle)]' : 'hover:bg-[var(--surface-hover)]'}`}
                                >
                                    <p className={`text-[13px] font-medium truncate ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>{job.title}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <p className="text-[11px] text-[var(--text-tertiary)] truncate">{job.company}</p>
                                        {(job.applicationCount || 0) > 0 && (
                                            <span className="text-[10px] bg-[var(--surface)] text-[var(--text-secondary)] px-1 py-0.5 rounded font-medium">
                                                {job.applicationCount}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </aside>

            {/* ── Main Panel ───────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {!selectedJobId ? (
                    <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
                        Select a role to review applications
                    </div>
                ) : loadingApps ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Job header bar */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--bg)] shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-7 h-7 rounded-md bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[11px] font-semibold text-[var(--text-secondary)] shrink-0">
                                    {(jobs.find(j => j._id === selectedJobId || j.id === selectedJobId)?.company || 'J')[0]}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-medium text-[var(--text-primary)] truncate">
                                        {jobs.find(j => j._id === selectedJobId || j.id === selectedJobId)?.title}
                                    </h2>
                                    <p className="text-[11px] text-[var(--text-tertiary)]">{applications.length} applicant{applications.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* View Toggle */}
                                {applications.length > 0 && (
                                    <div className="flex items-center bg-[var(--surface-hover)] p-0.5 rounded-lg border border-[var(--border)] shrink-0">
                                        <button onClick={() => { setViewMode('grid'); setIsCompareMode(false); }} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${viewMode === 'grid' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow border border-[var(--border)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-transparent'}`}>Grid</button>
                                        <button onClick={() => { setViewMode('pipeline'); setIsCompareMode(false); }} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${viewMode === 'pipeline' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow border border-[var(--border)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-transparent'}`}>Pipeline</button>
                                    </div>
                                )}
                                
                                {/* Score All button */}
                                {applications.length > 0 && viewMode === 'grid' && (
                                    <>
                                        <button
                                            onClick={() => selectedJobId && handleBatchScore(selectedJobId)}
                                            disabled={matchLoading === 'batch'}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                            </svg>
                                            Score All
                                        </button>
                                        <button
                                            onClick={() => {
                                                const entering = !isCompareMode;
                                                setIsCompareMode(entering);
                                                if (entering && compareSelection.length === 0) {
                                                    setCompareSelection(processedApplications.slice(0, 3).map((a: any) => a._id || a.id));
                                                } else if (!entering) {
                                                    setCompareSelection([]);
                                                }
                                                setExpandedApp(null);
                                            }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150 border ${
                                                isCompareMode 
                                                ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600' 
                                                : compareSelection.length > 0 
                                                    ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-500'
                                                    : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
                                            }`}
                                        >
                                            {isCompareMode ? 'Exit Decision Mode' 
                                              : compareSelection.length > 0 
                                                ? `Compare ${compareSelection.length} Candidates` 
                                                : 'Decision Mode'}
                                        </button>
                                    </>
                                )}
                                <button onClick={startEditing} className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] px-3 py-1.5 rounded-md hover:bg-[var(--surface-hover)] transition-colors duration-100">
                                    Edit Role
                                </button>
                            </div>
                        </div>

                        {/* ── Smart Filters & Sort Bar (Grid Only) ─────────────────────────────── */}
                        {applications.length > 0 && viewMode === 'grid' && (
                            <div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--border)] bg-[var(--bg)] shrink-0 overflow-x-auto">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] mr-2">Filters:</span>
                                    
                                    {[
                                        { id: 'all', label: 'All' },
                                        { id: 'needs_review', label: 'Needs Review' },
                                        { id: 'ready_to_interview', label: '✅ Ready' },
                                        { id: 'mismatch', label: '⚠️ Audit' },
                                        { id: 'top_10', label: '🏆 Top 10%' },
                                        { id: 'high_match', label: '⭐ High Match' },
                                        { id: 'strong_comm', label: '🗣️ Comm' },
                                        { id: 'has_projects', label: '💻 Projects' },
                                        { id: 'low_risk', label: '🛡️ Low Risk' },
                                        { id: 'recently_applied', label: '🕒 Recent' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setFilter(f.id)}
                                            className={`px-3 py-1 text-[11px] font-bold rounded-md border whitespace-nowrap transition-all duration-150 ${
                                                filter === f.id 
                                                ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-600/20' 
                                                : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 pl-4 border-l border-[var(--border)]">
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)]">Sort by:</span>
                                    <select
                                        value={sort}
                                        onChange={(e) => setSort(e.target.value)}
                                        className="bg-[var(--surface)] border border-[var(--border)] text-[11px] font-bold text-[var(--text-primary)] rounded-md outline-none py-1.5 pl-2 pr-7 appearance-none cursor-pointer hover:border-[var(--border-strong)] transition-colors"
                                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                                    >
                                        <option value="match_score_desc">Match Score</option>
                                        <option value="communication">Communication</option>
                                        <option value="recent">Recent</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* ═══ VIEW MODES ═══════════════════════════════════════════════ */}
                        {applications.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-tertiary)]">
                                No applications for this role yet
                            </div>
                        ) : viewMode === 'pipeline' ? (
                            <div className="flex-1 flex overflow-x-auto p-6 gap-6 bg-[#09090b] items-start">
                                {[
                                    { title: 'New', status: 'pending', color: 'text-zinc-500' },
                                    { title: 'Reviewed', status: 'reviewing', color: 'text-zinc-400' },
                                    { title: 'Shortlisted', status: 'shortlisted', color: 'text-blue-400' },
                                    { title: 'Interviewing', status: 'interviewing', color: 'text-indigo-400' },
                                    { title: 'Hired', status: 'hired', color: 'text-emerald-500' }
                                ].map(col => {
                                    const colApps = processedApplications.filter((a: any) => a.status?.toLowerCase() === col.status?.toLowerCase());
                                    return (
                                        <div 
                                            key={col.status} 
                                            className={`w-72 shrink-0 flex flex-col bg-[var(--surface-hover)] rounded-xl border-2 border-transparent max-h-full overflow-hidden transition-all
                                                ${col.status === 'shortlisted' ? 'bg-blue-500/5 border-blue-500/20 shadow-lg' : ''}
                                            `}
                                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-violet-500/50', 'bg-violet-500/5'); }}
                                            onDragLeave={(e) => { e.currentTarget.classList.remove('border-violet-500/50', 'bg-violet-500/5'); }}
                                            onDrop={(e) => {
                                                e.currentTarget.classList.remove('border-violet-500/50', 'bg-violet-500/5');
                                                const appId = e.dataTransfer.getData('appId');
                                                if (appId) handleStatusChange(appId, col.status);
                                            }}
                                        >
                                            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface)] shrink-0">
                                                <span className={`text-[12px] font-bold uppercase tracking-wider ${col.color}`}>{col.title}</span>
                                                <span className="text-[10px] text-[var(--text-secondary)] font-bold bg-[#111113] border border-[var(--border)] px-2.5 py-1 rounded-full">{colApps.length}</span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[100px] scrollbar-hide">
                                                {colApps.map((app: any) => {
                                                    const id = app._id || app.id;
                                                    const match = matchResults[id] || app.aiMatchResult;
                                                    return (
                                                        <div 
                                                            key={id} 
                                                            draggable
                                                            onDragStart={(e) => e.dataTransfer.setData('appId', id)}
                                                            className="bg-[var(--bg)] p-3.5 rounded-xl border border-[var(--border)] shadow-sm hover:border-[var(--accent)] hover:shadow-xl transition-all cursor-grab active:cursor-grabbing group animate-in fade-in slide-in-from-bottom-2 duration-300"
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <img src={app.applicant?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.applicant?.name || 'C')}&size=24`} className="w-6 h-6 rounded-full border border-[var(--border)]" alt="" />
                                                                    <h3 className="text-[12px] font-bold text-[var(--text-primary)] truncate">{app.applicant?.name || 'Candidate'}</h3>
                                                                </div>
                                                                {match && (
                                                                    <span className={`text-[12px] font-black tabular-nums ${match.matchScore >= 75 ? 'text-emerald-500' : match.matchScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                                                        {match.matchScore}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {match?.topStrength && (
                                                                <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-tight bg-[var(--surface)] p-2 rounded-lg border border-[var(--border)] font-medium">
                                                                    {match.topStrength}
                                                                </p>
                                                            )}
                                                            <div className="mt-3 flex items-center justify-between">
                                                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${STATUS_STYLES[app.status]}`}>{app.status}</span>
                                                                <button onClick={() => setExpandedApp(id)} className="text-[10px] font-bold text-[var(--accent)] hover:underline">Details →</button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                {colApps.length === 0 && (
                                                    <div className="text-center p-6 border-2 border-dashed border-[var(--border)] rounded-xl opacity-30">
                                                        <p className="text-[11px] font-bold uppercase">Empty</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : processedApplications.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-sm text-[var(--text-tertiary)] gap-2">
                                <p>No candidates match these filters</p>
                                <button onClick={() => setFilter('all')} className="text-violet-400 hover:text-violet-300 underline text-[12px]">Clear filters</button>
                            </div>
                        ) : isCompareMode ? (
                            <div className="flex-1 flex overflow-hidden p-5 gap-5 items-stretch min-h-0 bg-[#09090b]">
                                {compareSelection.map(id => {
                                    const app = applications.find(a => (a._id || a.id) === id);
                                    if (!app) return null;
                                    const match = matchResults[id] || app.aiMatchResult;
                                    const applicantName = app.applicant?.name || 'Candidate';
                                    
                                    return (
                                        <div key={id} className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] border border-[var(--border)] rounded-xl overflow-hidden shadow-2xl animate-fade-in">
                                            <div className="p-4 flex items-center justify-between border-b border-[var(--border)] shrink-0 bg-[var(--surface)]">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <img src={app.applicant?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(applicantName)}`} className="w-10 h-10 rounded-full border border-[var(--border)]" alt="" />
                                                    <div className="min-w-0">
                                                        <h3 className="text-[14px] font-bold text-[var(--text-primary)] truncate">{applicantName}</h3>
                                                        <p className="text-[11px] text-[var(--text-tertiary)] truncate">Rank #{processedApplications.findIndex(a => (a._id || a.id) === id) + 1}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0">
                                                    <span className={`text-2xl font-black tabular-nums ${match?.matchScore >= 75 ? 'text-emerald-500' : match?.matchScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                                        {match?.matchScore || '--'}
                                                    </span>
                                                    <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--text-tertiary)]">Match Score</span>
                                                </div>
                                            </div>

                                            <div className="aspect-video w-full bg-zinc-950 relative border-b border-[var(--border)] shrink-0">
                                                {app.videoUrl ? (
                                                    <video src={getMediaUrl(app.videoUrl)} controls className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                                                        <span className="text-2xl">📷</span>
                                                        <p className="text-xs font-bold">MISSING VIDEO</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 scrollbar-hide">
                                                {match ? (
                                                    <>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {[
                                                                { label: 'Video', ok: !!app.videoUrl },
                                                                { label: 'Resume', ok: !!(match.signalAvailability?.resume || app.resumeUrl) },
                                                                { label: 'Projects', ok: !!(match.signalAvailability?.projects || (app.customLinks && app.customLinks.length > 0)) }
                                                            ].map(v => (
                                                                <div key={v.label} className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg border ${v.ok ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-zinc-500/5 border-zinc-500/20 text-zinc-500'}`}>
                                                                    <span className="text-[12px] font-bold">{v.ok ? '✓' : '✗'}</span>
                                                                    <span className="text-[9px] uppercase tracking-widest font-bold">{v.label}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                                                                <p className="text-[9px] uppercase tracking-widest font-bold text-[var(--text-tertiary)] mb-1">Top Strength</p>
                                                                <p className="text-[11px] font-bold text-emerald-400 leading-tight">▲ {match.topStrength}</p>
                                                            </div>
                                                            <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                                                                <p className="text-[9px] uppercase tracking-widest font-bold text-[var(--text-tertiary)] mb-1">Primary Risk</p>
                                                                <p className="text-[11px] font-bold text-amber-500 leading-tight">▼ {match.risk || 'No significant risk'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2.5">
                                                            <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)]">AI Sub-scores</p>
                                                            {[
                                                                { label: 'Technical Skills', value: match.subScores?.skills || match.subScores?.skillsMatch },
                                                                { label: 'Communication', value: match.subScores?.communication },
                                                                { label: 'Project Impact', value: match.subScores?.projects || match.subScores?.projectRelevance },
                                                                { label: 'Resume Clarity', value: match.subScores?.resume || match.subScores?.resumeQuality }
                                                            ].map(s => {
                                                                const val = s.value || 0;
                                                                return (
                                                                    <div key={s.label} className="space-y-1">
                                                                        <div className="flex justify-between text-[10px] font-bold">
                                                                            <span className="text-[var(--text-secondary)]">{s.label}</span>
                                                                            <span className={val > 0 ? (val >= 75 ? 'text-emerald-400' : val >= 50 ? 'text-amber-400' : 'text-red-400') : 'text-[var(--text-tertiary)]'}>
                                                                                {val > 0 ? `${val}%` : 'N/A'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="w-full bg-[var(--border)] h-1 rounded-full overflow-hidden">
                                                                            <div className={`h-full rounded-full transition-all duration-500 ${val >= 75 ? 'bg-emerald-500' : val >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${val}%` }} />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                ) : matchLoading === id ? (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-[12px] text-[var(--text-tertiary)] italic p-8 text-center gap-4">
                                                        <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                                                        Processing AI Insights...
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                                                        <p className="text-[12px] text-[var(--text-tertiary)] italic">Not scored yet</p>
                                                        <button onClick={() => handleComputeMatch(id)} className="px-5 py-2 bg-violet-600/10 text-violet-400 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-violet-600/20 transition-colors">
                                                            Score Candidate
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-4 border-t border-[var(--border)] mt-auto shrink-0 flex gap-2 bg-[var(--surface)]">
                                                <button
                                                    onClick={() => {
                                                        const appToSchedule = applications.find(a => (a._id || a.id) === id);
                                                        setSchedulingApp(appToSchedule);
                                                        setScheduleForm({ timeSlots: [''], meetingType: 'Google Meet', meetingLink: '' });
                                                    }}
                                                    className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-3 text-[12px] font-black uppercase tracking-widest transition-all shadow-xl shadow-violet-600/20 hover:scale-[1.02] active:scale-[0.98]"
                                                >
                                                    Select Finalist
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(id, 'rejected')}
                                                    className="px-4 py-3 border border-[var(--border)] text-[var(--text-secondary)] hover:text-red-400 hover:border-red-500/30 rounded-lg text-[12px] font-bold transition-colors"
                                                >
                                                    Pass
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {compareSelection.length < 2 && (
                                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--text-tertiary)] text-[12px] p-6 text-center">
                                        <p className="font-semibold mb-2">Need more candidates</p>
                                        <p>Select candidates from the grid or pipeline to compare them here.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {processedApplications.map((app: any, idx) => {
                                        const id = app._id || app.id;
                                        const status = app.status || 'pending';
                                        const match = matchResults[id] || app.aiMatchResult;

                                        return (
                                            <div
                                                key={id}
                                                onClick={() => setExpandedApp(id)}
                                                className="group flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--accent)] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative cursor-pointer"
                                            >
                                                <div className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                                                    #{idx + 1}
                                                </div>
                                                {match && (
                                                    <div className="absolute top-3 right-3 z-20 flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-xl">
                                                        <span className={`text-[14px] font-black tabular-nums leading-none ${match.matchScore >= 75 ? 'text-emerald-400' : match.matchScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                                            {match.matchScore}
                                                        </span>
                                                        <span className="text-[7px] font-bold text-white/50 uppercase tracking-tighter mt-0.5">Score</span>
                                                    </div>
                                                )}
                                                <div className="aspect-[4/5] relative bg-zinc-950 overflow-hidden">
                                                    {app.videoUrl ? (
                                                        <video
                                                            src={getMediaUrl(app.videoUrl)}
                                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                            muted loop playsInline
                                                            onMouseEnter={e => e.currentTarget.play()}
                                                            onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-[var(--bg)] gap-2">
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">No Video</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {match?.topStrength && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-emerald-400 text-[10px] font-bold shrink-0">▲</span>
                                                                <span className="text-[10px] font-bold text-white truncate">{match.topStrength}</span>
                                                            </div>
                                                        )}
                                                        {match?.risk && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-amber-400 text-[10px] font-bold shrink-0">▼</span>
                                                                <span className="text-[10px] font-medium text-white/80 truncate">{match.risk}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="p-3.5 flex flex-col grow">
                                                    <div className="flex items-center justify-between gap-1 mb-3">
                                                        <h3 className="text-[13px] font-bold text-[var(--text-primary)] truncate">{app.applicant?.name}</h3>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setExpandedApp(id); }}
                                                            className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all"
                                                        >
                                                            View Profile
                                                        </button>
                                                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${STATUS_STYLES[status]}`}>
                                                            {status}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2 mt-auto pt-2 border-t border-[var(--border)]">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(id, 'shortlisted'); }}
                                                            className="flex-1 py-2 text-[11px] font-bold bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors"
                                                        >
                                                            Shortlist
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(id, 'rejected'); }}
                                                            className="px-3 py-2 text-[11px] font-bold bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* ═══ Candidate Dossier (Redesigned Split View) ════════════════ */}
            {expandedApp && (() => {
                const app = applications.find(a => (a._id === expandedApp || a.id === expandedApp));
                if (!app) return null;
                const id = app._id || app.id;
                const allUrls = Array.from(app.coverLetter?.matchAll(/https?:\/\/[^\s,]+/g) || []).map((m: any) => m[0]);
                const match = matchResults[id];
                const isAnalyzing = matchLoading === id;

                return (
                    <div className="fixed inset-0 z-[150] flex bg-black/40 animate-fade-in" onClick={() => setExpandedApp(null)}>
                        <div
                            className="ml-auto w-full max-w-4xl bg-[var(--bg)] h-full flex flex-col border-l border-[var(--border)] animate-slide-left"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* ── Header ─────────────────────────────────────── */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] shrink-0">
                                <div className="flex items-center gap-3">
                                    <img src={app.applicant?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.applicant?.name || 'A')}&size=32&background=2563eb&color=fff`} className="w-8 h-8 rounded-full" alt="" />
                                    <div>
                                        <h2 className="text-sm font-medium text-[var(--text-primary)]">{app.applicant?.name}</h2>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${STATUS_STYLES[app.status] || STATUS_STYLES.pending}`}>{app.status}</span>
                                            {match && (
                                                <span className={`text-[10px] font-semibold ${match.matchScore >= 75 ? 'text-emerald-500' : match.matchScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                                    {match.matchScore}% match
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleStatusChange(id, 'shortlisted')} className="px-3 py-1.5 text-[12px] font-medium text-emerald-500 bg-emerald-500/10 rounded-md hover:bg-emerald-500/20 transition-colors">
                                        ⚡ Shortlist
                                    </button>
                                    <button onClick={() => setExpandedApp(null)} className="p-1 px-2 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]">
                                        Esc
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-0 bg-[var(--bg)] flex flex-col">
                                {/* Video Section */}
                                <div className="aspect-video bg-zinc-950 flex items-center justify-center relative group shrink-0">
                                    {app.videoUrl ? (
                                        <video src={getMediaUrl(app.videoUrl)} controls className="w-full h-full object-contain" autoPlay />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-zinc-500 p-8 text-center">
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            <p className="text-[12px] font-bold uppercase tracking-widest">Candidate did not submit a video</p>
                                        </div>
                                    )}
                                </div>

                                {/* Decision HUD Section */}
                                <div className="p-5 border-t border-[var(--border)]">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                                            <span className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-widest">Decision HUD</span>
                                        </div>
                                        {match && (
                                            <span className={`text-[12px] font-black tabular-nums py-1 px-3 rounded-full border ${match.matchScore >= 75 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                {match.matchScore}% Match
                                            </span>
                                        )}
                                    </div>

                                    {isAnalyzing ? (
                                        <div className="py-12 flex flex-col items-center justify-center gap-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] border-dashed">
                                            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                            <p className="text-[11px] font-bold text-violet-400 uppercase tracking-widest">Running AI Auditor...</p>
                                        </div>
                                    ) : match ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                                                    <p className="text-[9px] uppercase tracking-widest font-black text-[var(--text-tertiary)] mb-2">Strengths</p>
                                                    <ul className="space-y-1.5">
                                                        <li className="flex gap-2 items-start">
                                                            <span className="text-emerald-500 text-[10px]">▲</span>
                                                            <p className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">{match.topStrength}</p>
                                                        </li>
                                                        {match.insights?.slice(0, 2).map((ins: string, i: number) => (
                                                            <li key={i} className="flex gap-2 items-start opacity-70">
                                                                <span className="text-emerald-500/60 text-[10px]">▲</span>
                                                                <p className="text-[10px] text-[var(--text-secondary)] leading-tight">{ins}</p>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                                                    <p className="text-[9px] uppercase tracking-widest font-black text-[var(--text-tertiary)] mb-2">Risks</p>
                                                    <p className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">{match.risk || 'No major risks'}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    { label: 'Skills', val: match.subScores?.skillsMatch || match.subScores?.skills },
                                                    { label: 'Project', val: match.subScores?.projectRelevance || match.subScores?.projects },
                                                    { label: 'Comm', val: match.subScores?.communication },
                                                    { label: 'Resume', val: match.subScores?.resumeQuality || match.subScores?.resume }
                                                ].map(s => (
                                                    <div key={s.label} className="p-2 border border-[var(--border)] rounded-lg text-center">
                                                        <div className={`text-[12px] font-black ${s.val > 0 ? (s.val >= 75 ? 'text-emerald-400' : s.val >= 50 ? 'text-amber-400' : 'text-red-400') : 'text-[var(--text-tertiary)]'}`}>
                                                            {s.val > 0 ? `${s.val}%` : 'N/A'}
                                                        </div>
                                                        <div className="text-[8px] uppercase tracking-widest font-bold text-[var(--text-tertiary)]">{s.label}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {match.matchReason && (
                                                <div className="p-4 bg-violet-600/5 border border-violet-500/20 rounded-xl">
                                                    <p className="text-[11px] font-black text-violet-400 uppercase tracking-widest mb-1.5">AI Reasoning</p>
                                                    <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed italic">"{match.matchReason}"</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button onClick={() => handleComputeMatch(id)} className="w-full py-8 border-2 border-dashed border-[var(--border)] rounded-xl text-[12px] font-bold text-violet-400 hover:bg-violet-500/5">
                                            Initialize AI Audit Engine
                                        </button>
                                    )}
                                </div>

                                {/* Project Links Section */}
                                <div className="border-t border-[var(--border)]">
                                    <button onClick={() => setProjectsOpen(!projectsOpen)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-hover)]">
                                        <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Project Links & Notes</span>
                                        <span className="text-[10px] text-[var(--text-tertiary)]">{projectsOpen ? 'Collapse' : 'Expand'}</span>
                                    </button>
                                    {projectsOpen && (
                                        <div className="px-5 pb-5 animate-fade-in">
                                            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{app.coverLetter || 'No notes.'}</p>
                                            {allUrls.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {allUrls.map((url: string, i: number) => (
                                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-1 rounded hover:underline">
                                                            {url.replace('https://', '').slice(0, 30)}...
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Resume Section */}
                                <div className="border-t border-[var(--border)]">
                                    <button onClick={() => setResumeOpen(!resumeOpen)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-hover)]">
                                        <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Resume</span>
                                        <span className="text-[10px] text-[var(--text-tertiary)]">{resumeOpen ? 'Collapse' : 'Expand'}</span>
                                    </button>
                                    {resumeOpen && (
                                        <div className="px-5 pb-5 animate-fade-in">
                                            {app.resumeUrl ? (
                                                <div className="h-[500px] border border-[var(--border)] rounded-lg overflow-hidden">
                                                    <PdfPreview applicationId={id} />
                                                </div>
                                            ) : (
                                                <p className="text-[12px] text-[var(--text-tertiary)]">No resume uploaded.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface)] shrink-0">
                                <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest">
                                    <span><kbd className="px-1.5 py-0.5 bg-[var(--bg)] border border-[var(--border)] rounded mr-1">S</kbd> Shortlist</span>
                                    <span><kbd className="px-1.5 py-0.5 bg-[var(--bg)] border border-[var(--border)] rounded mr-1">R</kbd> Reject</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => handleStatusChange(id, 'rejected')} className="px-4 py-2 text-[12px] font-bold text-red-500 hover:bg-red-500/10 rounded-lg">Pass</button>
                                    <button 
                                        onClick={() => {
                                            setSchedulingApp(app);
                                            setScheduleForm({ timeSlots: [''], meetingType: 'Google Meet', meetingLink: '' });
                                            setExpandedApp(null);
                                        }}
                                        className="px-6 py-2 bg-violet-600 text-white text-[12px] font-black rounded-lg hover:bg-violet-500 shadow-lg shadow-violet-600/20"
                                    >
                                        Schedule Interview
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}


            {/* ═══ Edit Job Modal ═══════════════════════════════════════════ */}
            {isEditingJob && editingForm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 animate-fade-in" onClick={() => setIsEditingJob(false)}>
                    <div className="bg-[var(--bg)] w-full max-w-lg rounded-lg border border-[var(--border)] shadow-xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
                            <h2 className="text-sm font-medium text-[var(--text-primary)]">Edit Job</h2>
                            <button onClick={() => setIsEditingJob(false)} className="p-1 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateJob} className="p-5 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1 block">Title</label><input type="text" value={editingForm.title} onChange={e => setEditingForm({...editingForm, title: e.target.value})} className={inputClass} required /></div>
                                <div><label className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1 block">Company</label><input type="text" value={editingForm.company} onChange={e => setEditingForm({...editingForm, company: e.target.value})} className={inputClass} required /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1 block">Location</label><input type="text" value={editingForm.location} onChange={e => setEditingForm({...editingForm, location: e.target.value})} className={inputClass} required /></div>
                                <div><label className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1 block">Pay</label><input type="text" value={editingForm.pay} onChange={e => setEditingForm({...editingForm, pay: e.target.value})} className={inputClass} required /></div>
                            </div>
                            <div><label className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1 block">Description</label><textarea value={editingForm.description} onChange={e => setEditingForm({...editingForm, description: e.target.value})} rows={4} className={`${inputClass} resize-none`} required /></div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={isSavingJob} className="flex-1 py-2 bg-[var(--text-primary)] text-[var(--bg)] text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
                                    {isSavingJob ? 'Saving…' : 'Update'}
                                </button>
                                <button type="button" onClick={handleDeleteJob} disabled={isSavingJob} className="px-4 py-2 text-[13px] font-medium text-[var(--danger)] bg-[var(--danger-subtle)] rounded-md hover:opacity-80 transition-opacity">
                                    Delete
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══ Interview Scheduling Modal ════════════════════════════════ */}
            {schedulingApp && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setSchedulingApp(null)}>
                    <div className="bg-[var(--bg)] w-full max-w-md rounded-xl border border-[var(--border-strong)] shadow-2xl overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center font-bold text-[var(--text-primary)]">
                                    {schedulingApp.applicant?.name?.charAt(0) || 'C'}
                                </div>
                                <div>
                                    <h2 className="text-[14px] font-bold text-[var(--text-primary)] leading-tight">{schedulingApp.applicant?.name || 'Candidate'}</h2>
                                    <p className="text-[12px] text-[var(--text-tertiary)]">{jobs.find(j => (j._id || j.id) === selectedJobId)?.title || 'Role'}</p>
                                </div>
                            </div>
                            <button onClick={() => setSchedulingApp(null)} className="p-1 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-white transition-colors">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-5">
                            {/* Time Slots */}
                            <div className="space-y-3">
                                <label className="text-[12px] font-semibold text-[var(--text-secondary)] block uppercase tracking-wider">Select Time Slots</label>
                                {scheduleForm.timeSlots.map((slot, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input 
                                            type="datetime-local" 
                                            value={slot} 
                                            onChange={(e) => {
                                                const newSlots = [...scheduleForm.timeSlots];
                                                newSlots[index] = e.target.value;
                                                setScheduleForm({ ...scheduleForm, timeSlots: newSlots });
                                            }}
                                            className={`${inputClass} bg-[#111113] border-zinc-800 text-sm`}
                                        />
                                        {scheduleForm.timeSlots.length > 1 && (
                                            <button 
                                                onClick={() => {
                                                    const newSlots = scheduleForm.timeSlots.filter((_, i) => i !== index);
                                                    setScheduleForm({ ...scheduleForm, timeSlots: newSlots });
                                                }}
                                                className="text-[var(--text-tertiary)] hover:text-red-400 p-2"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {scheduleForm.timeSlots.length < 3 && (
                                    <button 
                                        onClick={() => setScheduleForm({ ...scheduleForm, timeSlots: [...scheduleForm.timeSlots, ''] })}
                                        className="text-[12px] font-medium text-violet-400 hover:text-violet-300"
                                    >
                                        + Add another time slot
                                    </button>
                                )}
                            </div>

                            {/* Meeting Info */}
                            <div className="space-y-3">
                                <label className="text-[12px] font-semibold text-[var(--text-secondary)] block uppercase tracking-wider">Interview Mode</label>
                                <select 
                                    value={scheduleForm.meetingType}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, meetingType: e.target.value })}
                                    className={`${inputClass} bg-[#111113] border-zinc-800 text-sm appearance-none`}
                                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%24%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                                >
                                    <option value="Google Meet">Google Meet</option>
                                    <option value="Zoom">Zoom</option>
                                    <option value="Phone">Phone Call</option>
                                    <option value="External">External System (Add Link)</option>
                                </select>
                            </div>

                            <div>
                                <input 
                                    type="text" 
                                    placeholder="Paste Google Meet, Zoom link, or instructions..." 
                                    value={scheduleForm.meetingLink}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, meetingLink: e.target.value })}
                                    className={`${inputClass} bg-[#111113] border-zinc-800 text-sm`}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface)] flex flex-col gap-2">
                            <button 
                                onClick={handleScheduleInterview} 
                                disabled={isScheduling || !scheduleForm.timeSlots[0]}
                                className="w-full py-2.5 bg-violet-600 text-white text-[13px] font-bold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50 flex items-center justify-center shadow-lg shadow-violet-500/20"
                            >
                                {isScheduling ? 'Sending...' : 'Send Invite'}
                            </button>
                            <button 
                                onClick={handleSkipScheduling}
                                disabled={isScheduling}
                                className="w-full py-2.5 text-[12px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                Skip & mark as interviewing
                            </button>
                        </div>

                    </div>
                </div>
            )}
            {/* ═══ AI Feedback Loop Toast ══════════════════════════════════ */}
            {feedbackApp && (
                <div className="fixed bottom-6 right-6 z-[300] w-80 bg-zinc-900 border border-violet-500/30 rounded-xl shadow-2xl p-4 animate-slide-up">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-[11px] font-bold text-violet-400 uppercase tracking-widest">AI Feedback Loop</span>
                        </div>
                        <button onClick={() => setFeedbackApp(null)} className="text-zinc-500 hover:text-white transition-colors">
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[12px] text-zinc-300 leading-tight mb-4">
                        {feedbackApp.type === 'rejected_high' 
                            ? `You rejected ${feedbackApp.name} despite a high AI score (${feedbackApp.score}%). Was the AI wrong?`
                            : `You moved ${feedbackApp.name} forward despite a low AI score (${feedbackApp.score}%). Was the AI wrong?`
                        }
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { code: 'wrong_skills', label: 'Wrong skills' },
                            { code: 'too_junior', label: 'Too junior' },
                            { code: 'poor_comm', label: 'Poor comm' },
                            { code: 'other', label: 'Other' }
                        ].map(reason => (
                            <button
                                key={reason.code}
                                onClick={() => handleSubmitFeedback(reason.code)}
                                disabled={isSubmittingFeedback}
                                className="px-2 py-2 text-[10px] font-medium bg-zinc-800 border border-zinc-700 rounded-lg hover:border-violet-500/50 hover:bg-zinc-800/80 transition-all text-zinc-300 hover:text-white disabled:opacity-50"
                            >
                                {reason.label}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => setFeedbackApp(null)}
                        className="w-full mt-3 text-[10px] text-zinc-500 hover:text-zinc-400 text-center uppercase tracking-widest font-bold"
                    >
                        Skip
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReviewApplicationsPage;
