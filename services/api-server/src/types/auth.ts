import { Request } from 'express';

/**
 * JWT Access Token Payload
 * Contains all the claims included in the JWT token
 */
export interface AccessTokenPayload {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  domain: string | null;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated User
 * Represents the user object attached to the request after authentication
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  domain: string | null;
}

/**
 * Extended Express Request with authenticated user
 * Used throughout the application for authenticated routes
 */
export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * User roles enum
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  BUSINESS = 'business',
  AFFILIATE = 'affiliate'
}

/**
 * Permission types
 */
export enum Permission {
  // Admin permissions
  MANAGE_USERS = 'manage_users',
  MANAGE_PRODUCTS = 'manage_products',
  MANAGE_ORDERS = 'manage_orders',
  VIEW_ANALYTICS = 'view_analytics',
  
  // User permissions
  CREATE_ORDER = 'create_order',
  VIEW_OWN_ORDERS = 'view_own_orders',
  UPDATE_PROFILE = 'update_profile',
  
  // Business permissions
  BULK_ORDER = 'bulk_order',
  VIEW_WHOLESALE_PRICES = 'view_wholesale_prices',
  
  // Affiliate permissions
  VIEW_AFFILIATE_PRICES = 'view_affiliate_prices',
  TRACK_REFERRALS = 'track_referrals'
}