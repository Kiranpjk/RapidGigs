import React from 'react';
import type { Message } from '../types/index';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, showAvatar }) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="space-y-2">
            {message.file_url && (
              <img
                src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${message.file_url}`}
                alt={message.file_name || 'Image'}
                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(`${import.meta.env.VITE_API_URL?.replace('/api', '')}${message.file_url}`, '_blank')}
              />
            )}
            {message.content !== 'File attachment' && (
              <p className="text-sm font-inter">{message.content}</p>
            )}
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-2">
            {message.file_url && (
              <div className="flex items-center space-x-3 p-3 bg-white bg-opacity-20 rounded-lg">
                <div className="w-10 h-10 bg-white bg-opacity-30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate font-inter">{message.file_name}</p>
                  {message.file_size && (
                    <p className="text-xs opacity-75 font-inter">{formatFileSize(message.file_size)}</p>
                  )}
                </div>
                <a
                  href={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${message.file_url}`}
                  download={message.file_name}
                  className="p-2 bg-white bg-opacity-30 rounded-lg hover:bg-opacity-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </a>
              </div>
            )}
            {message.content !== 'File attachment' && (
              <p className="text-sm font-inter">{message.content}</p>
            )}
          </div>
        );
      
      default:
        return (
          <p className="text-sm font-inter whitespace-pre-wrap">{message.content}</p>
        );
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-1'}`}>
      <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        {showAvatar && !isOwn && (
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            {message.sender_avatar ? (
              <img
                src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${message.sender_avatar}`}
                alt={message.sender_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary bg-opacity-20 flex items-center justify-center">
                <span className="text-primary text-xs font-semibold">
                  {message.sender_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-primary text-white rounded-br-md'
              : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
          }`}
        >
          {/* Sender Name (for group chats or when needed) */}
          {showAvatar && !isOwn && (
            <p className="text-xs font-medium text-gray-600 mb-1 font-inter">{message.sender_name}</p>
          )}

          {/* Message Content */}
          {renderMessageContent()}

          {/* Message Time and Status */}
          <div className={`flex items-center justify-end space-x-1 mt-1 ${isOwn ? 'text-white text-opacity-75' : 'text-gray-500'}`}>
            <span className="text-xs font-inter">{formatTime(message.created_at)}</span>
            
            {/* Read Status (only for own messages) */}
            {isOwn && (
              <div className="flex">
                {message.is_read ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Spacer for own messages to maintain alignment */}
        {showAvatar && isOwn && <div className="w-8" />}
      </div>
    </div>
  );
};

export default MessageBubble;