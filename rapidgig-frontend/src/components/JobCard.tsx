import { useState } from 'react';
import type { Job } from '../types/index';
import { JobService } from '../services/jobService';
import { useAuth } from '../contexts/AuthContext';

// DEBUG: JobCard loaded
console.log('DEBUG: JobCard - imports loaded');

interface JobCardProps {
  job: Job;
  showActions?: boolean;
  onJobUpdate?: (job: Job) => void;
  onClick?: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, showActions = true, onJobUpdate, onClick }) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(job.is_saved || false);
  const [isLoading, setIsLoading] = useState(false);

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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    
    return date.toLocaleDateString();
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

  const getWorkTypeColor = (workType: string) => {
    switch (workType) {
      case 'remote':
        return 'bg-green-100 text-green-800';
      case 'onsite':
        return 'bg-blue-100 text-blue-800';
      case 'hybrid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user || user.role !== 'student') return;
    
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(job);
    }
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer border border-gray-200"
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1">
          {job.company_logo ? (
            <img
              src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${job.company_logo}`}
              alt={job.company_name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
              <span className="text-primary text-lg font-bold">
                {job.company_name?.charAt(0) || job.recruiter_name?.charAt(0) || 'C'}
              </span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 font-poppins line-clamp-1">
              {job.title}
            </h3>
            <p className="text-sm text-gray-600 font-inter">
              {job.company_name || job.recruiter_name}
            </p>
          </div>
        </div>

        {/* Save Button */}
        {showActions && user?.role === 'student' && (
          <button
            onClick={handleSaveToggle}
            disabled={isLoading}
            className={`p-2 rounded-full transition-colors ${
              isSaved
                ? 'text-red-500 hover:bg-red-50'
                : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Job Details */}
      <div className="space-y-3 mb-4">
        {/* Pay and Work Type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold text-primary font-poppins">
              {formatPay(job.pay_rate, job.pay_type)}
            </span>
            <span className="text-sm text-gray-500 font-inter">• {job.duration}</span>
          </div>
          
          <div className={`px-2 py-1 rounded-full text-xs font-medium font-inter ${getWorkTypeColor(job.work_type)}`}>
            <span className="mr-1">{getWorkTypeIcon(job.work_type)}</span>
            {job.work_type.charAt(0).toUpperCase() + job.work_type.slice(1)}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center text-sm text-gray-600 font-inter">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {job.location}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 font-inter line-clamp-2">
          {job.description}
        </p>

        {/* Skills */}
        {job.required_skills && job.required_skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {job.required_skills.slice(0, 4).map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-inter"
              >
                {skill}
              </span>
            ))}
            {job.required_skills.length > 4 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-inter">
                +{job.required_skills.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-4 text-sm text-gray-500 font-inter">
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {job.views} views
          </span>
          
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {job.applications_count} applicants
          </span>
        </div>
        
        <span className="text-sm text-gray-500 font-inter">
          {formatTimeAgo(job.created_at)}
        </span>
      </div>

      {/* Category Badge */}
      <div className="absolute top-4 right-4">
        <span className="px-2 py-1 bg-primary bg-opacity-10 text-primary text-xs rounded-full font-inter">
          {job.category}
        </span>
      </div>
    </div>
  );
};

export default JobCard;