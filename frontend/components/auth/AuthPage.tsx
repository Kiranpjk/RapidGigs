// ✅ FIXED: googleInitialized singleton replaced with per-render ref approach
//           so LoginForm and SignUpForm each register their own callback correctly
// ✅ FIXED: Removed hardcoded Google client ID fallback — use env var only

import React, { useState, useEffect, useRef } from 'react';
import { Page } from '../../types';
import {
  GoogleIcon,
  EnvelopeIcon,
  LogoIcon,
  LockClosedIcon,
  UserIcon,
  ArrowRightIcon,
  PaperAirplaneIcon,
} from '../icons/Icons';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';
import Confetti from '../common/Confetti';
import useModal from '../../hooks/useModal';

type AuthMode = 'login' | 'signup' | 'forgot_password';

interface AuthPageProps {
  initialPage: Page;
  navigate: (page: Page) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ initialPage, navigate }) => {
  const { modalState, showConfetti, showSuccess, closeModal, closeConfetti } = useModal();
  const [authMode, setAuthMode] = useState<AuthMode>(initialPage as AuthMode);

  const handleNavigate = (mode: AuthMode) => {
    setAuthMode(mode);
    navigate(mode as Page);
  };

  const handleSuccess = () => {
    navigate('dashboard');
  };

  const renderForm = () => {
    switch (authMode) {
      case 'signup':
        return (
          <SignUpForm
            onLoginClick={() => handleNavigate('login')}
            onSignUpSuccess={handleSuccess}
          />
        );
      case 'forgot_password':
        return (
          <ForgotPasswordForm
            onBackToLoginClick={() => handleNavigate('login')}
            showSuccess={showSuccess}
          />
        );
      case 'login':
      default:
        return (
          <LoginForm
            onSignUpClick={() => handleNavigate('signup')}
            onForgotPasswordClick={() => handleNavigate('forgot_password')}
            onLoginSuccess={handleSuccess}
          />
        );
    }
  };

  const Illustration = () => (
    <div className="hidden lg:flex w-1/2 items-center justify-center p-12 relative overflow-hidden bg-gray-100 dark:bg-gray-900 min-h-[500px]">
      <div
        className="absolute top-0 left-0 w-full h-full z-0 opacity-20 dark:opacity-40"
        style={{
          backgroundImage: 'url(https://picsum.photos/seed/rapidgig/1920/1080)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="z-10 text-center">
        <div className="flex items-center justify-center gap-3">
          <LogoIcon className="w-16 h-16 text-indigo-500" />
          <span className="text-6xl font-bold tracking-tighter text-gray-800 dark:text-white">
            RapidGig
          </span>
        </div>
        <p className="text-2xl text-slate-600 dark:text-slate-300 mt-4 max-w-sm mx-auto">
          Your Work, Your Code, Your Gig in 30 Seconds.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white font-sans rounded-2xl overflow-hidden">
        <Illustration />
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">{renderForm()}</div>
        </div>
      </div>
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
      />
      <Confetti show={showConfetti} onComplete={closeConfetti} />
    </>
  );
};

// ─── Shared UI components ─────────────────────────────────────────────────────

const InputField = ({
  id, type, placeholder, icon, value, onChange,
}: {
  id: string;
  type: string;
  placeholder: string;
  icon: React.ReactNode;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      {icon}
    </div>
    <input
      className="w-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg py-3 pl-10 pr-3 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required
    />
  </div>
);

const PrimaryButton: React.FC<{ children: React.ReactNode; type: 'submit' | 'button' }> = ({
  children,
  type,
}) => (
  <button
    className="w-full group bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
    type={type}
  >
    {children}
  </button>
);

const FormContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white/90 dark:bg-gray-800/90 sm:bg-white/50 sm:dark:bg-gray-800/50 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-6 sm:p-8 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30 animate-fade-in w-full transition-all duration-300">
    {children}
  </div>
);

// ✅ FIXED: Google button renderer — each form instance manages its own
// initialization state via a ref, avoiding the shared module-level singleton
// bug that caused the wrong callback to fire when both forms were mounted.
// Track Google initialization state within the current page lifecycle.
// We don't use sessionStorage because window.google is reset on page refresh,
// but sessionStorage persists, which would cause us to skip initialization
// and lead to "Failed to render button before calling initialize()" errors.
let googleInitialized = false;

const currentGoogleCallbackRef = { current: null as ((response: any) => void) | null };

const useGoogleButton = (
  buttonElementId: string,
  callback: (response: any) => void,
  buttonText: 'continue_with' | 'signup_with'
) => {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
    currentGoogleCallbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    const tryInit = () => {
      const g = (window as any).google;
      // Wait until the GSI script is loaded and the accounts.id object is available
      if (!g?.accounts?.id) return;

      const el = document.getElementById(buttonElementId);
      // Wait until the target element is in the DOM
      if (!el) return;

      // Stop checking once we have what we need
      if (checkInterval) clearInterval(checkInterval);

      // ALWAYS call initialize to ensure the callback is correctly registered
      // for this specific form instance (Login or SignUp), or just use the global
      // ref we established. Since initialize is safe to call multiple times,
      // it's better to ensure it's done before renderButton.
      g.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (response: any) => currentGoogleCallbackRef.current?.(response),
      });

      g.accounts.id.renderButton(el, {
        theme: 'outline',
        size: 'large',
        width: Math.min(window.innerWidth - 64, 380),
        text: buttonText,
      });
    };

    checkInterval = setInterval(tryInit, 300);
    tryInit();

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [buttonElementId, buttonText]);
};

