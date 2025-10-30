
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginForm from './components/LoginForm';
import SignUpForm from './components/SignUpForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import GoogleAuthCallback from './components/GoogleAuthCallback';
import ProfilePage from './pages/ProfilePage';
import ShortsPage from './pages/ShortsPage';
import JobsPage from './pages/JobsPage';
import ApplicationsPage from './pages/ApplicationsPage';
import MessagesPage from './pages/MessagesPage';
import RecruiterDashboard from './pages/RecruiterDashboard';
import NotificationSettings from './pages/NotificationSettings';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ContactPage from './pages/ContactPage';

// DEBUG: App loaded
console.log('DEBUG: App - imports loaded');



function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={
                <ProtectedRoute requireAuth={false} showNavbar={false}>
                  <LoginForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <ProtectedRoute requireAuth={false} showNavbar={false}>
                  <SignUpForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/forgot-password" 
              element={
                <ProtectedRoute requireAuth={false} showNavbar={false}>
                  <ForgotPasswordForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/auth/callback" 
              element={<GoogleAuthCallback />} 
            />
            
            {/* Protected routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/home" 
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile/:id?" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/shorts" 
              element={
                <ProtectedRoute>
                  <ShortsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/jobs" 
              element={
                <ProtectedRoute>
                  <JobsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/applications" 
              element={
                <ProtectedRoute>
                  <ApplicationsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/messages" 
              element={
                <ProtectedRoute>
                  <MessagesPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requiredRole="recruiter">
                  <RecruiterDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/notifications" 
              element={
                <ProtectedRoute>
                  <NotificationSettings />
                </ProtectedRoute>
              } 
            />
            
            {/* Static pages */}
            <Route 
              path="/about" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <AboutPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/terms" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <TermsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/privacy" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <PrivacyPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/contact" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <ContactPage />
                </ProtectedRoute>
              } 
            />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;