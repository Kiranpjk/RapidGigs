import React from 'react';
import { Job } from '../../types';
import { XMarkIcon, MapPinIcon, PlayCircleIcon } from '../icons/Icons';
import { useJobs } from '../../context/JobContext';

const BASE_URL = (import.meta.env.VITE_API_BASE as string)?.replace('/api', '') || 'http://localhost:3001';
const getMediaUrl = (url?: string) => { if (!url) return ''; if (url.startsWith('http')) return url; return url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`; };

interface JobDetailModalProps {
    job: Job | null;
    isOpen: boolean;
    onClose: () => void;
    onApply: (job: Job) => void;
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, isOpen, onClose, onApply }) => {
    const { hasApplied } = useJobs();
    if (!isOpen || !job) return null;

    const videoUrl = getMediaUrl(job.companyVideoUrl || job.shortVideoUrl);
    const applied = hasApplied(job.id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="fixed inset-0 bg-black/40" />

            <div
                className="relative bg-[var(--bg)] border border-[var(--border)] rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Close */}
                <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 bg-[var(--surface)] border border-[var(--border)] rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors z-10">
                    <XMarkIcon className="w-3.5 h-3.5" />
                </button>

                {/* Video / Preview */}
                {videoUrl && (
                    <div className="rounded-t-lg overflow-hidden bg-black flex justify-center">
                        <div className="w-full max-w-sm">
                            <video 
                                src={videoUrl} 
                                controls 
                                className="w-full max-h-[50vh] object-contain" 
                                preload="metadata"
                                autoPlay
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="mb-5">
                        <h2 className="text-[17px] font-bold text-[var(--text-primary)] mb-1 tracking-tight leading-tight">
                            {job.title}
                        </h2>
                        <div className="flex items-center gap-2">
                             <p className="text-[13px] text-[var(--text-secondary)] font-medium">{job.company}</p>
                             <span className="w-1 h-1 rounded-full bg-[var(--text-tertiary)] opacity-30" />
                             <span className="text-[12px] text-[var(--accent)] font-semibold tracking-wide uppercase">Active Opportunity</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[var(--surface)] text-[var(--text-secondary)] px-2 py-1 rounded">
                            <MapPinIcon className="w-3 h-3" /> {job.location}
                        </span>
                        <span 
                            className="text-[11px] font-medium bg-[var(--success-subtle)] text-[var(--success)] px-2 py-1 rounded"
                            title={job.pay.length > 30 ? job.pay : ''}
                        >
                            {job.pay.length > 30 ? `${job.pay.substring(0, 30)}...` : job.pay}
                        </span>
                        <span className="text-[11px] font-medium bg-[var(--accent-subtle)] text-[var(--accent)] px-2 py-1 rounded">{job.type}</span>
                        {job.postedAgo && <span className="text-[10px] text-[var(--text-tertiary)] px-1 py-1">{job.postedAgo}</span>}
                    </div>

                    <div className="mb-5">
                        <h3 className="text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">About this role</h3>
                        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{job.description}</p>
                    </div>

                    {job.freelancerVideoUrl && (
                        <a href={job.freelancerVideoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12px] text-[var(--accent)] hover:underline font-medium mb-5">
                            <PlayCircleIcon className="w-3.5 h-3.5" /> Watch guide
                        </a>
                    )}

                    {(job.maxSlots && job.maxSlots > 1) && (
                        <div className="mb-4">
                            <div className="flex justify-between text-[11px] text-[var(--text-tertiary)] mb-1">
                                <span>{job.filledSlots || 0}/{job.maxSlots} filled</span>
                                <span className={job.status === 'Full' ? 'text-[var(--danger)]' : 'text-[var(--success)]'}>{job.status === 'Full' ? 'Full' : 'Open'}</span>
                            </div>
                            <div className="w-full bg-[var(--surface)] rounded-full h-1">
                                <div className={`h-1 rounded-full ${job.status === 'Full' ? 'bg-[var(--danger)]' : 'bg-[var(--accent)]'}`} style={{ width: `${Math.min(100, ((job.filledSlots || 0) / job.maxSlots) * 100)}%` }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer CTA */}
                <div className="p-4 border-t border-[var(--border)]">
                    <button
                        className={`w-full py-2.5 rounded-md text-[13px] font-medium transition-all duration-100 ${
                            applied
                                ? 'bg-[var(--success-subtle)] text-[var(--success)]'
                                : job.status === 'Full'
                                ? 'bg-[var(--surface)] text-[var(--text-tertiary)] cursor-not-allowed'
                                : 'bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90'
                        }`}
                        onClick={() => { if (job.status !== 'Full' && !applied) { onApply(job); onClose(); } }}
                        disabled={job.status === 'Full' || applied}
                    >
                        {applied ? '✓ Applied' : job.status === 'Full' ? 'Positions Filled' : 'Apply Now'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JobDetailModal;
