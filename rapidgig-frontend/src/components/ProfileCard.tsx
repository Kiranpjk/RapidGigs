import type { User } from '../types/auth';
import type { UserStats } from '../types/profile';

// DEBUG: ProfileCard loaded
console.log('DEBUG: ProfileCard - imports loaded');

interface ProfileCardProps {
  user: User;
  stats?: UserStats;
  isOwnProfile?: boolean;
  onEditClick?: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ user, stats, isOwnProfile, onEditClick }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Cover Image */}
      <div className="h-32 bg-gradient-to-r from-primary to-secondary relative">
        {isOwnProfile && (
          <button
            onClick={onEditClick}
            className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>

      <div className="px-6 pb-6">
        {/* Profile Picture */}
        <div className="flex justify-center -mt-16 mb-4">
          <div className="relative">
            {user.profile_picture ? (
              <img
                src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${user.profile_picture}`}
                alt={user.full_name}
                className="w-24 h-24 rounded-full border-4 border-white object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white bg-accent flex items-center justify-center">
                <span className="text-primary text-xl font-bold font-poppins">
                  {getInitials(user.full_name)}
                </span>
              </div>
            )}
            {user.role === 'recruiter' && user.company_logo && (
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-white bg-white overflow-hidden">
                <img
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${user.company_logo}`}
                  alt="Company logo"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 font-poppins">{user.full_name}</h2>
          <p className="text-gray-600 font-inter capitalize">{user.role}</p>
          
          {user.role === 'student' && user.university && (
            <p className="text-sm text-gray-500 font-inter">{user.university}</p>
          )}
          
          {user.role === 'recruiter' && user.company_name && (
            <p className="text-sm text-gray-500 font-inter">{user.company_name}</p>
          )}
        </div>

        {/* Skills for Students */}
        {user.role === 'student' && user.skills && user.skills.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 font-inter">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {user.skills.slice(0, 4).map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-primary bg-opacity-10 text-primary text-xs rounded-full font-inter"
                >
                  {skill}
                </span>
              ))}
              {user.skills.length > 4 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-inter">
                  +{user.skills.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Company Description for Recruiters */}
        {user.role === 'recruiter' && user.company_description && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 font-inter line-clamp-3">
              {user.company_description}
            </p>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 font-poppins">
                {formatNumber(stats.profile_views)}
              </div>
              <div className="text-xs text-gray-500 font-inter">Views</div>
            </div>
            
            {user.role === 'student' && (
              <>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 font-poppins">
                    {formatNumber(stats.jobs_applied)}
                  </div>
                  <div className="text-xs text-gray-500 font-inter">Applied</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 font-poppins">
                    {stats.average_rating > 0 ? stats.average_rating.toFixed(1) : '—'}
                  </div>
                  <div className="text-xs text-gray-500 font-inter">Rating</div>
                </div>
              </>
            )}
            
            {user.role === 'recruiter' && (
              <>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 font-poppins">
                    {formatNumber(stats.connections_count)}
                  </div>
                  <div className="text-xs text-gray-500 font-inter">Connections</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 font-poppins">
                    {stats.total_reviews}
                  </div>
                  <div className="text-xs text-gray-500 font-inter">Reviews</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;