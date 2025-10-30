import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { JobService } from '../services/jobService';
import type { Job, Application } from '../types/index';
import ApplicationCard from '../components/ApplicationCard';

// DEBUG: RecruiterDashboard loaded
console.log('DEBUG: RecruiterDashboard - imports loaded');

interface DashboardStats {
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  pending_applications: number;
  accepted_applications: number;
  rejected_applications: number;
}

const RecruiterDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'applications'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [applicationStatus, setApplicationStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'recruiter') {
      loadDashboardData();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'applications') {
      loadApplications();
    }
  }, [activeTab, selectedJob, applicationStatus]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load recruiter's jobs
      const jobsData = await JobService.getRecruiterJobs();
      setJobs(jobsData.jobs);
      
      // Calculate stats
      const totalJobs = jobsData.jobs.length;
      const activeJobs = jobsData.jobs.filter((job: Job) => job.status === 'active').length;
      
      // Load applications for stats
      const applicationsData = await JobService.getRecruiterApplications();
      const totalApplications = applicationsData.length;
      const pendingApplications = applicationsData.filter(app => app.status === 'pending').length;
      const acceptedApplications = applicationsData.filter(app => app.status === 'accepted').length;
      const rejectedApplications = applicationsData.filter(app => app.status === 'rejected').length;
      
      setStats({
        total_jobs: totalJobs,
        active_jobs: activeJobs,
        total_applications: totalApplications,
        pending_applications: pendingApplications,
        accepted_applications: acceptedApplications,
        rejected_applications: rejectedApplications,
      });
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      let applicationsData = await JobService.getRecruiterApplications();
      
      // Filter by job if selected
      if (selectedJob !== 'all') {
        applicationsData = applicationsData.filter(app => app.job_id === selectedJob);
      }
      
      // Filter by status if selected
      if (applicationStatus !== 'all') {
        applicationsData = applicationsData.filter(app => app.status === applicationStatus);
      }
      
      setApplications(applicationsData);
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  };

  const handleApplicationAction = async (applicationId: string, action: 'accept' | 'reject') => {
    try {
      await JobService.updateApplicationStatus(applicationId, action === 'accept' ? 'accepted' : 'rejected');
      
      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: action === 'accept' ? 'accepted' : 'rejected' }
            : app
        )
      );
      
      // Reload stats
      loadDashboardData();
    } catch (error) {
      console.error('Failed to update application status:', error);
    }
  };



  if (user?.role !== 'recruiter') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This page is only accessible to recruiters.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">Recruiter Dashboard</h1>
          <p className="text-gray-600 font-inter">Manage your job postings and applications</p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'jobs', label: 'My Jobs', icon: '💼' },
              { id: 'applications', label: 'Applications', icon: '📝' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm font-inter ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                      <span className="text-blue-600 text-lg">💼</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 font-inter">Total Jobs</p>
                    <p className="text-2xl font-semibold text-gray-900 font-poppins">{stats.total_jobs}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 font-inter">
                    {stats.active_jobs} active jobs
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                      <span className="text-green-600 text-lg">📝</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 font-inter">Total Applications</p>
                    <p className="text-2xl font-semibold text-gray-900 font-poppins">{stats.total_applications}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 font-inter">
                    {stats.pending_applications} pending review
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                      <span className="text-yellow-600 text-lg">⏳</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 font-inter">Pending Applications</p>
                    <p className="text-2xl font-semibold text-gray-900 font-poppins">{stats.pending_applications}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 font-inter">
                    Require your attention
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                      <span className="text-green-600 text-lg">✅</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 font-inter">Accepted</p>
                    <p className="text-2xl font-semibold text-gray-900 font-poppins">{stats.accepted_applications}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                      <span className="text-red-600 text-lg">❌</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 font-inter">Rejected</p>
                    <p className="text-2xl font-semibold text-gray-900 font-poppins">{stats.rejected_applications}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Applications */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 font-poppins">Recent Applications</h3>
              </div>
              <div className="p-6">
                {applications.slice(0, 5).map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    viewType="recruiter"
                    onStatusUpdate={(applicationId, newStatus) => {
                      const action = newStatus === 'accepted' ? 'accept' : 'reject';
                      handleApplicationAction(applicationId, action);
                    }}
                  />
                ))}
                {applications.length === 0 && (
                  <p className="text-gray-500 text-center py-8 font-inter">No applications yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 font-poppins">My Job Postings</h2>
              <button className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors font-inter">
                Post New Job
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 font-poppins">{job.title}</h3>
                      <p className="text-gray-600 font-inter">{job.category} • {job.work_type}</p>
                      <p className="text-gray-500 text-sm font-inter mt-1">
                        Posted {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-inter ${
                        job.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status}
                      </span>
                      <p className="text-sm text-gray-500 mt-1 font-inter">
                        {job.applications_count || 0} applications
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex space-x-3">
                    <button className="text-primary hover:text-primary-dark font-inter">
                      View Applications
                    </button>
                    <button className="text-gray-600 hover:text-gray-800 font-inter">
                      Edit Job
                    </button>
                    <button className="text-gray-600 hover:text-gray-800 font-inter">
                      View Analytics
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                    Filter by Job
                  </label>
                  <select
                    value={selectedJob}
                    onChange={(e) => setSelectedJob(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-inter"
                  >
                    <option value="all">All Jobs</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                    Filter by Status
                  </label>
                  <select
                    value={applicationStatus}
                    onChange={(e) => setApplicationStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-inter"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSelectedJob('all');
                      setApplicationStatus('all');
                    }}
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-inter"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Applications List */}
            <div className="space-y-4">
              {applications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  viewType="recruiter"
                  onStatusUpdate={(applicationId, newStatus) => {
                    const action = newStatus === 'accepted' ? 'accept' : 'reject';
                    handleApplicationAction(applicationId, action);
                  }}
                />
              ))}
              
              {applications.length === 0 && (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-500 font-inter">No applications found with the current filters</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruiterDashboard;