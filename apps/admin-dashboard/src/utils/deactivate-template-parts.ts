/**
 * Utility to deactivate all template parts
 * This should be run once to clean up auto-generated template parts
 */

import { authClient } from '@o4o/auth-client';

export async function deactivateAllTemplateParts(): Promise<{ count: number; parts: string[] }> {
  try {
    // Get all template parts
    const response = await authClient.api.get('/public/template-parts');
    const templateParts = response.data?.data || response.data || [];

    const deactivated: string[] = [];

    // Deactivate each one
    for (const part of templateParts) {
      if (part.isActive) {
        await authClient.api.put(`/template-parts/${part.id}`, {
          isActive: false
        });
        deactivated.push(`${part.name} (${part.area})`);
      }
    }

    return { count: deactivated.length, parts: deactivated };
  } catch (error) {
    throw new Error(`Failed to deactivate template parts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deactivateTemplatePartsByArea(
  area: 'header' | 'footer' | 'sidebar' | 'general'
): Promise<{ count: number; parts: string[] }> {
  try {
    const response = await authClient.api.get(`/public/template-parts?area=${area}`);
    const templateParts = response.data?.data || response.data || [];

    const deactivated: string[] = [];

    for (const part of templateParts) {
      if (part.isActive) {
        await authClient.api.put(`/template-parts/${part.id}`, {
          isActive: false
        });
        deactivated.push(part.name);
      }
    }

    return { count: deactivated.length, parts: deactivated };
  } catch (error) {
    throw new Error(`Failed to deactivate ${area} template parts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
