import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const userParam = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      navigate('/login?error=oauth_failed');
      return;
    }

    if (token && refreshToken && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        login(user, token, refreshToken);
        navigate('/');
      } catch (err) {
        console.error('Failed to parse user data:', err);
        navigate('/login?error=oauth_failed');
      }
    } else {
      navigate('/login?error=oauth_failed');
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-text font-poppins">Completing sign in...</h2>
        <p className="text-gray-300 font-inter">Please wait while we set up your account.</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;