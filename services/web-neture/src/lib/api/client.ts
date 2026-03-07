/**
 * Shared API client utilities
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

// fetch wrapper with timeout (increased to 10s for cold-start tolerance)
export const fetchWithTimeout = async (url: string, options?: RequestInit, timeout = 10000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};
