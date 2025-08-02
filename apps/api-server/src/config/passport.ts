import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import { Strategy as NaverStrategy } from 'passport-naver-v2';
import { AppDataSource } from '../database/connection';
import { User, UserRole, UserStatus } from '../entities/User';
import { emailService } from '../services/emailService';

// User serialization for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy - Only initialize if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/v1/auth/google/callback',
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    
    // Check if user exists
    let user = await userRepo.findOne({
      where: [
        { email: profile.emails?.[0]?.value },
        { provider: 'google', provider_id: profile.id }
      ]
    });

    if (user) {
      // Update last login
      user.lastLoginAt = new Date();
      await userRepo.save(user);
      return done(null, user);
    }

    // Create new user
    user = userRepo.create({
      email: profile.emails?.[0]?.value || '',
      name: profile.displayName,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      provider: 'google',
      provider_id: profile.id,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE, // Auto-approve social logins
      isEmailVerified: true, // Google emails are pre-verified
      password: '' // No password for social logins
    });

    await userRepo.save(user);

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.name || user.email);

    done(null, user);
  } catch (error) {
    done(error as Error, undefined);
  }
  }));
} else {
  // console.log('⚠️  Google OAuth not configured - skipping strategy initialization');
}

// Kakao OAuth Strategy - Only initialize if credentials are provided
if (process.env.KAKAO_CLIENT_ID) {
  passport.use(new KakaoStrategy({
    clientID: process.env.KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
    callbackURL: '/api/v1/auth/kakao/callback'
  }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    
    const email = profile._json.kakao_account?.email;
    
    if (!email) {
      return done(new Error('Email not provided by Kakao'), undefined);
    }

    // Check if user exists
    let user = await userRepo.findOne({
      where: [
        { email },
        { provider: 'kakao', provider_id: String(profile.id) }
      ]
    });

    if (user) {
      // Update last login
      user.lastLoginAt = new Date();
      await userRepo.save(user);
      return done(null, user);
    }

    // Create new user
    user = userRepo.create({
      email,
      name: profile.displayName || profile.username || profile._json?.properties?.nickname || '',
      provider: 'kakao',
      provider_id: String(profile.id),
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      password: ''
    });

    await userRepo.save(user);

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.name || user.email);

    done(null, user);
  } catch (error) {
    done(error as Error, undefined);
  }
  }));
} else {
  // console.log('⚠️  Kakao OAuth not configured - skipping strategy initialization');
}

// Naver OAuth Strategy - Only initialize if credentials are provided
if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
  passport.use(new NaverStrategy({
    clientID: process.env.NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
    callbackURL: '/api/v1/auth/naver/callback'
  }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    
    const email = profile.email;
    
    if (!email) {
      return done(new Error('Email not provided by Naver'), undefined);
    }

    // Check if user exists
    let user = await userRepo.findOne({
      where: [
        { email },
        { provider: 'naver', provider_id: profile.id }
      ]
    });

    if (user) {
      // Update last login
      user.lastLoginAt = new Date();
      await userRepo.save(user);
      return done(null, user);
    }

    // Create new user
    user = userRepo.create({
      email,
      name: profile.displayName || profile.nickname,
      provider: 'naver',
      provider_id: profile.id,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      password: ''
    });

    await userRepo.save(user);

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.name || user.email);

    done(null, user);
  } catch (error) {
    done(error as Error, undefined);
  }
  }));
} else {
  // console.log('⚠️  Naver OAuth not configured - skipping strategy initialization');
}

export default passport;