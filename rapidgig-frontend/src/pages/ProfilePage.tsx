import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProfileService } from '../services/profileService';
import type { ProfileData } from '../types/index';
import ProfileCard from '../components/ProfileCard';
import ProfileEditModal from '../components/ProfileEditModal';
import Navbar from '../components/Navbar';

const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'saved' | 'applications'>('overview');

  const isOwnProfile = !id || id === currentUser?.id;

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await ProfileService.getProfile(id);
      setProfileData(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to load profile';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = (updatedData: ProfileData) => {
    setProfileData(updatedData);
    // Update current user context if editing own profile
    if (isOwnProfile && currentUser) {
      // You might want to update the auth context here
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 font-poppins">Profile Not Found</h1>
          <p className="text-gray-600 font-inter">{error || 'The requested profile could not be found.'}</p>
        </div>
      </div>
    );
  }

  const { user, preferences, stats } = profileData;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-1">
            <ProfileCard
              user={user}
              stats={stats}
              isOwnProfile={isOwnProfile}
              onEditClick={() => setIsEditModalOpen(true)}
            />

            {/* Suggested Connections (placeholder) */}
            {!isOwnProfile && (
              <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 font-poppins">Connect</h3>
                <button className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-secondary transition-colors font-inter">
                  Send Connection Request
                </button>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-md mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { key: 'overview', label: 'Overview' },
                    { key: 'videos', label: 'My Videos', studentOnly: true },
                    { key: 'saved', label: 'Saved Jobs', studentOnly: true },
                    { key: 'applications', label: 'My Applications', studentOnly: true },
                  ].map((tab) => {
                    // Hide student-only tabs for recruiters or when viewing other profiles
                    if (tab.studentOnly && (user.role !== 'student' || !isOwnProfile)) {
                      return null;
                    }

                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm font-inter ${
                          activeTab === tab.key
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* About Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 font-poppins">About</h3>
                      {user.role === 'student' ? (
                        <div className="space-y-2">
                          {user.university && (
                            <p className="text-gray-600 font-inter">
                              <span className="font-medium">University:</span> {user.university}
                            </p>
                          )}
                          {user.graduation_year && (
                            <p className="text-gray-600 font-inter">
                              <span className="font-medium">Graduation Year:</span> {user.graduation_year}
                            </p>
                          )}
                          {user.skills && user.skills.length > 0 && (
                            <div>
                              <p className="font-medium text-gray-700 mb-2 font-inter">Skills:</p>
                              <div className="flex flex-wrap gap-2">
                                {user.skills.map((skill, index) => (
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
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {user.company_name && (
                            <p className="text-gray-600 font-inter">
                              <span className="font-medium">Company:</span> {user.company_name}
                            </p>
                          )}
                          {user.company_description && (
                            <div>
                              <p className="font-medium text-gray-700 mb-2 font-inter">About the Company:</p>
                              <p className="text-gray-600 font-inter">{user.company_description}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Activity/Stats Section */}
                    {stats && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 font-poppins">Activity</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-primary font-poppins">{stats.profile_views}</div>
                            <div className="text-sm text-gray-600 font-inter">Profile Views</div>
                          </div>
                          {user.role === 'student' && (
                            <>
                              <div className="bg-gray-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-primary font-poppins">{stats.jobs_applied}</div>
                                <div className="text-sm text-gray-600 font-inter">Jobs Applied</div>
                              </div>
                              <div className="bg-gray-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-primary font-poppins">{stats.jobs_completed}</div>
                                <div className="text-sm text-gray-600 font-inter">Jobs Completed</div>
                              </div>
                              <div className="bg-gray-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-primary font-poppins">
                                  {stats.average_rating > 0 ? stats.average_rating.toFixed(1) : '—'}
                                </div>
                                <div className="text-sm text-gray-600 font-inter">Average Rating</div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'videos' && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📹</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 font-poppins">No Videos Yet</h3>
                    <p className="text-gray-600 font-inter">Upload your first intro video to showcase your skills!</p>
                    {isOwnProfile && (
                      <button className="mt-4 bg-primary text-white py-2 px-4 rounded-md hover:bg-secondary transition-colors font-inter">
                        Upload Video
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'saved' && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">💾</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 font-poppins">No Saved Jobs</h3>
                    <p className="text-gray-600 font-inter">Jobs you save will appear here for easy access.</p>
                  </div>
                )}

                {activeTab === 'applications' && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📄</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 font-poppins">No Applications Yet</h3>
                    <p className="text-gray-600 font-inter">Your job applications will be tracked here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <ProfileEditModal
          user={user}
          preferences={preferences}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
};

export default ProfilePage;