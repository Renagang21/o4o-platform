import { AppDataSource } from '../database/connection';
import { RefreshToken } from '../entities/RefreshToken';
import { User } from '../entities/User';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { MoreThan, LessThan } from 'typeorm';

interface RefreshTokenPayload {
  userId: string;
  sub?: string;
  tokenFamily: string;
  tokenVersion: number;
  exp: number;
  iat: number;
}

interface TokenMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export class RefreshTokenService {
  private static refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
  private static userRepository = AppDataSource.getRepository(User);
  private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
  private static readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
  private static readonly MAX_TOKENS_PER_USER = 5; // Maximum refresh tokens per user

  /**
   * Generate a new refresh token and save to database
   */
  static async generateRefreshToken(
    user: User, 
    tokenFamily: string,
    metadata?: TokenMetadata
  ): Promise<string> {
    // Create token payload
    const payload: RefreshTokenPayload = {
      userId: user.id,
      sub: user.id,
      tokenFamily,
      tokenVersion: 1,
      exp: Math.floor(Date.now() / 1000) + this.REFRESH_TOKEN_EXPIRY,
      iat: Math.floor(Date.now() / 1000)
    };

    // Generate JWT
    const token = jwt.sign(payload, this.REFRESH_TOKEN_SECRET);

    // Save to database
    const refreshToken = this.refreshTokenRepository.create({
      token,
      userId: user.id,
      family: tokenFamily,
      expiresAt: new Date(payload.exp * 1000),
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress
    });

    await this.refreshTokenRepository.save(refreshToken);

    // Clean up old tokens for this user
    await this.cleanupOldTokens(user.id);

    return token;
  }

  /**
   * Verify and rotate refresh token (token rotation for security)
   */
  static async rotateRefreshToken(
    oldToken: string,
    metadata?: TokenMetadata
  ): Promise<{ token: string; family: string } | null> {
    try {
      // Verify the old token
      const payload = jwt.verify(oldToken, this.REFRESH_TOKEN_SECRET) as RefreshTokenPayload;

      // Find the token in database
      const existingToken = await this.refreshTokenRepository.findOne({
        where: {
          token: oldToken,
          family: payload.tokenFamily,
          isRevoked: false,
          expiresAt: MoreThan(new Date())
        },
        relations: ['user']
      });

      if (!existingToken || !existingToken.user) {
        // Token not found or revoked - possible token reuse attack
        await this.revokeTokenFamily(payload.tokenFamily);
        return null;
      }

      // Check if user is still active
      if (!existingToken.user.isActive) {
        await this.revokeTokenFamily(payload.tokenFamily);
        return null;
      }

      // Revoke the old token
      existingToken.isRevoked = true;
      await this.refreshTokenRepository.save(existingToken);

      // Generate new token with same family
      const newPayload: RefreshTokenPayload = {
        ...payload,
        tokenVersion: payload.tokenVersion + 1,
        exp: Math.floor(Date.now() / 1000) + this.REFRESH_TOKEN_EXPIRY,
        iat: Math.floor(Date.now() / 1000)
      };

      const newToken = jwt.sign(newPayload, this.REFRESH_TOKEN_SECRET);

      // Save new token to database
      const refreshToken = this.refreshTokenRepository.create({
        token: newToken,
        userId: existingToken.user.id,
        family: payload.tokenFamily,
        expiresAt: new Date(newPayload.exp * 1000),
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress
      });

      await this.refreshTokenRepository.save(refreshToken);

      return {
        token: newToken,
        family: payload.tokenFamily
      };
    } catch (error) {
      console.error('Token rotation error:', error);
      return null;
    }
  }

  /**
   * Verify refresh token without rotation
   */
  static async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      const payload = jwt.verify(token, this.REFRESH_TOKEN_SECRET) as RefreshTokenPayload;

      // Check if token exists and is valid
      const existingToken = await this.refreshTokenRepository.findOne({
        where: {
          token,
          family: payload.tokenFamily,
          isRevoked: false,
          expiresAt: MoreThan(new Date())
        }
      });

      if (!existingToken) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke a specific refresh token
   */
  static async revokeToken(token: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token },
      { isRevoked: true }
    );
  }

  /**
   * Revoke all tokens in a family (used for security breach scenarios)
   */
  static async revokeTokenFamily(family: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { family },
      { isRevoked: true }
    );
  }

  /**
   * Revoke all refresh tokens for a user
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId },
      { isRevoked: true }
    );

    // Also clear the token family from user record
    await this.userRepository.update(
      { id: userId },
      { refreshTokenFamily: null }
    );
  }

  /**
   * Get active refresh tokens for a user
   */
  static async getUserTokens(userId: string): Promise<RefreshToken[]> {
    return await this.refreshTokenRepository.find({
      where: {
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date())
      },
      order: {
        createdAt: 'DESC'
      }
    });
  }

  /**
   * Clean up expired and excess tokens
   */
  static async cleanupOldTokens(userId: string): Promise<void> {
    // Delete expired tokens
    await this.refreshTokenRepository.delete({
      userId,
      expiresAt: LessThan(new Date())
    });

    // Keep only the most recent MAX_TOKENS_PER_USER tokens
    const tokens = await this.refreshTokenRepository.find({
      where: { userId, isRevoked: false },
      order: { createdAt: 'DESC' }
    });

    if (tokens.length > this.MAX_TOKENS_PER_USER) {
      const tokensToRevoke = tokens.slice(this.MAX_TOKENS_PER_USER);
      await Promise.all(
        tokensToRevoke.map(token => 
          this.refreshTokenRepository.update(token.id, { isRevoked: true })
        )
      );
    }
  }

  /**
   * Clean up all expired tokens (for scheduled job)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date())
    });
    return result.affected || 0;
  }

  /**
   * Generate a new token family ID
   */
  static generateTokenFamily(): string {
    return uuidv4();
  }
}