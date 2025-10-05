/**
 * Utility to deactivate all template parts
 * This should be run once to clean up auto-generated template parts
 */

import { authClient } from '@o4o/auth-client';

export async function deactivateAllTemplateParts(): Promise<void> {
  try {
    // Get all template parts
    const response = await authClient.api.get('/public/template-parts');
    const templateParts = response.data?.data || response.data || [];

    // Deactivate each one
    for (const part of templateParts) {
      if (part.isActive) {
        await authClient.api.put(`/template-parts/${part.id}`, {
          isActive: false
        });
        console.log(`✅ Deactivated: ${part.name} (${part.area})`);
      }
    }

    console.log(`✅ All template parts deactivated`);
  } catch (error) {
    console.error('❌ Failed to deactivate template parts:', error);
    throw error;
  }
}

export async function deactivateTemplatePartsByArea(area: 'header' | 'footer' | 'sidebar' | 'general'): Promise<void> {
  try {
    const response = await authClient.api.get(`/public/template-parts?area=${area}`);
    const templateParts = response.data?.data || response.data || [];

    for (const part of templateParts) {
      if (part.isActive) {
        await authClient.api.put(`/template-parts/${part.id}`, {
          isActive: false
        });
        console.log(`✅ Deactivated: ${part.name}`);
      }
    }

    console.log(`✅ All ${area} template parts deactivated`);
  } catch (error) {
    console.error(`❌ Failed to deactivate ${area} template parts:`, error);
    throw error;
  }
}
