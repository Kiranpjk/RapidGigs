import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Job, Application } from '../types';
import { applicationsAPI } from '../services/api';

interface JobContextType {
  savedJobs: Job[];
  applications: Application[];
  saveJob: (job: Job) => void;
  unsaveJob: (jobId: number) => void;
  isJobSaved: (jobId: number) => boolean;
  submitApplication: (job: Job, resumeFile: File, videoFile: File | null, coverLetter: string) => Promise<void>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load from localStorage on init
  const [savedJobs, setSavedJobs] = useState<Job[]>(() => {
    const saved = localStorage.getItem('savedJobs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem('applications');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever savedJobs changes
  React.useEffect(() => {
    localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
  }, [savedJobs]);

  // Save to localStorage whenever applications changes
  React.useEffect(() => {
    localStorage.setItem('applications', JSON.stringify(applications));
  }, [applications]);

  const saveJob = (job: Job) => {
    if (!savedJobs.find(j => j.id === job.id)) {
      setSavedJobs(prev => [...prev, job]);
    }
  };

  const unsaveJob = (jobId: number) => {
    setSavedJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const isJobSaved = (jobId: number) => {
    return savedJobs.some(j => j.id === jobId);
  };

  const submitApplication = async (job: Job, resumeFile: File, videoFile: File | null, coverLetter: string): Promise<void> => {
    const jobId = job.id?.toString();

    // Only store in DB if the job has a valid MongoDB ObjectId (24 hex chars)
    const isRealJob = /^[a-f\d]{24}$/i.test(jobId || '');

    if (isRealJob) {
      // Call the real backend API
      await applicationsAPI.create({
        jobId: jobId!,
        coverLetter: coverLetter,
        // Note: resume/video files would need file upload support
        // For now we store the file names as placeholder URLs
        resumeUrl: resumeFile ? `uploaded:${resumeFile.name}` : undefined,
        videoUrl: videoFile ? `uploaded:${videoFile.name}` : undefined,
      });
    }

    // Also persist to local state for optimistic display
    const newApplication: Application = {
      id: Date.now(),
      job: job,
      dateApplied: new Date().toISOString().split('T')[0],
      status: 'Applied',
    };
    setApplications(prev => [...prev, newApplication]);
  };

  return (
    <JobContext.Provider value={{ savedJobs, applications, saveJob, unsaveJob, isJobSaved, submitApplication }}>
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
