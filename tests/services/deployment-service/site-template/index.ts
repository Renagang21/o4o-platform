import * as fs from 'fs';
import * as path from 'path';

export interface SiteTemplate {
  name: string;
  description: string;
  pages: Record<string, any>;
  layout: {
    header: any;
    footer: any;
  };
  cms: {
    theme: any;
    navigation: any;
  };
  apps: string[];
}

/**
 * Load a site template by name
 */
export function loadTemplate(templateName: string = 'default'): SiteTemplate {
  const templateDir = __dirname;

  // Load apps configuration
  const appsPath = path.join(templateDir, 'apps.json');
  const appsConfig = JSON.parse(fs.readFileSync(appsPath, 'utf-8'));
  const apps = appsConfig[templateName] || appsConfig.default;

  // Load pages
  const pagesDir = path.join(templateDir, 'pages');
  const pageFiles = fs.readdirSync(pagesDir);
  const pages: Record<string, any> = {};

  for (const file of pageFiles) {
    if (file.endsWith('.json')) {
      const pageName = file.replace('.json', '');
      const pagePath = path.join(pagesDir, file);
      pages[pageName] = JSON.parse(fs.readFileSync(pagePath, 'utf-8'));
    }
  }

  // Load layout
  const header = JSON.parse(
    fs.readFileSync(path.join(templateDir, 'layout', 'header.json'), 'utf-8')
  );
  const footer = JSON.parse(
    fs.readFileSync(path.join(templateDir, 'layout', 'footer.json'), 'utf-8')
  );

  // Load CMS configuration
  const theme = JSON.parse(
    fs.readFileSync(path.join(templateDir, 'cms', 'theme.json'), 'utf-8')
  );
  const navigation = JSON.parse(
    fs.readFileSync(path.join(templateDir, 'cms', 'navigation.json'), 'utf-8')
  );

  return {
    name: templateName,
    description: getTemplateDescription(templateName),
    pages,
    layout: {
      header,
      footer,
    },
    cms: {
      theme,
      navigation,
    },
    apps,
  };
}

/**
 * Get template description
 */
function getTemplateDescription(templateName: string): string {
  const descriptions: Record<string, string> = {
    default: 'Standard e-commerce site with customer portal',
    ecommerce: 'Full-featured e-commerce platform',
    forum: 'Community forum with user management',
    pharmacy: 'Pharmacy site with Yaksa forum integration',
    signage: 'Digital signage content management',
  };

  return descriptions[templateName] || 'Custom template';
}

/**
 * List available templates
 */
export function listTemplates(): Array<{ name: string; description: string }> {
  const appsPath = path.join(__dirname, 'apps.json');
  const appsConfig = JSON.parse(fs.readFileSync(appsPath, 'utf-8'));

  return Object.keys(appsConfig).map(name => ({
    name,
    description: getTemplateDescription(name),
  }));
}

/**
 * Replace template variables with actual values
 */
export function hydrateTemplate(
  template: any,
  variables: Record<string, string>
): any {
  const json = JSON.stringify(template);
  let hydrated = json;

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{${key}}}`, 'g');
    hydrated = hydrated.replace(pattern, value);
  }

  return JSON.parse(hydrated);
}

export default {
  loadTemplate,
  listTemplates,
  hydrateTemplate,
};
