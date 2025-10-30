import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/shorts', label: 'Shorts', icon: '📹' },
    { path: '/jobs', label: 'Jobs', icon: '💼' },
    { path: '/messages', label: 'Messages', icon: '💬' },
  ];

  const userSpecificItems = user?.role === 'recruiter' 
    ? [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/applications', label: 'Applications', icon: '📝' },
      ]
    : [
        { path: '/applications', label: 'My Applications', icon: '📝' },
        { path: '/profile', label: 'Profile', icon: '👤' },
      ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 md:hidden transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <Link to="/" className="flex items-center space-x-2" onClick={onClose}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <span className="text-xl font-bold text-primary font-poppins">RapidGig</span>
            </Link>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {user.profile_picture ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${user.profile_picture}`}
                    alt={user.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                    <span className="text-primary text-lg font-bold font-poppins">
                      {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 font-inter">{user.full_name}</p>
                  <p className="text-xs text-gray-500 font-inter capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <div className="flex-1 py-4">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors font-inter ${
                    isActive(item.path)
                      ? 'bg-primary bg-opacity-10 text-primary border-r-2 border-primary'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              
              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>
              
              {/* User-specific items */}
              {userSpecificItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors font-inter ${
                    isActive(item.path)
                      ? 'bg-primary bg-opacity-10 text-primary border-r-2 border-primary'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              
              {/* Settings */}
              <Link
                to="/settings/notifications"
                onClick={onClose}
                className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors font-inter ${
                  isActive('/settings/notifications')
                    ? 'bg-primary bg-opacity-10 text-primary border-r-2 border-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-lg">⚙️</span>
                <span>Settings</span>
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors font-inter rounded-lg"
            >
              <span className="text-lg">🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNavDrawer;