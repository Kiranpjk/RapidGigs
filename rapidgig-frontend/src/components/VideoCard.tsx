import React, { useState } from 'react';
import type { Video } from '../types/index';
import VideoPlayer from './VideoPlayer';

interface VideoCardProps {
  video: Video;
  showUser?: boolean;
  autoplayOnHover?: boolean;
  className?: string;
  onClick?: (video: Video) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({
  video,
  showUser = true,
  autoplayOnHover = false,
  className = '',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  const thumbnailUrl = video.thumbnail_url 
    ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}${video.thumbnail_url}`
    : undefined;

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(video);
    } else {
      setShowPlayer(true);
    }
  };

  return (
    <>
      <div 
        className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
        {/* Video Thumbnail/Player */}
        <div className="relative aspect-video bg-gray-900">
          {autoplayOnHover && isHovered ? (
            <VideoPlayer
              video={video}
              autoplay={true}
              muted={true}
              controls={false}
              className="w-full h-full"
            />
          ) : (
            <>
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}
              
              {/* Duration Badge */}
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded font-inter">
                {formatDuration(video.duration)}
              </div>
              
              {/* Play Button Overlay */}
              {isHovered && (
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Video Info */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2 font-poppins">
            {video.title}
          </h3>
          
          {showUser && video.user_name && (
            <div className="flex items-center mb-2">
              {video.user_avatar ? (
                <img
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${video.user_avatar}`}
                  alt={video.user_name}
                  className="w-6 h-6 rounded-full mr-2"
                />
              ) : (
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-2">
                  <span className="text-white text-xs font-bold">
                    {video.user_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-gray-600 text-sm font-inter">{video.user_name}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-gray-500 font-inter">
            <span>{formatViews(video.views)} views</span>
            <span>{new Date(video.created_at).toLocaleDateString()}</span>
          </div>
          
          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {video.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-inter"
                >
                  {tag}
                </span>
              ))}
              {video.tags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-inter">
                  +{video.tags.length - 3}
                </span>
              )}
            </div>
          )}
          
          {/* Engagement Stats */}
          {(video.likes !== undefined || video.comments_count !== undefined) && (
            <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-100">
              {video.likes !== undefined && (
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                  </svg>
                  <span className="text-sm text-gray-600">{video.likes}</span>
                </div>
              )}
              
              {video.comments_count !== undefined && (
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                  </svg>
                  <span className="text-sm text-gray-600">{video.comments_count}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full Video Player Modal */}
      {showPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => setShowPlayer(false)}
              className="absolute -top-12 right-0 text-white hover:text-accent transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <VideoPlayer
              video={video}
              autoplay={true}
              muted={false}
              controls={true}
              className="w-full aspect-video"
              onEnded={() => setShowPlayer(false)}
            />
            
            {/* Video Details */}
            <div className="mt-4 text-white">
              <h2 className="text-xl font-bold mb-2 font-poppins">{video.title}</h2>
              {video.description && (
                <p className="text-gray-300 font-inter">{video.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VideoCard;