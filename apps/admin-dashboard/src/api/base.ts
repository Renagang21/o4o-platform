/**
 * Base API client export
 *
 * Re-exports the auth client's API instance for use in app-specific services.
 * This file provides a consistent import path for all app services (forum, crowdfunding, signage, etc.)
 */

import { authClient } from '@o4o/auth-client';

// Export the API instance from auth-client
export const api = authClient.api;
