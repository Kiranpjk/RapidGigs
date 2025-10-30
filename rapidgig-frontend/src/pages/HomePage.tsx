import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { JobService } from '../services/jobService';
import { VideoService } from '../services/videoService';
import type { Job, Video } from '../types/index';
import JobCard from '../components/JobCard';
import VideoCard from '../components/VideoCard';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [nearbyJobs, setNearbyJobs] = useState<Job[]>([]);
  const [trendingJobs, setTrendingJobs] = useState<Job[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false); // Set to false initially to show content immediately

  useEffect(() => {
    // Only load data if user is authenticated
    if (user) {
      loadHomeData();
    }
  }, [user]);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      
      // Load data in parallel with better error handling
      const results = await Promise.allSettled([
        JobService.getJobs({ limit: 6 }).then((data: any) => data.jobs),
        JobService.getTrendingJobs(6),
        VideoService.getVideosFeed(1, 8).then((data: any) => data.videos)
      ]);
      
      // Handle results safely
      setNearbyJobs(results[0].status === 'fulfilled' ? results[0].value || [] : []);
      setTrendingJobs(results[1].status === 'fulfilled' ? results[1].value || [] : []);
      setFeaturedVideos(results[2].status === 'fulfilled' ? results[2].value || [] : []);
    } catch (error) {
      console.error('Failed to load home data:', error);
      // Set empty arrays as fallback to ensure UI still renders
      setNearbyJobs([]);
      setTrendingJobs([]);
      setFeaturedVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const jobCategories = [
    { name: 'Technology', icon: '💻', color: 'bg-blue-100 text-blue-600', count: '120+ jobs' },
    { name: 'Design', icon: '🎨', color: 'bg-purple-100 text-purple-600', count: '85+ jobs' },
    { name: 'Marketing', icon: '📢', color: 'bg-green-100 text-green-600', count: '95+ jobs' },
    { name: 'Writing', icon: '✍️', color: 'bg-yellow-100 text-yellow-600', count: '60+ jobs' },
    { name: 'Business', icon: '💼', color: 'bg-red-100 text-red-600', count: '75+ jobs' },
    { name: 'Education', icon: '📚', color: 'bg-indigo-100 text-indigo-600', count: '45+ jobs' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Debug: Always show something
  console.log('HomePage rendering, user:', user);

  // If no user, show a simple welcome message
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to RapidGig</h1>
          <p className="text-xl text-gray-600 mb-8">Please log in to continue</p>
          <Link 
            to="/login" 
            className="bg-primary text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-dark transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-primary-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 font-poppins">
                Find Your Next
                <span className="block text-accent">Opportunity</span>
              </h1>
              <p className="text-xl mb-8 text-white text-opacity-90 font-inter">
                Connect with employers through 60-second video introductions. 
                Show your personality, not just your resume.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {user?.role === 'student' ? (
                  <>
                    <Link
                      to="/shorts"
                      className="bg-accent text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-accent-dark transition-colors text-center font-poppins"
                    >
                      📹 Upload Intro Video
                    </Link>
                    <Link
                      to="/jobs"
                      className="bg-white bg-opacity-20 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-opacity-30 transition-colors text-center font-poppins"
                    >
                      Browse Jobs
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/jobs"
                      className="bg-accent text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-accent-dark transition-colors text-center font-poppins"
                    >
                      💼 Post a Job
                    </Link>
                    <Link
                      to="/shorts"
                      className="bg-white bg-opacity-20 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-opacity-30 transition-colors text-center font-poppins"
                    >
                      Browse Talent
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white bg-opacity-10 rounded-2xl p-8 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold font-poppins">1000+</div>
                    <div className="text-sm opacity-90 font-inter">Active Jobs</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold font-poppins">500+</div>
                    <div className="text-sm opacity-90 font-inter">Companies</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold font-poppins">5000+</div>
                    <div className="text-sm opacity-90 font-inter">Students</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold font-poppins">95%</div>
                    <div className="text-sm opacity-90 font-inter">Success Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Explorer */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-poppins">Explore Categories</h2>
            <p className="text-xl text-gray-600 font-inter">Find opportunities in your field of expertise</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {jobCategories.map((category) => (
              <Link
                key={category.name}
                to={`/jobs?category=${category.name.toLowerCase()}`}
                className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 text-center border border-gray-200 hover:border-primary"
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${category.color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
                  {category.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 font-poppins">{category.name}</h3>
                <p className="text-sm text-gray-500 font-inter">{category.count}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Jobs */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 font-poppins">Trending Jobs</h2>
              <p className="text-xl text-gray-600 font-inter">Popular opportunities right now</p>
            </div>
            <Link
              to="/jobs"
              className="text-primary hover:text-primary-dark font-semibold font-inter"
            >
              View All Jobs →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Videos */}
      {featuredVideos.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4 font-poppins">Featured Talent</h2>
                <p className="text-xl text-gray-600 font-inter">Discover amazing video introductions</p>
              </div>
              <Link
                to="/shorts"
                className="text-primary hover:text-primary-dark font-semibold font-inter"
              >
                View All Videos →
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {featuredVideos.slice(0, 8).map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-poppins">How RapidGig Works</h2>
            <p className="text-xl text-gray-600 font-inter">Get hired in three simple steps</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
                <span className="text-3xl">📹</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 font-poppins">1. Create Your Video</h3>
              <p className="text-gray-600 font-inter">
                Record a 60-second introduction video showcasing your skills, personality, and passion.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 font-poppins">2. Get Matched</h3>
              <p className="text-gray-600 font-inter">
                Our AI matches you with relevant job opportunities based on your skills and preferences.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 font-poppins">3. Apply Instantly</h3>
              <p className="text-gray-600 font-inter">
                Apply to jobs with just one click using your video introduction. No lengthy forms!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-primary-dark text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4 font-poppins">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-white text-opacity-90 font-inter">
            Join thousands of students and employers connecting through video introductions
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user?.role === 'student' ? (
              <Link
                to="/shorts"
                className="bg-accent text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-accent-dark transition-colors font-poppins"
              >
                Upload Your First Video
              </Link>
            ) : (
              <Link
                to="/jobs"
                className="bg-accent text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-accent-dark transition-colors font-poppins"
              >
                Post Your First Job
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;