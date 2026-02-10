import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

export const configurePassport = () => {
  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('Google OAuth Profile:', profile.id, profile.emails[0].value);
          
          // Check if user already exists
          let user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            console.log('Existing user found:', user.email);
            
            // Update Google ID if not set
            if (!user.googleId) {
              user.googleId = profile.id;
            }
            
            // Fix invalid role values (for existing users from old schema)
            const validRoles = ['Project Manager', 'Team Member'];
            if (!validRoles.includes(user.role)) {
              console.log('Fixing invalid role:', user.role, '-> Team Member');
              user.role = 'Team Member';
            }
            
            await user.save();
            return done(null, user);
          }

          console.log('Creating new user from Google');
          // Create new user - password will be auto-generated since googleId is set
          const bcrypt = await import('bcryptjs');
          const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          const hashedPassword = await bcrypt.default.hash(randomPassword, 10);
          
          // Create new User instance and save
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
            password: hashedPassword,
            role: 'Team Member'
          });
          
          console.log('User instance created, about to save:', {
            email: user.email,
            role: user.role,
            hasPassword: !!user.password,
            hasGoogleId: !!user.googleId
          });
          
          await user.save();
          console.log('New user saved successfully:', user.email);
          
          done(null, user);
        } catch (error) {
          console.error('Google OAuth Error:', error.message);
          console.error('Error details:', error);
          done(error, null);
        }
      }
    )
  );
};

export default passport;
