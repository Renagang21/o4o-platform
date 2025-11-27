import { AppDataSource } from '../database/connection.js';
import { User, UserRole, UserStatus } from '../entities/User.js';
import { getAuthService } from './AuthService.js';
import { SessionSyncService } from './sessionSyncService.js';
import { emailService } from './emailService.js';
import { Response } from 'express';

interface SocialProfile {
  provider: 'google' | 'kakao' | 'naver';
  providerId: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export class SocialAuthService {
  /**
   * Handle social login/registration
   * Returns user and isNewUser flag for signup flow detection
   */
  static async handleSocialAuth(profile: SocialProfile): Promise<{ user: User; isNewUser: boolean }> {
    const userRepo = AppDataSource.getRepository(User);

    console.log('[SOCIAL AUTH] Checking user:', profile.provider, profile.email);

    // Check if user exists by email or provider ID
    let user = await userRepo.findOne({
      where: [
        { email: profile.email },
        { provider: profile.provider, provider_id: profile.providerId }
      ]
    });

    if (user) {
      console.log('[SOCIAL AUTH] Existing user found:', user.id, 'provider:', user.provider, 'provider_id:', user.provider_id);

      // Existing user - check if we need to link accounts
      if (user.provider === 'local' && !user.provider_id) {
        // This is a local account with same email - link it
        console.log('[SOCIAL AUTH] Linking local account to', profile.provider);
        user.provider = profile.provider;
        user.provider_id = profile.providerId;
        user.isEmailVerified = true; // Social emails are pre-verified
      }

      // Update user info
      user.lastLoginAt = new Date();
      if (profile.avatar && !user.avatar) {
        user.avatar = profile.avatar;
      }

      await userRepo.save(user);
      console.log('[SOCIAL AUTH] Returning existing user, isNewUser: false');
      return { user, isNewUser: false };
    }

    console.log('[SOCIAL AUTH] No existing user, creating new user');

    // Create new user
    user = userRepo.create({
      email: profile.email,
      name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatar: profile.avatar,
      provider: profile.provider,
      provider_id: profile.providerId,
      role: UserRole.USER,
      status: UserStatus.ACTIVE, // Auto-approve social logins
      isEmailVerified: true,
      password: '', // No password for social logins
      lastLoginAt: new Date()
    });

    await userRepo.save(user);
    console.log('[SOCIAL AUTH] New user created:', user.id, 'isNewUser: true');

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.name || user.email);
    } catch (error) {
      // Error log removed
    }

    return { user, isNewUser: true };
  }

  /**
   * Complete social login and set cookies
   */
  static async completeSocialLogin(user: User, res: Response): Promise<{
    user: User;
    sessionId: string;
  }> {
    // Get authService instance
    const authService = await getAuthService();

    // Generate tokens
    const tokens = await authService.generateTokens(user, 'neture.co.kr');

    // Create SSO session
    const sessionId = SessionSyncService.generateSessionId();
    await SessionSyncService.createSession(user, sessionId);

    // Set cookies
    authService.setAuthCookies(res, tokens);

    // Set session ID cookie for SSO
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: process.env.COOKIE_DOMAIN || undefined
    });

    return { user, sessionId };
  }

  /**
   * Link social account to existing user
   */
  static async linkSocialAccount(
    userId: string,
    provider: string,
    providerId: string
  ): Promise<User> {
    const userRepo = AppDataSource.getRepository(User);
    
    // Check if this social account is already linked
    const existingLink = await userRepo.findOne({
      where: { provider, provider_id: providerId }
    });
    
    if (existingLink) {
      if (existingLink.id === userId) {
        throw new Error('This social account is already linked to your account');
      } else {
        throw new Error('This social account is linked to another user');
      }
    }
    
    // Get user
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if user already has a different social account
    if (user.provider && user.provider !== 'local') {
      throw new Error(`Account is already linked to ${user.provider}`);
    }
    
    // Link the account
    user.provider = provider;
    user.provider_id = providerId;
    await userRepo.save(user);
    
    return user;
  }

  /**
   * Unlink social account
   */
  static async unlinkSocialAccount(userId: string): Promise<User> {
    const userRepo = AppDataSource.getRepository(User);
    
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!user.provider || user.provider === 'local') {
      throw new Error('No social account linked');
    }
    
    // Check if user has a password
    if (!user.password) {
      throw new Error('Please set a password before unlinking social account');
    }
    
    // Unlink
    user.provider = 'local';
    user.provider_id = null;
    await userRepo.save(user);
    
    return user;
  }

  /**
   * Get linked accounts for a user
   */
  static async getLinkedAccounts(userId: string): Promise<{
    local: boolean;
    google: boolean;
    kakao: boolean;
    naver: boolean;
  }> {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      local: !!user.password,
      google: user.provider === 'google',
      kakao: user.provider === 'kakao',
      naver: user.provider === 'naver'
    };
  }
}