import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { User, UserPreferences, UpdateProfileData } from '../types/index';
import { ProfileService } from '../services/profileService';

// DEBUG: ProfileEditModal loaded
console.log('DEBUG: ProfileEditModal - imports loaded');

const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  skills: z.string().optional(),
  university: z.string().optional(),
  graduationYear: z.number().optional(),
  companyName: z.string().optional(),
  companyDescription: z.string().optional(),
  // Preferences
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  jobAlerts: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  availabilityStatus: z.enum(['available', 'busy', 'not_looking']).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileEditModalProps {
  user: User;
  preferences?: UserPreferences;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedData: any) => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  user,
  preferences,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const profilePictureRef = useRef<HTMLInputElement>(null);
  const companyLogoRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.full_name,
      skills: user.skills?.join(', ') || '',
      university: user.university || '',
      graduationYear: user.graduation_year || undefined,
      companyName: user.company_name || '',
      companyDescription: user.company_description || '',
      emailNotifications: preferences?.email_notifications ?? true,
      pushNotifications: preferences?.push_notifications ?? true,
      jobAlerts: preferences?.job_alerts ?? true,
      marketingEmails: preferences?.marketing_emails ?? false,
      availabilityStatus: preferences?.availability_status || 'available',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Prepare update data
      const updateData: UpdateProfileData = {
        fullName: data.fullName,
        skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(s => s) : undefined,
        university: data.university || undefined,
        graduationYear: data.graduationYear || undefined,
        companyName: data.companyName || undefined,
        companyDescription: data.companyDescription || undefined,
        preferences: {
          email_notifications: data.emailNotifications,
          push_notifications: data.pushNotifications,
          job_alerts: data.jobAlerts,
          marketing_emails: data.marketingEmails,
          availability_status: data.availabilityStatus,
        },
      };

      // Update profile
      const updatedProfile = await ProfileService.updateProfile(updateData);

      // Upload profile picture if selected
      if (profilePictureFile) {
        await ProfileService.uploadProfilePicture(profilePictureFile);
      }

      // Upload company logo if selected
      if (companyLogoFile && user.role === 'recruiter') {
        await ProfileService.uploadCompanyLogo(companyLogoFile);
      }

      onUpdate(updatedProfile);
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePictureFile(file);
    }
  };

  const handleCompanyLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompanyLogoFile(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 font-poppins">Edit Profile</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Picture Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-inter mb-2">
                Profile Picture
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {user.profile_picture ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${user.profile_picture}`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 text-lg font-bold">
                      {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => profilePictureRef.current?.click()}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 font-inter"
                >
                  Change Picture
                </button>
                <input
                  ref={profilePictureRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </div>
              {profilePictureFile && (
                <p className="text-sm text-green-600 mt-2">Selected: {profilePictureFile.name}</p>
              )}
            </div>

            {/* Company Logo Upload (Recruiters only) */}
            {user.role === 'recruiter' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 font-inter mb-2">
                  Company Logo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded bg-gray-200 flex items-center justify-center overflow-hidden">
                    {user.company_logo ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${user.company_logo}`}
                        alt="Company logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-500 text-xs">Logo</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => companyLogoRef.current?.click()}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 font-inter"
                  >
                    Change Logo
                  </button>
                  <input
                    ref={companyLogoRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCompanyLogoChange}
                    className="hidden"
                  />
                </div>
                {companyLogoFile && (
                  <p className="text-sm text-green-600 mt-2">Selected: {companyLogoFile.name}</p>
                )}
              </div>
            )}

            {/* Basic Information */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 font-inter">
                Full Name
              </label>
              <input
                {...register('fullName')}
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            {/* Student-specific fields */}
            {user.role === 'student' && (
              <>
                <div>
                  <label htmlFor="skills" className="block text-sm font-medium text-gray-700 font-inter">
                    Skills (comma separated)
                  </label>
                  <input
                    {...register('skills')}
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="JavaScript, React, Node.js"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="university" className="block text-sm font-medium text-gray-700 font-inter">
                      University
                    </label>
                    <input
                      {...register('university')}
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="graduationYear" className="block text-sm font-medium text-gray-700 font-inter">
                      Graduation Year
                    </label>
                    <input
                      {...register('graduationYear', { valueAsNumber: true })}
                      type="number"
                      min="2020"
                      max="2030"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Recruiter-specific fields */}
            {user.role === 'recruiter' && (
              <>
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 font-inter">
                    Company Name
                  </label>
                  <input
                    {...register('companyName')}
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label htmlFor="companyDescription" className="block text-sm font-medium text-gray-700 font-inter">
                    Company Description
                  </label>
                  <textarea
                    {...register('companyDescription')}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </>
            )}

            {/* Preferences */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 font-poppins mb-4">Preferences</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="availabilityStatus" className="block text-sm font-medium text-gray-700 font-inter">
                    Availability Status
                  </label>
                  <select
                    {...register('availabilityStatus')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="not_looking">Not Looking</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      {...register('emailNotifications')}
                      type="checkbox"
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700 font-inter">
                      Email notifications
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      {...register('pushNotifications')}
                      type="checkbox"
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700 font-inter">
                      Push notifications
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      {...register('jobAlerts')}
                      type="checkbox"
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700 font-inter">
                      Job alerts
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      {...register('marketingEmails')}
                      type="checkbox"
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700 font-inter">
                      Marketing emails
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 font-inter"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed font-inter"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;