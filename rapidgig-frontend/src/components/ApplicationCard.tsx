import { useState } from 'react';
import type { Application } from '../types/index';
import { JobService } from '../services/jobService';
import { useAuth } from '../contexts/AuthContext';

// DEBUG: ApplicationCard loaded
console.log('DEBUG: ApplicationCard - imports loaded');

interface ApplicationCardProps {
  application: Application;
  viewType: 'student' | 'recruiter';
  onStatusUpdate?: (applicationId: string, newStatus: string) => void;
  onWithdraw?: (applicationId: string) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  viewType,
  onStatusUpdate,
  onWithdraw,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'reviewed':
        return '👀';
      case 'accepted':
        return '✅';
      case 'rejected':
        return '❌';
      case 'withdrawn':
        return '↩️';
      default:
        return '📄';
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

  const handleStatusUpdate = async (newStatus: string) => {
    if (!onStatusUpdate) return;
    
    setIsLoading(true);
    try {
      await JobService.updateApplicationStatus(application.id, newStatus);
      onStatusUpdate(application.id, newStatus);
    } catch (error) {
      console.error('Error updating application status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!onWithdraw) return;
    
    setIsLoading(true);
    try {
      await JobService.withdrawApplication(application.id);
      onWithdraw(application.id);
    } catch (error) {
      console.error('Error withdrawing application:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {viewType === 'student' ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 font-poppins">
                {application.job_title}
              </h3>
              <p className="text-sm text-gray-600 font-inter">
                {application.company_name || 'Company'}
              </p>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {application.student_avatar ? (
                <img
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${application.student_avatar}`}
                  alt={application.student_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
                  <span className="text-primary text-sm font-bold">
                    {application.student_name?.charAt(0) || 'S'}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 font-poppins">
                  {application.student_name}
                </h3>
                <p className="text-sm text-gray-600 font-inter">
                  Applied to: {application.job_title}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className={`px-3 py-1 rounded-full text-sm font-medium font-inter ${getStatusColor(application.status)}`}>
          <span className="mr-1">{getStatusIcon(application.status)}</span>
          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
        </div>
      </div>

      {/* Skills (for recruiter view) */}
      {viewType === 'recruiter' && application.student_skills && application.student_skills.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 font-inter">Skills</h4>
          <div className="flex flex-wrap gap-2">
            {application.student_skills.slice(0, 6).map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-inter"
              >
                {skill}
              </span>
            ))}
            {application.student_skills.length > 6 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-inter">
                +{application.student_skills.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Cover Letter */}
      {application.cover_letter && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 font-inter">Cover Letter</h4>
          <p className="text-sm text-gray-600 font-inter bg-gray-50 p-3 rounded-md">
            {application.cover_letter}
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="flex items-center justify-between text-sm text-gray-500 font-inter mb-4">
        <span>Applied {formatTimeAgo(application.applied_at)}</span>
        {application.updated_at !== application.applied_at && (
          <span>Updated {formatTimeAgo(application.updated_at)}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          {viewType === 'recruiter' && application.status === 'pending' && (
            <>
              <button
                onClick={() => handleStatusUpdate('reviewed')}
                disabled={isLoading}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-md hover:bg-blue-200 transition-colors font-inter disabled:opacity-50"
              >
                Mark Reviewed
              </button>
              <button
                onClick={() => handleStatusUpdate('accepted')}
                disabled={isLoading}
                className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-md hover:bg-green-200 transition-colors font-inter disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => handleStatusUpdate('rejected')}
                disabled={isLoading}
                className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-md hover:bg-red-200 transition-colors font-inter disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}

          {viewType === 'recruiter' && application.status === 'reviewed' && (
            <>
              <button
                onClick={() => handleStatusUpdate('accepted')}
                disabled={isLoading}
                className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-md hover:bg-green-200 transition-colors font-inter disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => handleStatusUpdate('rejected')}
                disabled={isLoading}
                className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-md hover:bg-red-200 transition-colors font-inter disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}

          {viewType === 'student' && application.status === 'pending' && (
            <button
              onClick={handleWithdraw}
              disabled={isLoading}
              className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-md hover:bg-gray-200 transition-colors font-inter disabled:opacity-50"
            >
              Withdraw
            </button>
          )}
        </div>

        {/* View Details Button */}
        <button className="text-primary hover:text-secondary text-sm font-medium font-inter">
          View Details
        </button>
      </div>
    </div>
  );
};

export default ApplicationCard;