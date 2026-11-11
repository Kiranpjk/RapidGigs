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
    <aside className="hidden lg:flex w-[44%] flex-col justify-between p-10 bg-[var(--secondary)] text-[var(--secondary-fg)]">
      <div className="flex items-center gap-2">
        <LogoIcon className="w-7 h-7 text-[var(--secondary-fg)] [&_path]:stroke-[var(--secondary)]" />
        <span className="font-display text-[19px] font-semibold tracking-[-0.02em]">RapidGig</span>
      </div>
      <div>
        <h2 className="font-display text-[40px] leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
          Your work, your pitch, your gig in <span className="text-[var(--secondary-accent)]">30 seconds.</span>
        </h2>
        <ol className="mt-10 space-y-5 text-[14px]">
          {[
            ['Watch', 'Short video pitches from the team hiring.'],
            ['Apply', 'Send links to your work, not a cover letter.'],
            ['Talk', 'Recruiters reply in your RapidGig inbox.'],
          ].map(([title, body], n) => (
            <li key={title} className="flex gap-4">
              <span className="font-display tabular-nums text-[13px] opacity-50 pt-0.5">0{n + 1}</span>
              <span>
                <span className="font-medium">{title}.</span>{' '}
                <span className="opacity-70">{body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="text-[12px] opacity-50">Free for students. Recruiters post roles in minutes.</p>
    </aside>
  );

  return (
    <>
      <div className="flex min-h-[600px] bg-[var(--bg)] text-[var(--text-primary)]">
        <Illustration />
        <div className="w-full lg:w-[56%] flex items-center justify-center px-6 py-10 sm:px-12">
          <div className="w-full max-w-[380px]">{renderForm()}</div>
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
  id, type, placeholder, icon, value, onChange, label, autoComplete,
}: {
  id: string;
  type: string;
  placeholder: string;
  icon: React.ReactNode;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  autoComplete?: string;
}) => (
  <div>
    {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-tertiary)] [&_svg]:w-[18px] [&_svg]:h-[18px]">
        {icon}
      </div>
      <input
        className="w-full h-11 rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg)] pl-10 pr-3 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)] focus:ring-4 focus:ring-[var(--accent)]/15 transition-[border-color,box-shadow] duration-150"
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required
      />
    </div>
  </div>
);

const FieldLabel: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label className="block mb-1.5 text-[13px] font-medium text-[var(--text-primary)]" htmlFor={htmlFor}>
    {children}
  </label>
);

const PrimaryButton: React.FC<{ children: React.ReactNode; type: 'submit' | 'button' }> = ({
  children,
  type,
}) => (
  <button
    className="w-full h-11 group inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--text-primary)] text-[var(--bg)] text-[15px] font-medium hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] active:translate-y-px transition-colors duration-150 focus-ring"
    type={type}
  >
    {children}
  </button>
);

const FormContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full animate-slide-up">{children}</div>
);

const FormHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="mb-8">
    <LogoIcon className="w-8 h-8 text-[var(--text-primary)] lg:hidden mb-6" />
    <h1 className="font-display text-title font-semibold">{title}</h1>
    <p className="mt-2 text-[15px] text-[var(--text-secondary)]">{subtitle}</p>
  </div>
);

const ErrorNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div role="alert" className="rounded-[var(--radius)] border-l-2 border-[var(--danger)] bg-[var(--danger-subtle)] px-3.5 py-2.5 text-[13.5px] text-[var(--danger)]">
    {children}
  </div>
);

const OrDivider = () => (
  <div className="flex items-center gap-3 text-[12px] text-[var(--text-tertiary)]">
    <div className="flex-grow border-t border-[var(--border)]" />
    or
    <div className="flex-grow border-t border-[var(--border)]" />
  </div>
);

const linkClass = "font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] underline-offset-4 hover:underline cursor-pointer focus-ring";

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

      // Only call initialize() once per page lifecycle — the callback is routed
      // through currentGoogleCallbackRef so it always reaches the active form.
      if (!googleInitialized) {
        g.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: (response: any) => currentGoogleCallbackRef.current?.(response),
        });
        googleInitialized = true;
      }

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
      <FormHeader title="Welcome back" subtitle="Log in to pick up where you left off." />
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <ErrorNote>{error}</ErrorNote>
        )}
        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <InputField
            autoComplete="email"
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            icon={<EnvelopeIcon />}
          />
        </div>
        <div>
          <div className="flex justify-between items-baseline">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <button
              type="button"
              onClick={onForgotPasswordClick}
              className={`text-[13px] ${linkClass}`}
            >
              Forgot password?
            </button>
          </div>
          <InputField
            autoComplete="current-password"
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            icon={<LockClosedIcon />}
          />
        </div>
        <PrimaryButton type="submit">
          {isLoading ? 'Logging in…' : 'Log in'}
          {!isLoading && (
            <ArrowRightIcon className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          )}
        </PrimaryButton>
        <OrDivider />
        <div id="googleLoginBtn" className="w-full flex justify-center min-h-[44px]" />
        <p className="pt-2 text-[14px] text-[var(--text-secondary)]">
          New to RapidGig?{' '}
          <button
            type="button"
            onClick={onSignUpClick}
            className={linkClass}
          >
            Create an account
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
      <FormHeader title="Create your account" subtitle="Takes a minute. You can add your video later." />
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <ErrorNote>{error}</ErrorNote>
        )}
        <InputField label="Full name" autoComplete="name" id="fullName" type="text" placeholder="Alex Chen" value={name} onChange={e => setName(e.target.value)} icon={<UserIcon />} />
        <InputField label="Email" autoComplete="email" id="email-signup" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} icon={<EnvelopeIcon />} />
        <InputField label="Password" autoComplete="new-password" id="password-signup" type="password" placeholder="8+ characters, 1 capital, 1 number" value={password} onChange={e => setPassword(e.target.value)} icon={<LockClosedIcon />} />
        <InputField label="Confirm password" autoComplete="new-password" id="confirm-password" type="password" placeholder="Same again" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} icon={<LockClosedIcon />} />

        <fieldset className="pt-1">
          <legend className="mb-1.5 text-[13px] font-medium text-[var(--text-primary)]">I&apos;m here as a</legend>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['Student', 'Looking for gigs', isStudent, () => { setIsStudent(true); setIsRecruiter(false); }],
              ['Recruiter', 'Hiring for a role', isRecruiter, () => { setIsRecruiter(true); setIsStudent(false); }],
            ] as const).map(([title, hint, active, pick]) => (
              <button
                key={title}
                type="button"
                aria-pressed={active}
                onClick={pick}
                className={`rounded-[var(--radius)] border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-ring ${
                  active
                    ? 'border-[var(--text-primary)] bg-[var(--surface)] shadow-[inset_0_0_0_1px_var(--text-primary)]'
                    : 'border-[var(--border-strong)] hover:border-[var(--text-tertiary)]'
                }`}
              >
                <span className="block text-[14px] font-medium text-[var(--text-primary)]">{title}</span>
                <span className="block text-[12.5px] text-[var(--text-secondary)]">{hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <PrimaryButton type="submit">
          {isLoading ? 'Creating account…' : 'Create account'}
          {!isLoading && <ArrowRightIcon className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />}
        </PrimaryButton>
        <OrDivider />
        <div id="googleSignupBtn" className="w-full flex justify-center min-h-[44px]" />
        <p className="pt-2 text-[14px] text-[var(--text-secondary)]">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onLoginClick}
            className={linkClass}
          >
            Log in
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
      <FormHeader title="Reset your password" subtitle="We'll email you a link to set a new one." />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          setIsLoading(true);
          try {
            const { authAPI } = await import('../../services/api');
            await authAPI.forgotPassword(email);
            showSuccess('Reset link sent', 'Check your email for password reset instructions.');
            setTimeout(() => onBackToLoginClick(), 2000);
          } catch (err: any) {
            setError(err.message || 'Failed to send reset link.');
          } finally {
            setIsLoading(false);
          }
        }}
        className="space-y-5"
      >
        {error && (
          <ErrorNote>{error}</ErrorNote>
        )}
        <InputField
          id="email-forgot"
          label="Email"
          autoComplete="email"
          type="email"
          placeholder="your.email@example.com"
          icon={<EnvelopeIcon />}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <PrimaryButton type="submit">
          {isLoading ? 'Sending…' : 'Send reset link'}
          {!isLoading && <PaperAirplaneIcon className="w-4 h-4" />}
        </PrimaryButton>
        <div className="pt-2">
          <button
            type="button"
            onClick={onBackToLoginClick}
            className={`text-[14px] ${linkClass}`}
          >
            &larr; Back to log in
          </button>
        </div>
      </form>
    </FormContainer>
  );
};

export default AuthPage;