// ─── LoginForm ────────────────────────────────────────────────────────────────

const LoginForm = ({
  onSignUpClick,
  onForgotPasswordClick,
  onLoginSuccess,
}: {
  onSignUpClick: () => void;
  onForgotPasswordClick: () => void;
  onLoginSuccess: () => void;
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, googleLogin } = useAuth();

  const handleGoogleResponse = async (response: any) => {
    setError('');
    setIsLoading(true);
    try {
      await googleLogin(response.credential);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Google login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  useGoogleButton('googleLoginBtn', handleGoogleResponse, 'continue_with');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormContainer>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tighter mb-2">Welcome Back!</h1>
        <p className="text-gray-600 dark:text-gray-400">Login to your RapidGig account</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <div>
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <InputField
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            icon={<EnvelopeIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
          />
        </div>
        <div>
          <div className="flex justify-between items-baseline">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <button
              type="button"
              onClick={onForgotPasswordClick}
              className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 cursor-pointer"
            >
              Forgot?
            </button>
          </div>
          <InputField
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            icon={<LockClosedIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
          />
        </div>
        <PrimaryButton type="submit">
          {isLoading ? 'Logging in...' : 'Login'}
          {!isLoading && (
            <ArrowRightIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1" />
          )}
        </PrimaryButton>
        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-300 dark:border-gray-700" />
          <span className="px-4 text-gray-500 text-sm">OR</span>
          <div className="flex-grow border-t border-gray-300 dark:border-gray-700" />
        </div>
        <div id="googleLoginBtn" className="w-full flex justify-center" />
        <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-8">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSignUpClick}
            className="font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 cursor-pointer"
          >
            Sign Up
          </button>
        </p>
      </form>
    </FormContainer>
  );
};

// ─── SignUpForm ───────────────────────────────────────────────────────────────

const SignUpForm = ({
  onLoginClick,
  onSignUpSuccess,
}: {
  onLoginClick: () => void;
  onSignUpSuccess: () => void;
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isStudent, setIsStudent] = useState(false);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, googleLogin } = useAuth();

  const handleGoogleResponse = async (response: any) => {
    setError('');
    if (!isStudent && !isRecruiter) {
      setError('Please select your role (Student or Recruiter) before signing up with Google.');
      return;
    }
    setIsLoading(true);
    try {
      await googleLogin(response.credential, isRecruiter);
      onSignUpSuccess();
    } catch (err: any) {
      setError(err.message || 'Google sign up failed.');
    } finally {
      setIsLoading(false);
    }
  };

  useGoogleButton('googleSignupBtn', handleGoogleResponse, 'signup_with');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isStudent && !isRecruiter) { setError('Please select your role (Student or Recruiter)'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(password)) { setError('Password must contain at least one uppercase letter'); return; }
    if (!/[0-9]/.test(password)) { setError('Password must contain at least one number'); return; }
    setIsLoading(true);
    try {
      await register({ email, password, name, isStudent, isRecruiter });
      onSignUpSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormContainer>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tighter mb-2">Create your Account</h1>
        <p className="text-gray-600 dark:text-gray-400">Join our community of talent.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <InputField id="fullName" type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} icon={<UserIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />} />
        <InputField id="email-signup" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} icon={<EnvelopeIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />} />
        <InputField id="password-signup" type="password" placeholder="Create a secure password" value={password} onChange={e => setPassword(e.target.value)} icon={<LockClosedIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />} />
        <InputField id="confirm-password" type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} icon={<LockClosedIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />} />

        <div className="space-y-3 py-2">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">I am a...</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setIsStudent(true); setIsRecruiter(false); }}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all duration-200 text-sm font-semibold ${isStudent ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => { setIsRecruiter(true); setIsStudent(false); }}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all duration-200 text-sm font-semibold ${isRecruiter ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}
            >
              Recruiter
            </button>
          </div>
        </div>

        <PrimaryButton type="submit">
          {isLoading ? 'Creating Account...' : 'Create Account'}
          {!isLoading && <ArrowRightIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1" />}
        </PrimaryButton>
        <div className="py-2 flex items-center">
          <div className="flex-grow border-t border-gray-300 dark:border-gray-700" />
          <span className="px-4 text-gray-500 text-sm">OR</span>
          <div className="flex-grow border-t border-gray-300 dark:border-gray-700" />
        </div>
        <div id="googleSignupBtn" className="w-full flex justify-center" />
        <p className="text-center text-gray-600 dark:text-gray-400 text-sm pt-4">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onLoginClick}
            className="font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 cursor-pointer"
          >
            Login
          </button>
        </p>
      </form>
    </FormContainer>
  );
};

// ─── ForgotPasswordForm ───────────────────────────────────────────────────────

const ForgotPasswordForm = ({
  onBackToLoginClick,
  showSuccess,
}: {
  onBackToLoginClick: () => void;
  showSuccess: (title: string, message: string, onConfirm?: () => void) => void;
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <FormContainer>
      <div className="text-center mb-8">
        <LogoIcon className="w-12 h-12 text-indigo-500 mx-auto" />
        <h1 className="text-4xl font-bold tracking-tighter mt-4">Forgot Password?</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">
          No worries, we&apos;ll send you reset instructions.
        </p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          setIsLoading(true);
          try {
            const { authAPI } = await import('../../services/api');
            await authAPI.forgotPassword(email);
            showSuccess('Reset Link Sent!', 'Check your email for password reset instructions.');
            setTimeout(() => onBackToLoginClick(), 2000);
          } catch (err: any) {
            setError(err.message || 'Failed to send reset link.');
          } finally {
            setIsLoading(false);
          }
        }}
        className="space-y-6"
      >
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <InputField
          id="email-forgot"
          type="email"
          placeholder="your.email@example.com"
          icon={<EnvelopeIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <PrimaryButton type="submit">
          {isLoading ? 'Sending...' : 'Send Reset Link'}{' '}
          {!isLoading && <PaperAirplaneIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:rotate-45" />}
        </PrimaryButton>
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={onBackToLoginClick}
            className="font-bold text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 cursor-pointer"
          >
            &larr; Back to Login
          </button>
        </div>
      </form>
    </FormContainer>
  );
};

export default AuthPage;
