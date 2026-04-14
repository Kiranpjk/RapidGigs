/**
 * VideoGenContext.tsx
 * Global context for background video generation tracking.
 * Works exactly like Chrome/Edge download indicator — fires in background,
 * user can navigate freely while the video generates.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { shortsAPI } from '../services/api';

export interface VideoGenJob {
  jobId: string;
  title: string;         // Job title for display
  status: 'processing' | 'completed' | 'failed';
  progress: number;      // 0–100 simulated progress
  videoUrl?: string;
  error?: string;
  startedAt: number;     // timestamp
  provider?: string;
  /** When true, Post Job page shows detailed progress; header chip is hidden there to avoid duplicate UI */
  fromPostJob?: boolean;
}

export interface StartVideoGenOptions {
  fromPostJob?: boolean;
}

interface VideoGenContextValue {
  jobs: VideoGenJob[];
  startJob: (jobId: string, title: string, options?: StartVideoGenOptions) => void;
  dismissJob: (jobId: string) => void;
  dismissAll: () => void;
}

const VideoGenContext = createContext<VideoGenContextValue>({
  jobs: [],
  startJob: () => {},
  dismissJob: () => {},
  dismissAll: () => {},
});

export const useVideoGen = () => useContext(VideoGenContext);

// ── Fun facts shown while generating (Zomato-style) ──────────────────────────
export const VIDEO_GEN_FACTS = [
  '🎬 AI is crafting your video frame by frame...',
  '🧠 Did you know? Most job decisions happen in the first 6 seconds of a video!',
  '🎯 Videos increase application rates by 34% on average.',
  '🌍 Over 500 million people watch videos on LinkedIn weekly.',
  '✨ Your video is being rendered at 24 frames per second...',
  '💡 Great videos use real workplaces — AI is imagining yours!',
  '🚀 Recruiters spend 6x more time on profiles with video.',
  '🎨 Choosing the perfect color palette for your scene...',
  '📊 Jobs with video descriptions get 12% more qualified applicants.',
  '🔥 Fun fact: The human brain processes visuals 60,000x faster than text!',
  '🎥 Adding cinematic lighting to your scene...',
  '⚡ Replicate is running your video on cloud GPUs right now!',
  '🌟 Almost there — polishing the final frames...',
];

// ── Provider ──────────────────────────────────────────────────────────────────
export const VideoGenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<VideoGenJob[]>([]);
  const pollingRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const progressRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const autoDismissRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const jobsRef = useRef<VideoGenJob[]>([]);

  // Keep ref synced with state
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const stopPolling = useCallback((jobId: string) => {
    const p = pollingRefs.current.get(jobId);
    if (p) { clearInterval(p); pollingRefs.current.delete(jobId); }
    const pr = progressRefs.current.get(jobId);
    if (pr) { clearInterval(pr); progressRefs.current.delete(jobId); }
    const timeout = autoDismissRefs.current.get(jobId);
    if (timeout) { clearTimeout(timeout); autoDismissRefs.current.delete(jobId); }
  }, []);

  const startJob = useCallback((jobId: string, title: string, options?: StartVideoGenOptions) => {
    // Add to jobs list
    setJobs(prev => [
      ...prev.filter(j => j.jobId !== jobId),
      {
        jobId,
        title,
        status: 'processing',
        progress: 0,
        startedAt: Date.now(),
        fromPostJob: options?.fromPostJob === true,
      },
    ]);

    // ── Simulate progress (non-linear, slows near 90%) ────────────────────
    let simProgress = 0;
    const progressInterval = setInterval(() => {
      simProgress += simProgress < 30 ? 3 : simProgress < 60 ? 1.5 : simProgress < 85 ? 0.5 : 0.1;
      const clamped = Math.min(Math.round(simProgress), 89); // Never reach 100 until done
      setJobs(prev => prev.map(j =>
        j.jobId === jobId && j.status === 'processing'
          ? { ...j, progress: clamped }
          : j
      ));
    }, 2000);
    progressRefs.current.set(jobId, progressInterval);

    // ── Poll backend for real status ───────────────────────────────────────
    const pollInterval = setInterval(async () => {
      try {
        const data: any = await shortsAPI.getJobStatus(jobId);

        if (data.status === 'completed') {
          stopPolling(jobId);
          setJobs(prev => prev.map(j =>
            j.jobId === jobId
              ? { ...j, status: 'completed', progress: 100, videoUrl: data.videoUrl, provider: data.provider, fromPostJob: j.fromPostJob }
              : j
          ));
          // Auto-dismiss after 8 seconds (now with proper cleanup)
          const timeout = setTimeout(() => {
            setJobs(prev => prev.filter(j => j.jobId !== jobId));
            autoDismissRefs.current.delete(jobId);
          }, 8000);
          autoDismissRefs.current.set(jobId, timeout);
        } else if (data.status === 'failed') {
          stopPolling(jobId);
          setJobs(prev => prev.map(j =>
            j.jobId === jobId
              ? { ...j, status: 'failed', progress: 0, error: data.error || 'Generation failed', fromPostJob: j.fromPostJob }
              : j
          ));
        }
      } catch {
        // Network error — keep polling silently
      }
    }, 8000); // Poll every 8s

    pollingRefs.current.set(jobId, pollInterval);
  }, [stopPolling]);

  const dismissJob = useCallback((jobId: string) => {
    stopPolling(jobId);
    setJobs(prev => prev.filter(j => j.jobId !== jobId));
  }, [stopPolling]);

  const dismissAll = useCallback(() => {
    // Use ref to get current jobs, not state (avoids stale closure)
    const currentJobs = jobsRef.current;
    currentJobs.forEach(j => stopPolling(j.jobId));
    setJobs([]);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pollingRefs.current.forEach(clearInterval);
      progressRefs.current.forEach(clearInterval);
      autoDismissRefs.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <VideoGenContext.Provider value={{ jobs, startJob, dismissJob, dismissAll }}>
      {children}
    </VideoGenContext.Provider>
  );
};
