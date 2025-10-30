import React, { useState, useEffect } from 'react';
import { JobService } from '../services/jobService';
import type { Application } from '../types/index';
import ApplicationCard from '../components/ApplicationCard';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

const ApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reviewed' | 'accepted' | 'rejected'>('all');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadApplications();
    loadStats();
  }, [activeTab]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const status = activeTab === 'all' ? undefined : activeTab;
      const applicationsData = await JobService.getStudentApplications(status);
      setApplications(applicationsData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to load applications';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // This would call the stats endpoint when implemented
      // const statsData = await JobService.getApplicationStats();
      // setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleStatusUpdate = (applicationId: string, newStatus: string) => {
    setApplications(prev => 
      prev.map(app => 
        app.id === applicationId 
          ? { ...app, status: newStatus as any, updated_at: new Date().toISOString() }
          : app
      )
    );
  };

  const handleWithdraw = (applicationId: string) => {
    setApplications(prev => 
      prev.map(app => 
        app.id === applicationId 
          ? { ...app, status: 'withdrawn', updated_at: new Date().toISOString() }
          : app
      )
    );
  };

  const getTabCount = (status: string) => {
    if (status === 'all') return applications.length;
    return applications.filter(app => app.status === status).length;
  };

  const filteredApplications = activeTab === 'all' 
    ? applications 
    : applications.filter(app => app.status === activeTab);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">My Applications</h1>
          <p className="text-gray-600 font-inter mt-1">
            Track your job applications and their status
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📄</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 font-poppins">{applications.length}</p>
                <p className="text-sm text-gray-600 font-inter">Total Applications</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 font-poppins">
                  {applications.filter(app => app.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-600 font-inter">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 font-poppins">
                  {applications.filter(app => app.status === 'accepted').length}
                </p>
                <p className="text-sm text-gray-600 font-inter">Accepted</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-2 bg-primary bg-opacity-10 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 font-poppins">
                  {applications.length > 0 
                    ? Math.round((applications.filter(app => app.status === 'accepted').length / applications.length) * 100)
                    : 0}%
                </p>
                <p className="text-sm text-gray-600 font-inter">Success Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'all', label: 'All Applications' },
                { key: 'pending', label: 'Pending' },
                { key: 'reviewed', label: 'Reviewed' },
                { key: 'accepted', label: 'Accepted' },
                { key: 'rejected', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm font-inter relative ${
                    activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {getTabCount(tab.key) > 0 && (
                    <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {getTabCount(tab.key)}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">
              {activeTab === 'all' ? 'No applications yet' : `No ${activeTab} applications`}
            </h3>
            <p className="text-gray-600 font-inter mb-4">
              {activeTab === 'all' 
                ? 'Start applying to jobs to see your applications here.'
                : `You don't have any ${activeTab} applications at the moment.`}
            </p>
            {activeTab === 'all' && (
              <button
                onClick={() => window.location.href = '/jobs'}
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition-colors font-inter"
              >
                Browse Jobs
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredApplications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                viewType="student"
                onStatusUpdate={handleStatusUpdate}
                onWithdraw={handleWithdraw}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationsPage;