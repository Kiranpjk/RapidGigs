/**
 * VideoGenIndicator.tsx
 * Chrome/Edge-style download indicator for background video generation.
 *
 * Features:
 * - Floating pill next to notification bell in header
 * - Spinning ring progress indicator with percentage
 * - Zomato-style cycling fun facts while waiting
 * - Click to navigate → post-job page
 * - Success/failure toast on completion
 * - Auto-dismiss after completion
 */

import React, { useState, useEffect, useRef } from 'react';
import { useVideoGen, VIDEO_GEN_FACTS, VideoGenJob } from '../../context/VideoGenContext';

// ── Circular progress SVG ─────────────────────────────────────────────────────
const CircularProgress: React.FC<{ progress: number; size?: number; strokeWidth?: number; status: VideoGenJob['status'] }> = ({
  progress, size = 36, strokeWidth = 3, status
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const color = status === 'completed' ? '#22c55e' : status === 'failed' ? '#ef4444' : '#6366f1';

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.5s ease, stroke 0.3s ease' }}
      />
    </svg>
  );
};

// ── Single Job Chip (collapsed in header) ─────────────────────────────────────
const JobChip: React.FC<{ job: VideoGenJob; onClick: () => void }> = ({ job, onClick }) => {
  const icon = job.status === 'completed' ? '✅' : job.status === 'failed' ? '❌' : '🎬';

  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-full pl-1 pr-3 py-1 shadow-lg transition-all duration-300 hover:scale-105 border border-white/10"
      title={`Video: ${job.title} — ${job.status} (${job.progress}%)`}
    >
      <div className="relative w-7 h-7 flex items-center justify-center">
        <CircularProgress progress={job.progress} size={28} strokeWidth={2.5} status={job.status} />
        <span className="absolute text-[9px] font-bold">{job.status === 'processing' ? `${job.progress}%` : icon}</span>
      </div>
      <span className="max-w-[80px] truncate">
        {job.status === 'completed' ? 'Done!' : job.status === 'failed' ? 'Failed' : 'Generating...'}
      </span>
      {/* Pulse ring for active */}
      {job.status === 'processing' && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
      )}
    </button>
  );
};

// ── Expanded Panel (shown on click) ──────────────────────────────────────────
const VideoGenPanel: React.FC<{
  jobs: VideoGenJob[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onClose: () => void;
  onNavigate?: (page: any) => void;
}> = ({ jobs, onDismiss, onDismissAll, onClose, onNavigate }) => {
  const [factIndex, setFactIndex] = useState(0);
  const hasProcessing = jobs.some(j => j.status === 'processing');

  // Cycle facts every 4 seconds
  useEffect(() => {
    if (!hasProcessing) return;
    const t = setInterval(() => {
      setFactIndex(i => (i + 1) % VIDEO_GEN_FACTS.length);
    }, 4000);
    return () => clearInterval(t);
  }, [hasProcessing]);

  return (
    <div className="absolute right-0 top-12 w-[340px] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in-down">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎬</span>
          <span className="text-white font-bold text-sm">Video Generation</span>
          <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {jobs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {jobs.length > 1 && (
            <button onClick={onDismissAll} className="text-slate-400 hover:text-red-400 text-xs transition-colors">
              Clear all
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none transition-colors">
            ×
          </button>
        </div>
      </div>

      {/* Fun fact strip (only when generating) */}
      {hasProcessing && (
        <div className="bg-indigo-950/60 px-4 py-2.5 border-b border-white/5">
          <p className="text-xs text-indigo-300 leading-relaxed animate-pulse-slow transition-all duration-500" key={factIndex}>
            {VIDEO_GEN_FACTS[factIndex]}
          </p>
        </div>
      )}

      {/* Job list */}
      <div className="divide-y divide-white/5 max-h-[360px] overflow-y-auto">
        {jobs.map(job => (
          <div key={job.jobId} className="px-4 py-4">
            <div className="flex items-center gap-3">
              {/* Big circular progress */}
              <div className="relative flex-shrink-0 w-12 h-12 flex items-center justify-center">
                <CircularProgress progress={job.progress} size={48} strokeWidth={3.5} status={job.status} />
                <span className="absolute text-[10px] font-bold text-white">
                  {job.status === 'completed' ? '✅' : job.status === 'failed' ? '❌' : `${job.progress}%`}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{job.title}</p>
                <p className={`text-xs mt-0.5 ${
                  job.status === 'completed' ? 'text-green-400' :
                  job.status === 'failed' ? 'text-red-400' : 'text-slate-400'
                }`}>
                  {job.status === 'completed'
                    ? `✓ Video ready via ${job.provider?.replace('replicate-', '') || 'AI'}`
                    : job.status === 'failed'
                    ? `✗ ${job.error || 'Generation failed'}`
                    : 'Generating your short video in background...'}
                </p>

                {/* Progress bar */}
                {job.status === 'processing' && (
                  <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1500 ease-out"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                {job.status === 'completed' && onNavigate && (
                  <button
                    onClick={() => { onNavigate('shorts'); onClose(); }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    View ▶
                  </button>
                )}
                <button
                  onClick={() => onDismiss(job.jobId)}
                  className="text-slate-500 hover:text-red-400 text-[10px] transition-colors text-center"
                >
                  {job.status === 'processing' ? 'Hide' : 'Clear'}
                </button>
              </div>
            </div>

            {/* Animated bars for processing state */}
            {job.status === 'processing' && (
              <div className="flex items-end gap-[3px] mt-3 h-5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-indigo-500/40 rounded-sm"
                    style={{
                      animation: `equalizer 1.2s ease-in-out infinite`,
                      animationDelay: `${i * 0.1}s`,
                      minHeight: '4px',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="px-4 py-2.5 bg-white/3 border-t border-white/5">
        <p className="text-slate-500 text-[10px] text-center">
          You can navigate freely — videos generate in the background
        </p>
      </div>

      <style>{`
        @keyframes equalizer {
          0%, 100% { height: 4px; }
          50% { height: 20px; }
        }
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.2s ease-out; }
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4,0,0.6,1) infinite; }
        .duration-1500 { transition-duration: 1500ms; }
      `}</style>
    </div>
  );
};

// ── Main exported component — goes in the header ──────────────────────────────
export const VideoGenIndicator: React.FC<{ onNavigate?: (page: any) => void }> = ({ onNavigate }) => {
  const { jobs, dismissJob, dismissAll } = useVideoGen();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-open when a new job starts
  useEffect(() => {
    if (jobs.length > 0) setIsOpen(true);
  }, [jobs.length]);

  if (jobs.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      {/* Always-visible chip(s) */}
      <div className="flex items-center gap-1">
        {jobs.slice(0, 2).map(job => (
          <JobChip key={job.jobId} job={job} onClick={() => setIsOpen(o => !o)} />
        ))}
        {jobs.length > 2 && (
          <button
            onClick={() => setIsOpen(o => !o)}
            className="bg-slate-700 text-white text-xs font-bold rounded-full px-2 py-1 border border-white/10"
          >
            +{jobs.length - 2}
          </button>
        )}
      </div>

      {/* Expanded panel */}
      {isOpen && (
        <VideoGenPanel
          jobs={jobs}
          onDismiss={dismissJob}
          onDismissAll={dismissAll}
          onClose={() => setIsOpen(false)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};
