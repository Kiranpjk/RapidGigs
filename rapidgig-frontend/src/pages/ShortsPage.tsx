import React, { useState, useEffect, useCallback } from 'react';
import { VideoService } from '../services/videoService';
import type { Video } from '../types/index';
import VideoCard from '../components/VideoCard';
import VideoUploadModal from '../components/VideoUploadModal';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

interface Filters {
  category: string;
  tags: string[];
  duration: string;
  sortBy: string;
}

const ShortsPage: React.FC = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  const [filters, setFilters] = useState<Filters>({
    category: '',
    tags: [],
    duration: '',
    sortBy: 'recent'
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadVideos(true);
  }, [filters, searchQuery]);

  const loadCategories = async () => {
    try {
      const categoriesData = await VideoService.getCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadVideos = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      let videosData;

      if (searchQuery || filters.category || filters.tags.length > 0) {
        // Use search API with filters
        videosData = await VideoService.searchVideos({
          q: searchQuery,
          category: filters.category,
          tags: filters.tags,
          page: currentPage,
          limit: 20
        });
      } else {
        // Use regular feed
        videosData = await VideoService.getVideosFeed(currentPage, 20, filters.category);
      }

      if (reset) {
        setVideos(videosData.videos);
      } else {
        setVideos(prev => [...prev, ...videosData.videos]);
      }

      setHasMore(videosData.videos.length === 20);
      setPage(currentPage + 1);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to load videos';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadVideos(false);
    }
  }, [loadingMore, hasMore]);

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

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      tags: [],
      duration: '',
      sortBy: 'recent'
    });
    setSearchQuery('');
  };

  const handleUploadComplete = (video: Video) => {
    setVideos(prev => [video, ...prev]);
  };

  const popularTags = [
    'JavaScript', 'React', 'Node.js', 'Python', 'Design', 'UI/UX', 
    'Marketing', 'Business', 'Startup', 'Freelance', 'Remote', 'Internship'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-poppins">Shorts</h1>
            <p className="text-gray-600 font-inter mt-1">
              Discover student intro videos and showcase your skills
            </p>
          </div>
          
          {user?.role === 'student' && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-4 lg:mt-0 bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition-colors font-inter flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Upload Video</span>
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Filters */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
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
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Duration Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                  Duration
                </label>
                <select
                  value={filters.duration}
                  onChange={(e) => handleFilterChange('duration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="">Any Duration</option>
                  <option value="short">Under 30 seconds</option>
                  <option value="medium">30-60 seconds</option>
                </select>
              </div>

              {/* Popular Tags */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                  Skill Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors font-inter ${
                        filters.tags.includes(tag)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                  <option value="trending">Trending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Content - Video Grid */}
          <div className="flex-1">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                {error}
              </div>
            )}

            {videos.length === 0 && !loading ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📹</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">
                  No videos found
                </h3>
                <p className="text-gray-600 font-inter mb-4">
                  {searchQuery || filters.category || filters.tags.length > 0
                    ? 'Try adjusting your filters to see more videos.'
                    : 'Be the first to upload a video!'}
                </p>
                {user?.role === 'student' && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition-colors font-inter"
                  >
                    Upload Your First Video
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Active Filters Display */}
                {(searchQuery || filters.category || filters.tags.length > 0) && (
                  <div className="mb-6 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600 font-inter">Active filters:</span>
                    
                    {searchQuery && (
                      <span className="px-3 py-1 bg-primary bg-opacity-10 text-primary text-sm rounded-full font-inter">
                        Search: "{searchQuery}"
                      </span>
                    )}
                    
                    {filters.category && (
                      <span className="px-3 py-1 bg-primary bg-opacity-10 text-primary text-sm rounded-full font-inter">
                        Category: {filters.category}
                      </span>
                    )}
                    
                    {filters.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-primary bg-opacity-10 text-primary text-sm rounded-full font-inter">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Video Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      autoplayOnHover={true}
                      showUser={true}
                    />
                  ))}
                </div>

                {/* Load More Button / Loading */}
                {hasMore && (
                  <div className="text-center mt-8">
                    {loadingMore ? (
                      <div className="inline-flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="text-gray-600 font-inter">Loading more videos...</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleLoadMore}
                        className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-inter"
                      >
                        Load More Videos
                      </button>
                    )}
                  </div>
                )}

                {!hasMore && videos.length > 0 && (
                  <div className="text-center mt-8">
                    <p className="text-gray-500 font-inter">You've reached the end of the feed!</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <VideoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
};

export default ShortsPage;