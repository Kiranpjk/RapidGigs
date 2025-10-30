import React, { useState } from 'react';
import type { Notification } from '../types/index';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  icon: string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  icon,
}) => {
  const [showActions, setShowActions] = useState(false);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    
    // Handle navigation based on notification type and data
    if (notification.data) {
      const { url, job_id, conversation_id, user_id } = notification.data;
      
      if (url) {
        window.location.href = url;
      } else if (job_id) {
        window.location.href = `/jobs/${job_id}`;
      } else if (conversation_id) {
        window.location.href = `/messages?conversation=${conversation_id}`;
      } else if (user_id) {
        window.location.href = `/profile/${user_id}`;
      }
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${
        !notification.is_read ? 'bg-blue-50' : ''
      }`}
      onClick={handleClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
          !notification.is_read ? 'bg-primary bg-opacity-20' : 'bg-gray-100'
        }`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`text-sm font-medium font-inter ${
                !notification.is_read ? 'text-gray-900' : 'text-gray-700'
              }`}>
                {notification.title}
              </h4>
              <p className={`text-sm mt-1 font-inter ${
                !notification.is_read ? 'text-gray-700' : 'text-gray-500'
              }`}>
                {notification.message}
              </p>
              <p className="text-xs text-gray-400 mt-2 font-inter">
                {formatTime(notification.created_at)}
              </p>
            </div>

            {/* Unread Indicator */}
            {!notification.is_read && (
              <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full ml-2 mt-1"></div>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="absolute top-2 right-2 flex space-x-1">
            {!notification.is_read && (
              <button
                onClick={handleMarkAsRead}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Mark as read"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}
            
            <button
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationItem;