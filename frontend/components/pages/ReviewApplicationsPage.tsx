import React, { useState, useEffect, useRef } from 'react';
import { jobsAPI, applicationsAPI, categoriesAPI, fetchWithAuth, fetchBlobWithAuth } from '../../services/api';
import { PencilSquareIcon, XMarkIcon, CheckCircleIcon as CheckIcon } from '../icons/Icons';
import Swal from 'sweetalert2';

const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001/api';

// Component to preview PDF inline via authenticated resume proxy
const PdfPreview: React.FC<{ applicationId: string }> = ({ applicationId }) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [isPdfBlob, setIsPdfBlob] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        let localBlobUrl: string | null = null;
        const endpoint = applicationsAPI.getResumeEndpoint(applicationId, 'inline');
        fetchBlobWithAuth(endpoint)
            .then(blob => {
                if (!cancelled) {
                    setIsPdfBlob(blob.type.includes('pdf'));
                    localBlobUrl = URL.createObjectURL(blob);
                    setBlobUrl(localBlobUrl);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
            if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
        };
    }, [applicationId]);

    if (loading) return <div className="flex items-center justify-center h-96 text-slate-400 text-sm">Loading preview...</div>;
    if (blobUrl && isPdfBlob) return <iframe src={blobUrl} className="w-full h-96" title="Resume Preview" />;
    return <div className="text-center text-sm text-red-500 py-8">Preview unavailable — try downloading the file.</div>;
};

const ReviewApplicationsPage: React.FC = () => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [applications, setApplications] = useState<any[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [loadingApps, setLoadingApps] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [expandedApp, setExpandedApp] = useState<string | null>(null);
    const [isEditingJob, setIsEditingJob] = useState(false);
    const [editingForm, setEditingForm] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [isSavingJob, setIsSavingJob] = useState(false);

    useEffect(() => {
        jobsAPI.getMyJobs()
            .then(data => {
                const arr = Array.isArray(data) ? data : (data.jobs || []);
                setJobs(arr);
                if (arr.length > 0) setSelectedJobId(arr[0]._id || arr[0].id);
            })
            .catch(() => {})
            .finally(() => setLoadingJobs(false));

        categoriesAPI.getAll()
            .then(data => setCategories(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!selectedJobId) return;
        setLoadingApps(true);
        fetchWithAuth(`${API_BASE}/applications/job/${selectedJobId}`)
            .then(data => setApplications(Array.isArray(data) ? data : []))
            .catch(() => setApplications([]))
            .finally(() => setLoadingApps(false));
    }, [selectedJobId]);

    const handleUpdateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedJobId || !editingForm) return;
        setIsSavingJob(true);
        try {
            const updated = await jobsAPI.update(selectedJobId, editingForm);
            setJobs(prev => prev.map(j => (j._id === selectedJobId || j.id === selectedJobId) ? updated : j));
            setIsEditingJob(false);
        } catch (err) {
            alert('Failed to update job');
        } finally {
            setIsSavingJob(false);
        }
    };

    const handleDeleteJob = async () => {
        if (!selectedJobId) return;
        if (!window.confirm("Are you sure you want to delete this job? This action cannot be undone.")) return;
        
        setIsSavingJob(true);
        try {
            await jobsAPI.delete(selectedJobId);
            setJobs(prev => prev.filter(j => j._id !== selectedJobId && j.id !== selectedJobId));
            const remaining = jobs.filter(j => j._id !== selectedJobId && j.id !== selectedJobId);
            setSelectedJobId(remaining.length > 0 ? (remaining[0]._id || remaining[0].id) : null);
            setIsEditingJob(false);
        } catch (err) {
            alert('Failed to delete job');
        } finally {
            setIsSavingJob(false);
        }
    };

    const handleStatusChange = async (appId: string, status: string) => {
        setUpdatingId(appId);
        try {
            await applicationsAPI.updateStatus(appId, status);
            setApplications(prev =>
                prev.map(a => (a._id === appId || a.id === appId) ? { ...a, status } : a)
            );
            if (status === 'shortlisted') {
                 Swal.fire({ title: 'Shortlisted!', text: 'Candidate moved to next round.', icon: 'success', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000 });
            } else if (status === 'rejected') {
                 Swal.fire({ title: 'Passed', text: 'Candidate rejected.', icon: 'error', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 1500 });
            }
        } catch {}
        setUpdatingId(null);
    };

    const startEditing = () => {
        const job = jobs.find(j => (j._id === selectedJobId || j.id === selectedJobId));
        if (job) {
            setEditingForm({
                title: job.title,
                company: job.company,
                location: job.location,
                type: job.type || 'Remote',
                pay: job.pay,
                description: job.description,
                categoryId: job.categoryId?._id || job.categoryId || ''
            });
            setIsEditingJob(true);
        }
    };

    const statusColors: Record<string, string> = {
        'pending':      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        'reviewing':    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        'shortlisted':  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
        'interviewing': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        'accepted':     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        'rejected':     'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    // Helper: get full media URL (absolute or relative)
    const BASE_URL = (import.meta.env.VITE_API_BASE as string)?.replace('/api', '') || 'http://localhost:3001';
    const getMediaUrl = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('http')) {
            return url;
        }
        if (url.startsWith('uploaded:')) return url; 
        return url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`;
    };

    const isRealUrl = (url?: string) => !!url && (url.startsWith('http') || url.startsWith('/uploads') || url.startsWith('uploads/'));
    const isUploadedFile = (url?: string) => !!url && url.startsWith('uploaded:');
    const getFileName = (url: string) => url.replace('uploaded:', '');
    
    // Improved PDF detection (Cloudinary raw files might not end in .pdf)
    const isPdf = (url?: string) => {
        if (!url) return false;
        const lower = url.toLowerCase();
        return lower.endsWith('.pdf') || lower.includes('/raw/upload/') || lower.includes('.pdf?');
    };

    const handleResumeDownload = async (applicationId: string, applicantName?: string) => {
        try {
            const endpoint = applicationsAPI.getResumeEndpoint(applicationId, 'download');
            const blob = await fetchBlobWithAuth(endpoint);
            const downloadUrl = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = downloadUrl;
            anchor.download = `${(applicantName || 'candidate').replace(/\s+/g, '_')}_resume`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(downloadUrl);
        } catch {
            Swal.fire({ title: 'Download failed', text: 'Could not download resume right now.', icon: 'error' });
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-slide-up">
            <div className="mb-10">
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Applications</h1>
                <p className="text-lg text-gray-500 dark:text-slate-400 mt-2">Manage candidates and review video pitches for your open roles.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* ── Job List Sidebar ────────────────────────────────────────────── */}
                <aside className="w-full lg:w-80 flex-shrink-0">
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl shadow-sm sticky top-24 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 dark:border-slate-700">
                            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Your Postings</h2>
                        </div>
                        {loadingJobs ? (
                            <div className="p-10 text-center flex flex-col items-center gap-3">
                                <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                                <span className="text-xs font-bold text-gray-400">Loading...</span>
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="p-10 text-center">
                                <span className="text-4xl mb-4 block">📭</span>
                                <p className="text-xs font-bold text-gray-400">No jobs yet.</p>
                            </div>
                        ) : (
                            <div className="max-h-[60vh] overflow-y-auto">
                                {jobs.map(job => {
                                    const id = job._id || job.id;
                                    const isActive = selectedJobId === id;
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => setSelectedJobId(id)}
                                            className={`w-full text-left p-6 transition-all border-l-4 ${isActive 
                                                ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-500' 
                                                : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:border-gray-200'}`}
                                        >
                                            <p className={`font-bold truncate ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>{job.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 truncate">{job.company}</p>
                                                {job.applicationCount > 0 && (
                                                    <span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md">
                                                        {job.applicationCount}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </aside>

                {/* ── Applications Panel ──────────────────────────────────────────── */}
                <main className="flex-1 min-w-0">
                    {!selectedJobId ? (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 p-20 text-center">
                            <span className="text-5xl mb-6 block">👈</span>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Select a Job Posting</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto text-sm">Pick a job from the sidebar to start reviewing candidate applications.</p>
                        </div>
                    ) : loadingApps ? (
                        <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
                            <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-6"></div>
                            <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Fetching Candidates...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-xl font-black text-gray-900 dark:text-white shadow-inner">
                                        {(jobs.find(j => j._id === selectedJobId || j.id === selectedJobId)?.company || 'J').substring(0,1)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                                            {jobs.find(j => j._id === selectedJobId || j.id === selectedJobId)?.title}
                                        </h2>
                                        <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Active Review</p>
                                    </div>
                                </div>
                                <button
                                    onClick={startEditing}
                                    className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-sm font-bold hover:scale-105 transition-all shadow-lg cursor-pointer"
                                >
                                    Edit Posting
                                </button>
                            </div>

                            {(() => {
                                const selectedJob = jobs.find(j => j._id === selectedJobId || j.id === selectedJobId);
                                if (!selectedJob?.maxSlots || selectedJob.maxSlots <= 0) return null;
                                const filledPercent = Math.min(100, ((selectedJob.filledSlots || 0) / selectedJob.maxSlots) * 100);
                                return (
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Hiring Progress</span>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${selectedJob.status === 'Full' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {selectedJob.filledSlots || 0} / {selectedJob.maxSlots} Slots Filled
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-1000 ${selectedJob.status === 'Full' ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${filledPercent}%` }} />
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── Edit Modal Overlay ─────────────────────────────────────── */}
                            {isEditingJob && editingForm && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 animate-fade-in">
                                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
                                        <div className="p-8 border-b border-gray-50 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 sticky top-0 z-10">
                                            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Edit Job Posting</h2>
                                            <button onClick={() => setIsEditingJob(false)} className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-full transition-all cursor-pointer">
                                                <XMarkIcon className="w-6 h-6 text-gray-400" />
                                            </button>
                                        </div>
                                        <form onSubmit={handleUpdateJob} className="p-8 overflow-y-auto space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Job Title</label>
                                                    <input 
                                                        type="text" value={editingForm.title} 
                                                        onChange={e => setEditingForm({...editingForm, title: e.target.value})}
                                                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-gray-900 dark:text-white font-bold transition-all"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Company</label>
                                                    <input 
                                                        type="text" value={editingForm.company} 
                                                        onChange={e => setEditingForm({...editingForm, company: e.target.value})}
                                                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-gray-900 dark:text-white font-bold transition-all"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Location</label>
                                                    <input 
                                                        type="text" value={editingForm.location} 
                                                        onChange={e => setEditingForm({...editingForm, location: e.target.value})}
                                                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-gray-900 dark:text-white font-bold transition-all"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Pay Range</label>
                                                    <input 
                                                        type="text" value={editingForm.pay} 
                                                        onChange={e => setEditingForm({...editingForm, pay: e.target.value})}
                                                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-gray-900 dark:text-white font-bold transition-all"
                                                        placeholder="e.g. $80k - $120k"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Job Description</label>
                                                <textarea 
                                                    value={editingForm.description} 
                                                    onChange={e => setEditingForm({...editingForm, description: e.target.value})}
                                                    rows={5}
                                                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-[2rem] px-6 py-5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-gray-900 dark:text-white font-medium leading-relaxed transition-all"
                                                    required
                                                />
                                            </div>
                                            <div className="pt-6 flex flex-col sm:flex-row gap-4">
                                                <button 
                                                    type="submit" disabled={isSavingJob}
                                                    className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-200 dark:shadow-none flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    {isSavingJob ? 'Saving...' : 'Update Job Post'}
                                                </button>
                                                <button 
                                                    type="button" onClick={handleDeleteJob} disabled={isSavingJob}
                                                    className="px-8 py-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-2xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all cursor-pointer"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* ── Applications Feed ──────────────────────────────────────── */}
                            {applications.length === 0 ? (
                                <div className="bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-[2.5rem] p-24 text-center">
                                    <div className="text-6xl mb-6">👻</div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Ghost Town</h3>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">No applications yet for this role. Try sharing the job on social media to attract candidates!</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-4">
                                        Received {applications.length} applications
                                    </p>
                                    <div className="h-[75vh] w-full bg-black rounded-[2.5rem] overflow-y-scroll snap-y snap-mandatory border-[8px] border-white dark:border-slate-800 shadow-2xl relative scrollbar-none">
                                        {applications.map(app => {
                                            const id = app._id || app.id;
                                            const rawStatus = app.status || 'pending';
                                            const status = rawStatus.toLowerCase();
                                            const isExpanded = expandedApp === id;

                                            return (
                                                <div key={id} className="w-full h-full snap-start relative bg-gray-950 group overflow-hidden flex flex-col justify-center">
                                                    
                                                    {/* Background Video pitch */}
                                                    {app.videoUrl ? (
                                                        <video
                                                            src={getMediaUrl(app.videoUrl)}
                                                            className="absolute inset-0 w-full h-full object-cover opacity-90"
                                                            loop
                                                            muted
                                                            playsInline
                                                            onMouseOver={e => (e.target as HTMLVideoElement).play()}
                                                            onMouseOut={e => (e.target as HTMLVideoElement).pause()}
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-500">
                                                            <span className="text-6xl mb-6">😶</span>
                                                            <h3 className="text-xl font-bold text-white mb-1">Text-Only Application</h3>
                                                            <p className="text-sm opacity-60">Candidate did not record a video pitch.</p>
                                                        </div>
                                                    )}

                                                    {/* Immersive Overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none z-10"></div>

                                                    {/* Floating Actions/Info */}
                                                    <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col justify-end z-20 pointer-events-none">
                                                        
                                                        {/* Individual Status */}
                                                        <div className="mb-6 pointer-events-auto self-start">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl backdrop-blur-xl shadow-2xl border border-white/10 ${statusColors[rawStatus] || statusColors[status] || statusColors['pending']}`}>
                                                                {rawStatus}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-end justify-between gap-6 pointer-events-auto">
                                                            {/* Applicant Visuals */}
                                                            <div className="flex items-center gap-5 text-white">
                                                                <img
                                                                    src={app.applicant?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.applicant?.name || 'A')}&size=64&background=6366f1&color=fff`}
                                                                    alt={app.applicant?.name}
                                                                    className="w-20 h-20 rounded-3xl border-4 border-white/20 shadow-2xl object-cover transform group-hover:scale-105 transition-transform duration-500"
                                                                />
                                                                <div>
                                                                    <h3 className="font-black text-4xl tracking-tighter drop-shadow-2xl">{app.applicant?.name?.split(' ')[0]}</h3>
                                                                    <p className="text-white/60 font-bold tracking-tight text-sm drop-shadow-md">{app.applicant?.email}</p>
                                                                </div>
                                                            </div>

                                                            {/* Quick Actions (Swipe/Tinder Style) */}
                                                            <div className="flex flex-col items-center gap-4">
                                                                <button 
                                                                    onClick={() => handleStatusChange(id, 'shortlisted')}
                                                                    className="w-16 h-16 bg-white text-gray-900 rounded-full flex items-center justify-center text-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
                                                                >
                                                                    ⚡
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleStatusChange(id, 'rejected')}
                                                                    className="w-12 h-12 bg-white/10 backdrop-blur-md text-white rounded-full flex items-center justify-center text-xl hover:bg-white/20 transition-all cursor-pointer"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Portfolio Access */}
                                                        <div className="mt-10 pointer-events-auto">
                                                            <button 
                                                                onClick={() => setExpandedApp(isExpanded ? null : id)}
                                                                className="w-full py-5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 text-white font-black tracking-widest uppercase text-xs transition-all flex items-center justify-center gap-3 cursor-pointer shadow-2xl"
                                                            >
                                                                Review Full Portfolio <span>→</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Swipe-Right Drawer (Immersive) */}
                                                    <div className={`absolute top-0 right-0 h-full w-full md:w-[85%] bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-700 ease-in-out z-50 p-10 flex flex-col ${isExpanded ? 'translate-x-0' : 'translate-x-[105%]'}`}>
                                                        <div className="flex justify-between items-center mb-10">
                                                            <div className="flex items-center gap-4">
                                                                <img src={app.applicant?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.applicant?.name || 'A')}&size=40&background=6366f1&color=fff`} className="w-12 h-12 rounded-2xl" />
                                                                <div>
                                                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">{app.applicant?.name}</h2>
                                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Candidate Dossier</p>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => setExpandedApp(null)} className="w-12 h-12 flex items-center justify-center bg-gray-50 dark:bg-slate-800 rounded-full hover:rotate-90 transition-all cursor-pointer">
                                                                <XMarkIcon className="w-6 h-6 text-gray-400" />
                                                            </button>
                                                        </div>
                                                        
                                                        <div className="flex-1 overflow-y-auto pr-6 space-y-10 scrollbar-none">
                                                            {/* Links Section */}
                                                            <div>
                                                                <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">🔗 Project Links & Notes</h3>
                                                                <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 text-gray-700 dark:text-slate-300 text-sm leading-[1.8] font-medium">
                                                                    {app.coverLetter || 'No additional project links or notes provided by the candidate.'}
                                                                </div>
                                                            </div>

                                                            {/* Resume Section with Preview */}
                                                            <div className="flex-1 flex flex-col min-h-[500px]">
                                                                <div className="flex items-center justify-between mb-4">
                                                                     <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">📄 Resume / CV Preview</h3>
                                                                    {app.resumeUrl && isRealUrl(app.resumeUrl) && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleResumeDownload(id, app.applicant?.name)}
                                                                            className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest underline cursor-pointer"
                                                                        >
                                                                            Download Resume
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 bg-gray-100 dark:bg-slate-950 rounded-3xl overflow-hidden border-8 border-gray-50 dark:border-slate-800 min-h-[600px] shadow-inner relative">
                                                                    {app.resumeUrl ? (
                                                                        isPdf(app.resumeUrl) ? (
                                                                            <PdfPreview applicationId={id} />
                                                                        ) : (
                                                                            <div className="h-full flex flex-col items-center justify-center p-10 text-center text-gray-900 dark:text-white bg-white dark:bg-slate-900">
                                                                                <span className="text-6xl mb-6">📄</span>
                                                                                <p className="font-bold text-xl mb-6 text-gray-500">Document available but preview unavailable</p>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleResumeDownload(id, app.applicant?.name)}
                                                                                    className="px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all cursor-pointer"
                                                                                >
                                                                                    Download Document
                                                                                </button>
                                                                            </div>
                                                                        )
                                                                    ) : (
                                                                        <div className="h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50 dark:bg-slate-900/50">
                                                                            <span className="text-6xl mb-6 opacity-20">📂</span>
                                                                            <p className="font-bold uppercase tracking-widest text-xs">No resume provided</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ReviewApplicationsPage;
