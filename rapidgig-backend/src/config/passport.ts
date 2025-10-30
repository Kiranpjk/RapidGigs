import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserService } from '../services/userService';
import { User } from '../models/User';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this email
        const existingUser = await UserService.findUserByEmail(profile.emails?.[0]?.value || '');
        
        if (existingUser) {
          return done(null, existingUser);
        }

        // Create new user from Google profile
        const userData = {
          email: profile.emails?.[0]?.value || '',
          password: 'google-oauth', // Placeholder password for OAuth users
          full_name: profile.displayName || '',
          role: 'student' as const, // Default to student, can be changed later
        };

        const newUser = await UserService.createUser(userData);
        return done(null, newUser);
      } catch (error) {
        return done(error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await UserService.findUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;