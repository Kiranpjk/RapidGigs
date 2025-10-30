import React, { useState, useEffect, useCallback } from 'react';
import { JobService } from '../services/jobService';
import type { Job, JobCategory, JobFilters } from '../types/index';
import JobCard from '../components/JobCard';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

// DEBUG: JobsPage loaded
console.log('DEBUG: JobsPage - imports loaded');

const JobsPage: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [trendingJobs, setTrendingJobs] = useState<Job[]>([]);
  
  const [filters, setFilters] = useState<JobFilters>({
    category: '',
    workType: '',
    payType: '',
    location: '',
    requiredSkills: [],
    minPay: undefined,
    maxPay: undefined,
    search: ''
  });

  const [activeView, setActiveView] = useState<'all' | 'recommended' | 'trending' | 'saved'>('all');

  // Load initial data
  useEffect(() => {
    loadCategories();
    if (user?.role === 'student') {
      loadRecommendedJobs();
    }
    loadTrendingJobs();
    loadJobs(true);
  }, [filters, user]);

  const loadCategories = async () => {
    try {
      const categoriesData = await JobService.getJobCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadRecommendedJobs = async () => {
    try {
      const recommended = await JobService.getRecommendedJobs(10);
      setRecommendedJobs(recommended);
    } catch (err) {
      console.error('Failed to load recommended jobs:', err);
    }
  };

  const loadTrendingJobs = async () => {
    try {
      const trending = await JobService.getTrendingJobs(10);
      setTrendingJobs(trending);
    } catch (err) {
      console.error('Failed to load trending jobs:', err);
    }
  };

  const loadJobs = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      let jobsData;

      if (activeView === 'recommended' && user?.role === 'student') {
        jobsData = { jobs: recommendedJobs, pagination: { total: recommendedJobs.length } };
      } else if (activeView === 'trending') {
        jobsData = { jobs: trendingJobs, pagination: { total: trendingJobs.length } };
      } else if (activeView === 'saved' && user?.role === 'student') {
        const savedJobs = await JobService.getSavedJobs();
        jobsData = { jobs: savedJobs, pagination: { total: savedJobs.length } };
      } else {
        jobsData = await JobService.getJobs({
          ...filters,
          page: currentPage,
          limit: 20
        });
      }

      if (reset) {
        setJobs(jobsData.jobs);
      } else {
        setJobs(prev => [...prev, ...jobsData.jobs]);
      }

      setHasMore(jobsData.jobs.length === 20 && activeView === 'all');
      setPage(currentPage + 1);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to load jobs';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && activeView === 'all') {
      loadJobs(false);
    }
  }, [loadingMore, hasMore, activeView]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000
      ) {
        handleLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleLoadMore]);

  const handleFilterChange = (key: keyof JobFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setActiveView('all');
  };

  const handleSkillToggle = (skill: string) => {
    setFilters(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills?.includes(skill)
        ? prev.requiredSkills.filter(s => s !== skill)
        : [...(prev.requiredSkills || []), skill]
    }));
    setActiveView('all');
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      workType: '',
      payType: '',
      location: '',
      requiredSkills: [],
      minPay: undefined,
      maxPay: undefined,
      search: ''
    });
    setActiveView('all');
  };

  const handleViewChange = (view: 'all' | 'recommended' | 'trending' | 'saved') => {
    setActiveView(view);
    loadJobs(true);
  };

  const popularSkills = [
    'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'TypeScript',
    'UI/UX Design', 'Figma', 'Photoshop', 'Marketing', 'Content Writing',
    'Data Analysis', 'Excel', 'SQL', 'Project Management'
  ];

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
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">Find Your Next Gig</h1>
          <p className="text-gray-600 font-inter mt-1">
            Discover opportunities that match your skills and interests
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Filters */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              {/* View Tabs */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleViewChange('all')}
                    className={`px-3 py-2 text-sm rounded-lg font-inter transition-colors ${
                      activeView === 'all'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Jobs
                  </button>
                  
                  {user?.role === 'student' && (
                    <>
                      <button
                        onClick={() => handleViewChange('recommended')}
                        className={`px-3 py-2 text-sm rounded-lg font-inter transition-colors ${
                          activeView === 'recommended'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        For You
                      </button>
                      
                      <button
                        onClick={() => handleViewChange('saved')}
                        className={`px-3 py-2 text-sm rounded-lg font-inter transition-colors ${
                          activeView === 'saved'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Saved
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => handleViewChange('trending')}
                    className={`px-3 py-2 text-sm rounded-lg font-inter transition-colors ${
                      activeView === 'trending'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Trending
                  </button>
                </div>
              </div>

              {activeView === 'all' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 font-poppins">Filters</h3>
                    <button
                      onClick={clearFilters}
                      className="text-sm text-primary hover:text-secondary font-inter"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Search */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                      Search Jobs
                    </label>
                    <input
                      type="text"
                      value={filters.search || ''}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      placeholder="Job title, company, keywords..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>

                  {/* Category Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                      Category
                    </label>
                    <select
                      value={filters.category || ''}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.name}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Work Type Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                      Work Type
                    </label>
                    <select
                      value={filters.workType || ''}
                      onChange={(e) => handleFilterChange('workType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    >
                      <option value="">All Types</option>
                      <option value="remote">Remote</option>
                      <option value="onsite">On-site</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>

                  {/* Pay Type Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                      Pay Type
                    </label>
                    <select
                      value={filters.payType || ''}
                      onChange={(e) => handleFilterChange('payType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    >
                      <option value="">All Pay Types</option>
                      <option value="hourly">Hourly</option>
                      <option value="fixed">Fixed Price</option>
                      <option value="negotiable">Negotiable</option>
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                      Location
                    </label>
                    <input
                      type="text"
                      value={filters.location || ''}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                      placeholder="City, state, or country"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>

                  {/* Pay Range Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                      Pay Range
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={filters.minPay || ''}
                        onChange={(e) => handleFilterChange('minPay', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Min"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                      />
                      <input
                        type="number"
                        value={filters.maxPay || ''}
                        onChange={(e) => handleFilterChange('maxPay', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Max"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Skills Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                      Skills
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {popularSkills.map(skill => (
                        <button
                          key={skill}
                          onClick={() => handleSkillToggle(skill)}
                          className={`px-3 py-1 text-sm rounded-full transition-colors font-inter ${
                            filters.requiredSkills?.includes(skill)
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main Content - Job Listings */}
          <div className="flex-1">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                {error}
              </div>
            )}

            {jobs.length === 0 && !loading ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💼</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">
                  No jobs found
                </h3>
                <p className="text-gray-600 font-inter mb-4">
                  {activeView === 'saved' 
                    ? 'You haven\'t saved any jobs yet.'
                    : 'Try adjusting your filters to see more opportunities.'}
                </p>
              </div>
            ) : (
              <>
                {/* Active Filters Display */}
                {activeView === 'all' && (filters.search || filters.category || filters.workType || filters.requiredSkills?.length) && (
                  <div className="mb-6 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600 font-inter">Active filters:</span>
                    
                    {filters.search && (
                      <span className="px-3 py-1 bg-primary bg-opacity-10 text-primary text-sm rounded-full font-inter">
                        Search: "{filters.search}"
                      </span>
                    )}
                    
                    {filters.category && (
                      <span className="px-3 py-1 bg-primary bg-opacity-10 text-primary text-sm rounded-full font-inter">
                        {filters.category}
                      </span>
                    )}
                    
                    {filters.workType && (
                      <span className="px-3 py-1 bg-primary bg-opacity-10 text-primary text-sm rounded-full font-inter">
                        {filters.workType}
                      </span>
                    )}
                    
                    {filters.requiredSkills?.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-primary bg-opacity-10 text-primary text-sm rounded-full font-inter">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/* Results Count */}
                <div className="mb-6">
                  <p className="text-gray-600 font-inter">
                    {activeView === 'recommended' && 'Recommended jobs for you'}
                    {activeView === 'trending' && 'Trending jobs this week'}
                    {activeView === 'saved' && 'Your saved jobs'}
                    {activeView === 'all' && `${jobs.length} jobs found`}
                  </p>
                </div>

                {/* Job Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      showActions={true}
                    />
                  ))}
                </div>

                {/* Load More Button / Loading */}
                {hasMore && activeView === 'all' && (
                  <div className="text-center mt-8">
                    {loadingMore ? (
                      <div className="inline-flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="text-gray-600 font-inter">Loading more jobs...</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleLoadMore}
                        className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-inter"
                      >
                        Load More Jobs
                      </button>
                    )}
                  </div>
                )}

                {!hasMore && jobs.length > 0 && activeView === 'all' && (
                  <div className="text-center mt-8">
                    <p className="text-gray-500 font-inter">You've seen all available jobs!</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobsPage;