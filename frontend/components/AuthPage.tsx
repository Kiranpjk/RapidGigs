import React, { useState } from 'react';
import { Page } from '../types';
import { GoogleIcon, EnvelopeIcon, LogoIcon, LockClosedIcon, UserIcon, ArrowRightIcon, PaperAirplaneIcon } from '../constants';

type AuthMode = 'login' | 'signup' | 'forgot_password';

interface AuthPageProps {
    initialPage: Page;
    navigate: (page: Page) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ initialPage, navigate }) => {
    const [authMode, setAuthMode] = useState<AuthMode>(initialPage as AuthMode);

    const handleNavigate = (mode: AuthMode) => {
        setAuthMode(mode);
        navigate(mode as Page);
    }
    
    const handleSuccess = () => {
        navigate('dashboard');
    }

    const renderForm = () => {
        switch (authMode) {
            case 'signup':
                return <SignUpForm onLoginClick={() => handleNavigate('login')} onSignUpSuccess={handleSuccess} />;
            case 'forgot_password':
                return <ForgotPasswordForm onBackToLoginClick={() => handleNavigate('login')} />;
            case 'login':
            default:
                return <LoginForm onSignUpClick={() => handleNavigate('signup')} onForgotPasswordClick={() => handleNavigate('forgot_password')} onLoginSuccess={handleSuccess}/>;
        }
    };

    const Illustration = () => {
      return (
        <div className="hidden lg:flex w-1/2 items-center justify-center p-12 relative overflow-hidden bg-gray-100 dark:bg-gray-900">
          {/* Video Background */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-20 dark:opacity-40"
            src=""
          >
            Your browser does not support the video tag.
          </video>
          
          {/* Content on top */}
          <div className="z-10 text-center">
            <div className="flex items-center justify-center gap-3">
              <LogoIcon className="w-16 h-16 text-indigo-500" />
              <span className="text-6xl font-bold tracking-tighter text-gray-800 dark:text-white">RapidGig</span>
            </div>
            <p className="text-2xl text-slate-600 dark:text-slate-300 mt-4 max-w-sm mx-auto">
              Your Work, Your Code, Your Gig in 30 Seconds.
            </p>
          </div>
        </div>
      );
    }

    return (
        <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white font-sans">
            <Illustration />
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {renderForm()}
                </div>
            </div>
        </div>
    );
};


// Form components
const InputField = ({ id, type, placeholder, icon, defaultValue }: { id: string, type: string, placeholder: string, icon: React.ReactNode, defaultValue?: string }) => (
  <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
      </div>
      <input 
          className="w-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg py-3 pl-10 pr-3 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300" 
          id={id} 
          type={type} 
          placeholder={placeholder} 
          defaultValue={defaultValue} 
          required
      />
  </div>
);

// FIX: Corrected component props to explicitly include `children` as it's no longer implicit in `React.FC` with modern React types.
const PrimaryButton: React.FC<{ children: React.ReactNode; type: 'submit' | 'button' }> = ({ children, type }) => (
   <button 
      className="w-full group bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2" 
      type={type}
    >
      {children}
    </button>
);

// FIX: Corrected component props to explicitly include `children` as it's no longer implicit in `React.FC` with modern React types.
const SocialButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
   <button 
      className="w-full bg-white dark:bg-gray-100 hover:bg-gray-200 dark:hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-all duration-300 transform hover:scale-105" 
      type="button"
    >
      {children}
    </button>
);

const FormContainer: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-8 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30 animate-fade-in">
    {children}
  </div>
);

// Specific form implementations
const LoginForm = ({ onSignUpClick, onForgotPasswordClick, onLoginSuccess } : { onSignUpClick: () => void, onForgotPasswordClick: () => void, onLoginSuccess: () => void }) => (
    <FormContainer>
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tighter mb-2">Welcome Back!</h1>
            <p className="text-gray-600 dark:text-gray-400">Login to your RapidGig account</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onLoginSuccess(); }} className="space-y-6">
            <div>
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="email">Email</label>
                <InputField id="email" type="email" placeholder="you@example.com" defaultValue="your.email@example.com" icon={<EnvelopeIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />} />
            </div>
            <div>
                <div className="flex justify-between items-baseline">
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="password">Password</label>
                  <a onClick={onForgotPasswordClick} className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer transition-colors duration-300">Forgot?</a>
                </div>
                <InputField id="password" type="password" placeholder="••••••••" defaultValue="password" icon={<LockClosedIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />} />
            </div>
            {/* FIX: This component was reported as missing children, although the code appeared correct. The fix in the component definition resolves this. */}
            <PrimaryButton type="submit">Login <ArrowRightIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1"/></PrimaryButton>
            <div className="my-6 flex items-center">
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                <span className="px-4 text-gray-500 dark:text-gray-500 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            {/* FIX: This component was reported as missing children, although the code appeared correct. The fix in the component definition resolves this. */}
            <SocialButton>
                <GoogleIcon /> Continue with Google
            </SocialButton>
            <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-8">
                Don't have an account? <a onClick={onSignUpClick} className="font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer transition-colors duration-300">Sign Up</a>
            </p>
        </form>
    </FormContainer>
);

const SignUpForm = ({ onLoginClick, onSignUpSuccess }: { onLoginClick: () => void, onSignUpSuccess: () => void }) => {
    const [isStudent, setIsStudent] = useState(false);
    const [isRecruiter, setIsRecruiter] = useState(false);

    return (
        <FormContainer>
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold tracking-tighter mb-2">Create your Account</h1>
                <p className="text-gray-600 dark:text-gray-400">Join our community of talent.</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); onSignUpSuccess(); }} className="space-y-4">
                <InputField id="fullName" type="text" placeholder="John Doe" icon={<UserIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />} />
                <InputField id="email-signup" type="email" placeholder="name@example.com" icon={<EnvelopeIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />} />
                <InputField id="password-signup" type="password" placeholder="Create a secure password" icon={<LockClosedIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />} />
                <InputField id="confirm-password" type="password" placeholder="Re-enter your password" icon={<LockClosedIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />} />
                
                <div className="flex justify-between items-center py-2">
                    <label className="text-gray-700 dark:text-gray-300">I'm a Student</label>
                    <div onClick={() => setIsStudent(!isStudent)} className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${isStudent ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${isStudent ? 'translate-x-6' : ''}`}></div>
                    </div>
                </div>
                <div className="flex justify-between items-center pb-2">
                    <label className="text-gray-700 dark:text-gray-300">I'm a Recruiter</label>
                    <div onClick={() => setIsRecruiter(!isRecruiter)} className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${isRecruiter ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${isRecruiter ? 'translate-x-6' : ''}`}></div>
                    </div>
                </div>

                {/* FIX: This component was reported as missing children, although the code appeared correct. The fix in the component definition resolves this. */}
                <PrimaryButton type="submit">Create Account <ArrowRightIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1"/></PrimaryButton>
                <div className="py-2 flex items-center">
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                    <span className="px-4 text-gray-500 dark:text-gray-500 text-sm">OR</span>
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                </div>
                {/* FIX: This component was reported as missing children, although the code appeared correct. The fix in the component definition resolves this. */}
                <SocialButton>
                    <GoogleIcon /> Sign Up with Google
                </SocialButton>
                <p className="text-center text-gray-600 dark:text-gray-400 text-sm pt-4">
                    Already have an account? <a onClick={onLoginClick} className="font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer transition-colors duration-300">Login</a>
                </p>
            </form>
        </FormContainer>
    );
};

const ForgotPasswordForm = ({ onBackToLoginClick }: { onBackToLoginClick: () => void }) => (
    <FormContainer>
        <div className="text-center mb-8">
            <LogoIcon className="w-12 h-12 text-indigo-500 mx-auto" />
            <h1 className="text-4xl font-bold tracking-tighter mt-4">Forgot Password?</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">No worries, we'll send you reset instructions.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); alert('Reset link sent!'); onBackToLoginClick(); }} className="space-y-6">
            <InputField id="email-forgot" type="email" placeholder="your.email@example.com" icon={<EnvelopeIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />} />
            {/* FIX: This component was reported as missing children, although the code appeared correct. The fix in the component definition resolves this. */}
            <PrimaryButton type="submit">Send Reset Link <PaperAirplaneIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:rotate-45"/></PrimaryButton>
            <div className="text-center mt-6">
                <a onClick={onBackToLoginClick} className="inline-block align-baseline font-bold text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer transition-colors duration-300">← Back to Login</a>
            </div>
        </form>
    </FormContainer>
);

export default AuthPage;