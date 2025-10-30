import React, { useState, useEffect } from 'react';
import type { Job } from '../types/index';
import { JobService } from '../services/jobService';
import JobCard from './JobCard';
import { useAuth } from '../contexts/AuthContext';

interface JobDetailModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onApply?: (job: Job) => void;
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  isOpen,
  onClose,
  onApply,
}) => {
  const { user } = useAuth();
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [showCoverLetterForm, setShowCoverLetterForm] = useState(false);
  const [isSaved, setIsSaved] = useState(job.is_saved || false);

  useEffect(() => {
    if (isOpen && job.id) {
      loadSimilarJobs();
    }
  }, [isOpen, job.id]);

  const loadSimilarJobs = async () => {
    try {
      const similar = await JobService.getSimilarJobs(job.id, 3);
      setSimilarJobs(similar);
    } catch (error) {
      console.error('Failed to load similar jobs:', error);
    }
  };

  const handleApply = async () => {
    if (!user || user.role !== 'student') return;

    setIsApplying(true);
    try {
      await JobService.applyToJob(job.id, coverLetter);
      onApply?.(job);
      onClose();
    } catch (error: any) {
      console.error('Application failed:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsApplying(false);
    }
  };

  const handleSaveToggle = async () => {
    if (!user || user.role !== 'student') return;

    try {
      if (isSaved) {
        await JobService.unsaveJob(job.id);
        setIsSaved(false);
      } else {
        await JobService.saveJob(job.id);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error toggling job save:', error);
    }
  };

  const formatPay = (payRate: number, payType: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(payRate);

    switch (payType) {
      case 'hourly':
        return `${formatted}/hr`;
      case 'fixed':
        return formatted;
      case 'negotiable':
        return 'Negotiable';
      default:
        return formatted;
    }
  };

  const getWorkTypeIcon = (workType: string) => {
    switch (workType) {
      case 'remote':
        return '🏠';
      case 'onsite':
        return '🏢';
      case 'hybrid':
        return '🔄';
      default:
        return '📍';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              {job.company_logo ? (
                <img
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${job.company_logo}`}
                  alt={job.company_name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
                  <span className="text-primary text-xl font-bold">
                    {job.company_name?.charAt(0) || job.recruiter_name?.charAt(0) || 'C'}
                  </span>
                </div>
              )}
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 font-poppins">{job.title}</h2>
                <p className="text-lg text-gray-600 font-inter">
                  {job.company_name || job.recruiter_name}
                </p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-xl font-semibold text-primary font-poppins">
                    {formatPay(job.pay_rate, job.pay_type)}
                  </span>
                  <span className="text-sm text-gray-500 font-inter">• {job.duration}</span>
                  <span className="flex items-center text-sm text-gray-500 font-inter">
                    {getWorkTypeIcon(job.work_type)} {job.work_type}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Job Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 font-poppins">Job Description</h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 font-inter whitespace-pre-wrap">{job.description}</p>
                </div>
              </div>

              {/* Required Skills */}
              {job.required_skills && job.required_skills.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 font-poppins">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary bg-opacity-10 text-primary text-sm rounded-full font-inter"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Jobs */}
              {similarJobs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 font-poppins">Similar Jobs</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {similarJobs.map((similarJob) => (
                      <JobCard
                        key={similarJob.id}
                        job={similarJob}
                        showActions={false}
                        className="transform scale-95"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Job Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 font-poppins">Job Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center text-sm font-inter">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span className="text-gray-600">{job.location || 'Remote'}</span>
                  </div>
                  
                  <div className="flex items-center text-sm font-inter">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-600">{job.duration}</span>
                  </div>
                  
                  <div className="flex items-center text-sm font-inter">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 8h1m-1-4h1m4 4h1m-1-4h1" />
                    </svg>
                    <span className="text-gray-600">{job.category}</span>
                  </div>
                  
                  <div className="flex items-center text-sm font-inter">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-gray-600">{job.views || 0} views</span>
                  </div>
                  
                  {job.expires_at && (
                    <div className="flex items-center text-sm font-inter">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-600">
                        Expires {new Date(job.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {user?.role === 'student' && (
                <div className="space-y-3">
                  {!job.has_applied ? (
                    <>
                      {!showCoverLetterForm ? (
                        <button
                          onClick={() => setShowCoverLetterForm(true)}
                          className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-dark transition-colors font-poppins"
                        >
                          Apply Now
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <textarea
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            placeholder="Write a brief cover letter (optional)..."
                            className="w-full p-3 border border-gray-300 rounded-lg resize-none font-inter"
                            rows={4}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={handleApply}
                              disabled={isApplying}
                              className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 font-poppins"
                            >
                              {isApplying ? 'Applying...' : 'Submit Application'}
                            </button>
                            <button
                              onClick={() => setShowCoverLetterForm(false)}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-inter"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <span className="text-green-700 font-semibold font-inter">✓ Applied</span>
                    </div>
                  )}
                  
                  <button
                    onClick={handleSaveToggle}
                    className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors font-inter ${
                      isSaved
                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {isSaved ? '★ Saved' : '☆ Save Job'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailModal;