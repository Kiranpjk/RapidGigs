// ✅ FIXED: All job IDs changed to string to match MongoDB
// ✅ FIXED: localStorage now only saves serializable data (no ReactNode logos)
// ✅ FIXED: isJobSaved and unsaveJob accept string IDs

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Job, Application } from '../types';
import { applicationsAPI } from '../services/api';

interface JobContextType {
  savedJobs: Job[];
  applications: Application[];
  saveJob: (job: Job) => void;
  unsaveJob: (jobId: string) => void; // ✅ was: number
  isJobSaved: (jobId: string) => boolean; // ✅ was: number
  submitApplication: (
    job: Job,
    resumeFile: File,
    videoFile: File | null,
    coverLetter: string
  ) => Promise<void>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

// ✅ FIXED: Strip non-serializable fields before saving to localStorage
const serializeJob = (job: Job): Job => ({
  id: job.id,
  title: job.title,
  company: job.company,
  location: job.location,
  type: job.type,
  pay: job.pay,
  description: job.description,
  postedAgo: job.postedAgo,
  category: job.category,
  companyVideoUrl: job.companyVideoUrl,
  freelancerVideoUrl: job.freelancerVideoUrl,
  shortVideoUrl: job.shortVideoUrl,
  likes: job.likes,
  comments: job.comments,
  shares: job.shares,
});

// ✅ FIXED: Safely parse localStorage, returning empty array on any error
const loadFromStorage = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const JobProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [savedJobs, setSavedJobs] = useState<Job[]>(() =>
    loadFromStorage<Job>('savedJobs')
  );

  const [applications, setApplications] = useState<Application[]>(() =>
    loadFromStorage<Application>('applications')
  );

  // ✅ FIXED: Serialize before saving to strip any ReactNode values
  React.useEffect(() => {
    try {
      localStorage.setItem('savedJobs', JSON.stringify(savedJobs.map(serializeJob)));
    } catch (e) {
      console.warn('Failed to persist savedJobs:', e);
    }
  }, [savedJobs]);

  React.useEffect(() => {
    try {
      localStorage.setItem('applications', JSON.stringify(applications));
    } catch (e) {
      console.warn('Failed to persist applications:', e);
    }
  }, [applications]);

  const saveJob = (job: Job) => {
    const id = String(job.id);
    if (!savedJobs.find(j => String(j.id) === id)) {
      setSavedJobs(prev => [...prev, serializeJob(job)]);
    }
  };

  // ✅ FIXED: accepts string
  const unsaveJob = (jobId: string) => {
    setSavedJobs(prev => prev.filter(j => String(j.id) !== String(jobId)));
  };

  // ✅ FIXED: accepts string
  const isJobSaved = (jobId: string): boolean => {
    return savedJobs.some(j => String(j.id) === String(jobId));
  };

  const submitApplication = async (
    job: Job,
    resumeFile: File,
    videoFile: File | null,
    coverLetter: string
  ): Promise<void> => {
    const jobId = String(job.id);
    const isRealJob = /^[a-f\d]{24}$/i.test(jobId);

    if (isRealJob) {
      await applicationsAPI.create({
        jobId,
        coverLetter,
        resumeUrl: resumeFile ? `uploaded:${resumeFile.name}` : undefined,
        videoUrl: videoFile ? `uploaded:${videoFile.name}` : undefined,
      });
    }

    const newApplication: Application = {
      id: String(Date.now()),
      job,
      dateApplied: new Date().toISOString().split('T')[0],
      status: 'Applied',
    };
    setApplications(prev => [...prev, newApplication]);
  };

  return (
    <JobContext.Provider
      value={{ savedJobs, applications, saveJob, unsaveJob, isJobSaved, submitApplication }}
    >
      {children}
    </JobContext.Provider>
  );
};

export const useJobs = () => {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error('useJobs must be used within a JobProvider');
  }
  return context;
};
