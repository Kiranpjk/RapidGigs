import React, { useState, useEffect } from 'react';
import { jobsAPI, applicationsAPI, categoriesAPI, fetchWithAuth } from '../../services/api';
import { PencilSquareIcon, XMarkIcon, CheckCircleIcon as CheckIcon } from '../icons/Icons';

const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001/api';

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
                                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-16 text-center shadow-sm">
                                    <div className="text-5xl mb-4">📭</div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Applications Yet</h3>
                                    <p className="text-slate-500 dark:text-slate-400">No one has applied to this job yet. Check back later!</p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium pt-4">
                                    {applications.length} application{applications.length !== 1 ? 's' : ''} received
                                </p>
                            )}
                            {applications.map(app => {
                                const id = app._id || app.id;
                                const rawStatus = app.status || 'pending';
                                const status = rawStatus.toLowerCase();
                                const isExpanded = expandedApp === id;

                                return (
                                    <div key={id} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                        {/* Applicant Header */}
                                        <div className="p-6">
                                            <div className="flex items-start justify-between flex-wrap gap-4">
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={app.applicant?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.applicant?.name || 'A')}&size=48&background=6366f1&color=fff`}
                                                        alt={app.applicant?.name}
                                                        className="w-12 h-12 rounded-full ring-2 ring-slate-200 dark:ring-slate-600 object-cover"
                                                    />
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 dark:text-white">{app.applicant?.name || 'Anonymous'}</h3>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">{app.applicant?.email}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            Applied {new Date(app.createdAt || app.dateApplied || Date.now()).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColors[rawStatus] || statusColors[status] || statusColors['pending']}`}>
                                                        {rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)}
                                                    </span>
                                                    <select
                                                        value={status}
                                                        disabled={updatingId === id}
                                                        onChange={e => handleStatusChange(id, e.target.value)}
                                                        className="text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="reviewing">Reviewing</option>
                                                        <option value="shortlisted">Shortlisted</option>
                                                        <option value="interviewing">Interviewing</option>
                                                        <option value="accepted">Accepted ✓</option>
                                                        <option value="rejected">Rejected ✗</option>
                                                    </select>
                                                    {updatingId === id && <span className="text-xs text-slate-400 animate-pulse">Saving...</span>}
                                                </div>
                                            </div>

                                            {/* Cover Letter Preview */}
                                            {app.coverLetter && (
                                                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Cover Letter</p>
                                                    <p className={`text-sm text-slate-700 dark:text-slate-300 ${!isExpanded ? 'line-clamp-3' : ''}`}>
                                                        {app.coverLetter}
                                                    </p>
                                                    {app.coverLetter.length > 200 && (
                                                        <button
                                                            onClick={() => setExpandedApp(isExpanded ? null : id)}
                                                            className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold mt-2 hover:underline"
                                                        >
                                                            {isExpanded ? 'Show less ↑' : 'Read more ↓'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Resume & Video — inline, not new tab */}
                                        {(app.resumeUrl || app.videoUrl) && (
                                            <div className="border-t border-slate-100 dark:border-slate-700/50">
                                                {/* Resume */}
                                                {app.resumeUrl && (
                                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">📄 Resume / CV</p>
                                                            {isRealUrl(app.resumeUrl) && (
                                                                <a href={getMediaUrl(app.resumeUrl)} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold hover:underline">
                                                                    Open in new tab →
                                                                </a>
                                                            )}
                                                        </div>
                                                        {isRealUrl(app.resumeUrl) ? (
                                                            <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                                                                {isPdf(app.resumeUrl) ? (
                                                                    <div className="w-full h-96">
                                                                        <object
                                                                            data={getMediaUrl(app.resumeUrl)}
                                                                            type="application/pdf"
                                                                            className="w-full h-full"
                                                                            title="Resume"
                                                                        >
                                                                            <embed src={getMediaUrl(app.resumeUrl)} type="application/pdf" className="w-full h-full" />
                                                                        </object>
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-4 flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-lg">📄</div>
                                                                            <div>
                                                                                <p className="text-sm font-semibold text-slate-800 dark:text-white">Resume Document</p>
                                                                                <p className="text-xs text-slate-400">Non-PDF file - click to open</p>
                                                                            </div>
                                                                        </div>
                                                                        <a href={getMediaUrl(app.resumeUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                                                            Open <span>↗</span>
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : isUploadedFile(app.resumeUrl) ? (
                                                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center gap-3">
                                                                <span className="text-2xl">📎</span>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{getFileName(app.resumeUrl)}</p>
                                                                    <p className="text-xs text-amber-600 dark:text-amber-400">Uploaded file (available via file storage)</p>
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                )}

                                                {/* Video intro */}
                                                {app.videoUrl && (
                                                    <div className="p-4">
                                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">🎥 Video Introduction</p>
                                                        {isRealUrl(app.videoUrl) ? (
                                                            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                                                                <video
                                                                    src={getMediaUrl(app.videoUrl)}
                                                                    controls
                                                                    className="w-full max-h-[400px] object-contain"
                                                                    preload="metadata"
                                                                />
                                                            </div>
                                                        ) : isUploadedFile(app.videoUrl) ? (
                                                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg flex items-center gap-3">
                                                                <span className="text-2xl">🎬</span>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">{getFileName(app.videoUrl)}</p>
                                                                    <p className="text-xs text-purple-600 dark:text-purple-400">Uploaded video (available in storage)</p>
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ReviewApplicationsPage;
