import React from 'react';
import { Job } from '../../types';
import { XMarkIcon, MapPinIcon, PlayCircleIcon } from '../icons/Icons';
import { useJobs } from '../../context/JobContext';
import JobSourceCredit from './JobSourceCredit';

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
            <div className="fixed inset-0 bg-[#141413]/50 backdrop-blur-[2px] animate-fade-in" />

            <div
                role="dialog" aria-modal="true" aria-label={job.title}
                className="relative bg-[var(--bg)] rounded-[16px] shadow-[var(--shadow-lg)] overflow-hidden max-w-2xl w-full max-h-[85vh] flex flex-col animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Close */}
                <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 w-8 h-8 bg-[var(--bg)]/90 shadow-[var(--shadow-sm)] rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors z-10">
                    <XMarkIcon className="w-3.5 h-3.5" />
                </button>

                {/* Video / Preview */}
                {videoUrl && (
                    <div className="overflow-hidden bg-black flex justify-center">
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
                <div className="px-7 pt-6 pb-2 overflow-y-auto flex-1">
                    <div className="mb-5">
                        <h2 className="font-display text-title font-semibold text-[var(--text-primary)] mb-2 pr-8">
                            {job.title}
                        </h2>
                        <div className="flex items-center gap-2">
                             <p className="text-[14px] text-[var(--text-secondary)] font-medium">{job.company}</p>
                             <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
                             <span className="text-[13px] text-[var(--text-tertiary)]">{job.postedAgo || 'Open'}</span>
                             {job.source && (
                                 <>
                                     <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
                                     <span className="text-[13px]"><JobSourceCredit source={job.source} /></span>
                                 </>
                             )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-5">
                        <span className="inline-flex items-center gap-1 text-[12.5px] font-medium bg-[var(--surface)] text-[var(--text-secondary)] px-2.5 py-1 rounded-full">
                            <MapPinIcon className="w-3 h-3" /> {job.location}
                        </span>
                        <span 
                            className="text-[12.5px] font-semibold tabular-nums bg-[var(--surface)] text-[var(--text-primary)] px-2.5 py-1 rounded-full"
                            title={job.pay.length > 30 ? job.pay : ''}
                        >
                            {job.pay.length > 30 ? `${job.pay.substring(0, 30)}...` : job.pay}
                        </span>
                        <span className="text-[12.5px] font-medium bg-[var(--surface)] text-[var(--text-secondary)] px-2.5 py-1 rounded-full">{job.type}</span>
                    </div>

                    <div className="mb-5">
                        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">About this role</h3>
                        <p className="text-[15px] text-[var(--text-secondary)] leading-[1.65] max-w-[62ch] whitespace-pre-line">{job.description}</p>
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
                <div className="px-7 py-4 border-t border-[var(--border)] bg-[var(--surface)]">
                    {job.applyUrl ? (
                    <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full h-11 rounded-[var(--radius)] text-[15px] font-medium transition-colors duration-150 focus-ring bg-[var(--text-primary)] text-[var(--bg)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)]"
                    >
                        Apply on company site
                    </a>
                    ) : (
                    <button
                        className={`w-full h-11 rounded-[var(--radius)] text-[15px] font-medium transition-colors duration-150 focus-ring ${
                            applied
                                ? 'bg-[var(--success-subtle)] text-[var(--success)]'
                                : job.status === 'Full'
                                ? 'bg-[var(--surface)] text-[var(--text-tertiary)] cursor-not-allowed'
                                : 'bg-[var(--text-primary)] text-[var(--bg)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)]'
                        }`}
                        onClick={() => { if (job.status !== 'Full' && !applied) { onApply(job); onClose(); } }}
                        disabled={job.status === 'Full' || applied}
                    >
                        {applied ? 'Applied' : job.status === 'Full' ? 'Positions filled' : 'Apply for this role'}
                    </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobDetailModal;
