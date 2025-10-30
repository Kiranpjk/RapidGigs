import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

// DEBUG: SignUpForm loaded
console.log('DEBUG: SignUpForm - imports loaded');

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['student', 'recruiter']),
  // Student fields
  university: z.string().optional(),
  graduationYear: z.number().optional(),
  skills: z.string().optional(),
  // Recruiter fields
  companyName: z.string().optional(),
  companyDescription: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.role, {
  message: "Please select a role",
  path: ["role"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

const SignUpForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const registerData = {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        role: data.role,
        ...(data.role === 'student' && {
          university: data.university,
          graduationYear: data.graduationYear,
          skills: data.skills ? data.skills.split(',').map(s => s.trim()) : undefined,
        }),
        ...(data.role === 'recruiter' && {
          companyName: data.companyName,
          companyDescription: data.companyDescription,
        }),
      };

      const response = await AuthService.register(registerData);
      login(response.data.user, response.data.token, response.data.refreshToken);
      navigate('/');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image and branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-secondary relative">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-center p-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-text mb-4 font-poppins">Join RapidGig</h1>
            <p className="text-xl text-gray-200 font-inter">Connect, Collaborate, Create</p>
          </div>
          <div className="w-64 h-64 bg-accent bg-opacity-20 rounded-full flex items-center justify-center">
            <div className="text-6xl">🤝</div>
          </div>
        </div>
      </div>

      {/* Right side - Sign up form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 font-poppins">Create your account</h2>
            <p className="mt-2 text-gray-600 font-inter">Start your journey with RapidGig</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 font-inter">
                Full Name
              </label>
              <input
                {...register('fullName')}
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 font-inter">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 font-inter">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Create a password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 font-inter">
                Confirm Password
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-inter mb-3">
                I am a:
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    {...register('role')}
                    type="radio"
                    value="student"
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700 font-inter">Student</span>
                </label>
                <label className="flex items-center">
                  <input
                    {...register('role')}
                    type="radio"
                    value="recruiter"
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700 font-inter">Recruiter</span>
                </label>
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* Student-specific fields */}
            {selectedRole === 'student' && (
              <>
                <div>
                  <label htmlFor="university" className="block text-sm font-medium text-gray-700 font-inter">
                    University (Optional)
                  </label>
                  <input
                    {...register('university')}
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="Your university"
                  />
                </div>

                <div>
                  <label htmlFor="graduationYear" className="block text-sm font-medium text-gray-700 font-inter">
                    Graduation Year (Optional)
                  </label>
                  <input
                    {...register('graduationYear', { valueAsNumber: true })}
                    type="number"
                    min="2020"
                    max="2030"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="2024"
                  />
                </div>

                <div>
                  <label htmlFor="skills" className="block text-sm font-medium text-gray-700 font-inter">
                    Skills (Optional)
                  </label>
                  <input
                    {...register('skills')}
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="JavaScript, React, Node.js (comma separated)"
                  />
                </div>
              </>
            )}

            {/* Recruiter-specific fields */}
            {selectedRole === 'recruiter' && (
              <>
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 font-inter">
                    Company Name (Optional)
                  </label>
                  <input
                    {...register('companyName')}
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="Your company name"
                  />
                </div>

                <div>
                  <label htmlFor="companyDescription" className="block text-sm font-medium text-gray-700 font-inter">
                    Company Description (Optional)
                  </label>
                  <textarea
                    {...register('companyDescription')}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="Brief description of your company"
                  />
                </div>
              </>
            )}

            <div className="space-y-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed font-inter"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>

              <button
                type="button"
                onClick={() => window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`}
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-inter"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>
            </div>

            <div className="text-center">
              <span className="text-gray-600 font-inter">Already have an account? </span>
              <Link
                to="/login"
                className="text-primary hover:text-secondary font-medium font-inter"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUpForm;