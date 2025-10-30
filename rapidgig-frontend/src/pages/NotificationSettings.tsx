import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/notificationService';

// Temporary interface to fix import issue
interface NotificationPreferences {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  job_applications: boolean;
  application_updates: boolean;
  new_messages: boolean;
  job_matches: boolean;
  profile_activity: boolean;
  marketing_emails: boolean;
  created_at: string;
  updated_at: string;
}

const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await NotificationService.getPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load notification preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    
    setPreferences(prev => ({
      ...prev!,
      [key]: !prev![key]
    }));
  };

  const handleSave = async () => {
    if (!preferences) return;
    
    try {
      setSaving(true);
      await NotificationService.updatePreferences(preferences);
      setMessage({ type: 'success', text: 'Notification preferences updated successfully' });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      setMessage({ type: 'error', text: 'Failed to update notification preferences' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to access notification settings.</p>
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

  if (!preferences) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">Failed to load notification preferences.</p>
        </div>
      </div>
    );
  }

  const settingsGroups = [
    {
      title: 'General Notifications',
      description: 'Control how you receive notifications',
      settings: [
        {
          key: 'email_notifications' as keyof NotificationPreferences,
          label: 'Email Notifications',
          description: 'Receive notifications via email'
        },
        {
          key: 'push_notifications' as keyof NotificationPreferences,
          label: 'Push Notifications',
          description: 'Receive browser push notifications'
        }
      ]
    },
    {
      title: 'Job & Application Notifications',
      description: 'Stay updated on job opportunities and applications',
      settings: [
        {
          key: 'job_applications' as keyof NotificationPreferences,
          label: 'Job Applications',
          description: 'Get notified when someone applies to your jobs (recruiters only)'
        },
        {
          key: 'application_updates' as keyof NotificationPreferences,
          label: 'Application Updates',
          description: 'Get notified about status changes on your applications'
        },
        {
          key: 'job_matches' as keyof NotificationPreferences,
          label: 'Job Matches',
          description: 'Get notified when new jobs match your skills'
        }
      ]
    },
    {
      title: 'Social Notifications',
      description: 'Stay connected with the community',
      settings: [
        {
          key: 'new_messages' as keyof NotificationPreferences,
          label: 'New Messages',
          description: 'Get notified when you receive new messages'
        },
        {
          key: 'profile_activity' as keyof NotificationPreferences,
          label: 'Profile Activity',
          description: 'Get notified about profile views and video likes'
        }
      ]
    },
    {
      title: 'Marketing',
      description: 'Optional promotional content',
      settings: [
        {
          key: 'marketing_emails' as keyof NotificationPreferences,
          label: 'Marketing Emails',
          description: 'Receive promotional emails and platform updates'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">Notification Settings</h1>
          <p className="text-gray-600 font-inter mt-2">
            Manage how and when you receive notifications from RapidGig
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {message.type === 'success' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <span className="font-inter">{message.text}</span>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {settingsGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 font-poppins">{group.title}</h2>
                <p className="text-gray-600 font-inter mt-1">{group.description}</p>
              </div>
              
              <div className="p-6 space-y-6">
                {group.settings.map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 font-inter">{setting.label}</h3>
                      <p className="text-sm text-gray-500 font-inter mt-1">{setting.description}</p>
                    </div>
                    
                    <button
                      onClick={() => handleToggle(setting.key)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        preferences[setting.key] ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          preferences[setting.key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 font-inter"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;