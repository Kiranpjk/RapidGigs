import React, { useState, useEffect, useRef } from 'react';
import { jobsAPI, applicationsAPI, categoriesAPI, fetchWithAuth } from '../../services/api';
import { PencilSquareIcon, XMarkIcon, CheckCircleIcon as CheckIcon } from '../icons/Icons';
import Swal from 'sweetalert2';

const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001/api';

// Component to preview PDF inline despite cross-origin Content-Disposition: attachment
const PdfPreview: React.FC<{ url: string }> = ({ url }) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetch(url)
            .then(r => r.blob())
            .then(blob => {
                if (!cancelled) {
                    setBlobUrl(URL.createObjectURL(blob));
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [url]);

    if (loading) return <div className="flex items-center justify-center h-96 text-slate-400 text-sm">Loading preview...</div>;
    if (blobUrl) return <object data={blobUrl} type="application/pdf" className="w-full h-96" title="Resume Preview" />;
    return <div className="text-center text-sm text-red-500 py-8">Preview unavailable — <a href={url} target="_blank" rel="noreferrer" className="underline">open in new tab</a></div>;
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

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tighter">Review Applications</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">View and manage candidates who applied to your jobs.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Job List Sidebar */}
                <aside className="w-full lg:w-72 flex-shrink-0">
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm sticky top-24">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
                            <h2 className="font-bold text-slate-800 dark:text-white">Your Job Posts</h2>
                        </div>
                        {loadingJobs ? (
                            <div className="p-8 text-center text-slate-400">Loading jobs...</div>
                        ) : jobs.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">No jobs posted yet.</div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {jobs.map(job => {
                                    const id = job._id || job.id;
                                    const isActive = selectedJobId === id;
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => setSelectedJobId(id)}
                                            className={`w-full text-left p-4 transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
                                        >
                                            <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{job.title}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{job.company} · {job.location}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Applications Panel */}
                <main className="flex-1 min-w-0">
                    {!selectedJobId ? (
                        <div className="text-center py-20 text-slate-400">Select a job to see applications</div>
                    ) : loadingApps ? (
                        <div className="text-center py-20 text-slate-400">
                            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                            Loading applications...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                        {(jobs.find(j => j._id === selectedJobId || j.id === selectedJobId)?.company || 'J').substring(0,1)}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-800 dark:text-white">
                                            {jobs.find(j => j._id === selectedJobId || j.id === selectedJobId)?.title}
                                        </h2>
                                        <p className="text-xs text-slate-500 underline">Current Job Post</p>
                                    </div>
                                </div>
                                <button
                                    onClick={startEditing}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                                >
                                    <PencilSquareIcon className="w-4 h-4" />
                                    Edit Job
                                </button>
                            </div>

                            {(() => {
                                const selectedJob = jobs.find(j => j._id === selectedJobId || j.id === selectedJobId);
                                return selectedJob?.maxSlots && selectedJob.maxSlots > 1 ? (
                                    <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                            <span>{selectedJob.filledSlots || 0}/{selectedJob.maxSlots} positions filled</span>
                                            <span className={selectedJob.status === 'Full' ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}>{selectedJob.status === 'Full' ? 'Full' : 'Open'}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                            <div className={`h-1.5 rounded-full transition-all ${selectedJob.status === 'Full' ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, ((selectedJob.filledSlots || 0) / selectedJob.maxSlots) * 100)}%` }} />
                                        </div>
                                    </div>
                                ) : null;
                            })()}

                            {/* Edit Modal Overlay */}
                            {isEditingJob && editingForm && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Edit Job Posting</h2>
                                            <button onClick={() => setIsEditingJob(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                                                <XMarkIcon className="w-6 h-6 text-slate-400" />
                                            </button>
                                        </div>
                                        <form onSubmit={handleUpdateJob} className="p-6 overflow-y-auto space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Job Title</label>
                                                    <input 
                                                        type="text" value={editingForm.title} 
                                                        onChange={e => setEditingForm({...editingForm, title: e.target.value})}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
                                                    <input 
                                                        type="text" value={editingForm.company} 
                                                        onChange={e => setEditingForm({...editingForm, company: e.target.value})}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Location</label>
                                                    <input 
                                                        type="text" value={editingForm.location} 
                                                        onChange={e => setEditingForm({...editingForm, location: e.target.value})}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Pay Range</label>
                                                    <input 
                                                        type="text" value={editingForm.pay} 
                                                        onChange={e => setEditingForm({...editingForm, pay: e.target.value})}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                                        placeholder="e.g. $80k - $120k"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Job Type</label>
                                                    <select 
                                                        value={editingForm.type} 
                                                        onChange={e => setEditingForm({...editingForm, type: e.target.value})}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                                    >
                                                        <option value="Remote">Remote</option>
                                                        <option value="On-site">On-site</option>
                                                        <option value="Hybrid">Hybrid</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                                                    <select 
                                                        value={editingForm.categoryId} 
                                                        onChange={e => setEditingForm({...editingForm, categoryId: e.target.value})}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                                    >
                                                        <option value="">Select a category</option>
                                                        {categories.map(c => (
                                                            <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Job Description</label>
                                                <textarea 
                                                    value={editingForm.description} 
                                                    onChange={e => setEditingForm({...editingForm, description: e.target.value})}
                                                    rows={4}
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                                    required
                                                />
                                            </div>
                                            <div className="pt-4 flex gap-3">
                                                <button 
                                                    type="submit" disabled={isSavingJob}
                                                    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                                                >
                                                    {isSavingJob ? 'Saving Changes...' : <><CheckIcon className="w-5 h-5" /> Save Changes</>}
                                                </button>
                                                <button 
                                                    type="button" onClick={() => setIsEditingJob(false)} disabled={isSavingJob}
                                                    className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    type="button" onClick={handleDeleteJob} disabled={isSavingJob}
                                                    className="px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                                >
                                                    Delete Job
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {applications.length === 0 ? (
                                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-16 text-center shadow-sm mt-4">
                                    <div className="text-5xl mb-4">📭</div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Applications Yet</h3>
                                    <p className="text-slate-500 dark:text-slate-400">No one has applied to this job yet. Check back later!</p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium pt-4">
                                    {applications.length} application{applications.length !== 1 ? 's' : ''} received. Swipe down to review! 👇
                                </p>
                            )}

                            {applications.length > 0 && (
                                <div className="h-[75vh] w-full bg-black rounded-2xl overflow-y-scroll snap-y snap-mandatory border-4 border-slate-800 shadow-2xl relative">
                                    {applications.map(app => {
                                        const id = app._id || app.id;
                                        const rawStatus = app.status || 'pending';
                                        const status = rawStatus.toLowerCase();
                                        const isExpanded = expandedApp === id;

                                        return (
                                            <div key={id} className="w-full h-full snap-start relative bg-slate-900 border-b-4 border-black group overflow-hidden flex flex-col justify-center">
                                                
                                                {/* Background Video Player */}
                                                {app.videoUrl ? (
                                                    <video
                                                        src={getMediaUrl(app.videoUrl)}
                                                        className="absolute inset-0 w-full h-full object-cover opacity-90"
                                                        controls
                                                        preload="metadata"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 text-slate-400 z-0">
                                                        <span className="text-6xl mb-4">🎥</span>
                                                        <h3 className="text-2xl font-bold text-white mb-2">No Pitch Video</h3>
                                                        <p>This candidate skipped the video pitch.</p>
                                                    </div>
                                                )}

                                                {/* Dim Gradient Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10 pointer-events-none z-10"></div>

                                                {/* Floating Content Foreground */}
                                                <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end z-20 pointer-events-none">
                                                    
                                                    {/* Status Badge */}
                                                    <div className="mb-4 pointer-events-auto self-start">
                                                        <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md backdrop-blur-md shadow-xl ${statusColors[rawStatus] || statusColors[status] || statusColors['pending']}`}>
                                                            {rawStatus}
                                                        </span>
                                                        {updatingId === id && <span className="ml-2 text-xs text-white animate-pulse">Saving...</span>}
                                                    </div>

                                                    <div className="flex items-end justify-between gap-4 pointer-events-auto">
                                                        {/* Applicant Profile */}
                                                        <div className="flex items-center gap-4 text-white">
                                                            <img
                                                                src={app.applicant?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.applicant?.name || 'A')}&size=64&background=6366f1&color=fff`}
                                                                alt={app.applicant?.name}
                                                                className="w-16 h-16 rounded-full border-4 border-white/20 shadow-xl object-cover"
                                                            />
                                                            <div>
                                                                <h3 className="font-extrabold text-3xl drop-shadow-xl">{app.applicant?.name || 'Anonymous'}</h3>
                                                                <p className="text-white/80 font-medium drop-shadow-md">{app.applicant?.email}</p>
                                                                <p className="text-xs text-white/50 mt-1">
                                                                    Applied {new Date(app.createdAt || app.dateApplied || Date.now()).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Tinder Actions */}
                                                        <div className="flex flex-col items-center gap-3">
                                                            <button 
                                                                onClick={() => handleStatusChange(id, 'shortlisted')}
                                                                title="Shortlist (Interview)"
                                                                className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:scale-110 hover:-translate-y-2 transition-all"
                                                            >
                                                                ✅
                                                            </button>
                                                            <button 
                                                                onClick={() => handleStatusChange(id, 'rejected')}
                                                                title="Pass"
                                                                className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:scale-110 transition-all opacity-80 hover:opacity-100"
                                                            >
                                                                ❌
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Open Drawer Button */}
                                                    <div className="mt-8 mb-4 pointer-events-auto">
                                                        <button 
                                                            onClick={() => setExpandedApp(isExpanded ? null : id)}
                                                            className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold tracking-wide transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <span>Swipe Right for Portfolio & Resume</span> <span>👉</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Swipe-Right Drawer Overlay */}
                                                <div className={`absolute top-0 right-0 h-full w-full md:w-[85%] bg-slate-900 border-l border-white/10 shadow-2xl transition-transform duration-500 ease-out z-50 p-6 flex flex-col ${isExpanded ? 'translate-x-0' : 'translate-x-[105%]'}`}>
                                                    <div className="flex justify-between items-center mb-6">
                                                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                                            <img src={app.applicant?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.applicant?.name || 'A')}&size=40&background=6366f1&color=fff`} className="w-8 h-8 rounded-full" />
                                                            {app.applicant?.name}'s Full Profile
                                                        </h2>
                                                        <button onClick={() => setExpandedApp(null)} className="text-white bg-slate-800 rounded-full p-2 hover:bg-slate-700 hover:rotate-90 transition-all">
                                                            <XMarkIcon className="w-6 h-6" />
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
                                                        {/* Portfolio Links */}
                                                        <div>
                                                            <h3 className="text-indigo-400 font-bold mb-3 uppercase text-xs tracking-widest flex items-center gap-2">🔗 Portfolio / Project Links</h3>
                                                            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-slate-300 whitespace-pre-wrap text-sm leading-relaxed overflow-hidden break-words font-mono">
                                                                {app.coverLetter || 'No links provided by the candidate.'}
                                                            </div>
                                                        </div>

                                                        {/* Resume Area */}
                                                        <div className="flex-1 flex flex-col min-h-[400px]">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h3 className="text-indigo-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2">📄 Resume / CV</h3>
                                                                {app.resumeUrl && isRealUrl(app.resumeUrl) && (
                                                                    <a href={getMediaUrl(app.resumeUrl)} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline">
                                                                        Download PDF
                                                                    </a>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 bg-white rounded-xl overflow-hidden border-4 border-slate-800 min-h-[500px]">
                                                                {app.resumeUrl ? (
                                                                    isPdf(app.resumeUrl) ? (
                                                                        <PdfPreview url={getMediaUrl(app.resumeUrl)} />
                                                                    ) : (
                                                                        <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-800 bg-slate-100">
                                                                            <span className="text-6xl mb-4">📰</span>
                                                                            <p className="font-bold mb-2">Resume Document Available</p>
                                                                            <a href={getMediaUrl(app.resumeUrl)} target="_blank" rel="noreferrer" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold">
                                                                                Click Here to Open Download
                                                                            </a>
                                                                        </div>
                                                                    )
                                                                ) : (
                                                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                                                                        <span className="text-5xl mb-3 opacity-50">📁</span>
                                                                        <p>No resume PDF provided.</p>
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
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ReviewApplicationsPage;
