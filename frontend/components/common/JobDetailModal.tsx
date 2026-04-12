import React from 'react';
import { Job } from '../../types';
import { XMarkIcon, MapPinIcon, ClockIcon, PlayCircleIcon, BuildingOffice2Icon } from '../icons/Icons';

interface JobDetailModalProps {
    job: Job | null;
    isOpen: boolean;
    onClose: () => void;
    onApply: (job: Job) => void;
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, isOpen, onClose, onApply }) => {
    if (!isOpen || !job) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 bg-gray-100/80 dark:bg-slate-700/80 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 transition-colors z-10 backdrop-blur-sm cursor-pointer"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>

                {/* Video Preview — the main value of the popup */}
                {(job.companyVideoUrl || job.shortVideoUrl) && (
                    <div className="rounded-t-2xl overflow-hidden bg-gray-900">
                        <video
                            src={job.companyVideoUrl || job.shortVideoUrl}
                            controls
                            className="w-full aspect-video object-cover"
                            preload="metadata"
                        />
                    </div>
                )}

                {/* Content */}
                <div className="p-6">
                    {/* Header */}
                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{job.title}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <BuildingOffice2Icon className="w-4 h-4" /> {job.company}
                        </p>
                    </div>

                    {/* Info Tags */}
                    <div className="flex flex-wrap gap-2 mb-5">
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg font-medium">
                            <MapPinIcon className="w-3.5 h-3.5" /> {job.location}
                        </span>
                        <span className="inline-flex items-center text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg font-medium">
                            {job.pay}
                        </span>
                        <span className="inline-flex items-center text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg font-medium">
                            {job.type}
                        </span>
                        {job.postedAgo && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                <ClockIcon className="w-3.5 h-3.5" /> {job.postedAgo}
                            </span>
                        )}
                    </div>

                    {/* Full Description — the core content */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">About this role</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                            {job.description}
                        </p>
                    </div>

                    {/* Freelancer guide video link */}
                    {job.freelancerVideoUrl && (
                        <div className="mb-6">
                            <a
                                href={job.freelancerVideoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                            >
                                <PlayCircleIcon className="w-4 h-4" /> Watch Freelancer Guide
                            </a>
                        </div>
                    )}

                    {/* Slot progress */}
                    {(job.maxSlots && job.maxSlots > 1) && (
                        <div className="mb-5">
                            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
                                <span>{job.filledSlots || 0}/{job.maxSlots} positions filled</span>
                                <span className={job.status === 'Full' ? 'text-red-500 font-medium' : 'text-emerald-500 font-medium'}>
                                    {job.status === 'Full' ? 'Full' : 'Open'}
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full transition-all ${job.status === 'Full' ? 'bg-red-400' : 'bg-emerald-400'}`}
                                    style={{ width: `${Math.min(100, ((job.filledSlots || 0) / job.maxSlots) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Apply Button */}
                    <button
                        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${job.status === 'Full'
                                ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-[0.98] shadow-sm'
                            }`}
                        onClick={() => { if (job.status !== 'Full') { onApply(job); onClose(); } }}
                        disabled={job.status === 'Full'}
                    >
                        {job.status === 'Full' ? 'Positions Filled' : 'Apply Now'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JobDetailModal;
