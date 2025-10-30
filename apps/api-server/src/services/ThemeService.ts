import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { Theme, ThemeInstallation } from '../entities/Theme.js';
import { hooks, WP_HOOKS } from './HookSystem.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import AdmZip from 'adm-zip';
import axios from 'axios';
import { THEME_DIRS, THEME_SUBDIRS, THEME_FILES } from '../config/appearance.constants.js';

export interface ThemeManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  authorUrl?: string;
  screenshot?: string;
  demoUrl?: string;
  requiredPlugins?: string[];
  supportedLanguages?: string[];
  license?: string;
  templateFiles?: {
    name: string;
    path: string;
    type: 'template' | 'partial' | 'widget';
  }[];
  colorSchemes?: any[];
  layoutOptions?: any;
  typography?: any;
}

export class ThemeService {
  private themeRepository: Repository<Theme>;
  private installationRepository: Repository<ThemeInstallation>;
  private themesDir: string;
  private activeTheme: Theme | null = null;

  constructor() {
    this.themeRepository = AppDataSource.getRepository(Theme);
    this.installationRepository = AppDataSource.getRepository(ThemeInstallation);
    this.themesDir = THEME_DIRS.BASE;
  }

  /**
   * Get all available themes
   */
  async getAllThemes(): Promise<Theme[]> {
    const themes = await this.themeRepository.find({
      order: { createdAt: 'DESC' }
    });

    // Apply filters
    return await hooks.applyFilters('themes_list', themes);
  }

  /**
   * Get theme by ID
   */
  async getThemeById(id: string): Promise<Theme | null> {
    return await this.themeRepository.findOne({ where: { id } });
  }

  /**
   * Get theme by slug
   */
  async getThemeBySlug(slug: string): Promise<Theme | null> {
    return await this.themeRepository.findOne({ where: { slug } });
  }

  /**
   * Install theme from marketplace
   */
  async installTheme(themeUrl: string, siteId: string): Promise<ThemeInstallation> {
    // Hook before installation
    await hooks.doAction('before_theme_install', themeUrl, siteId);

    try {
      // Download theme package
      const response = await axios.get(themeUrl, { responseType: 'arraybuffer' });
      const zipBuffer = Buffer.from(response.data);

      // Create temp directory
      const tempDir = path.join(THEME_DIRS.TEMP, Date.now().toString());
      await fs.mkdir(tempDir, { recursive: true });

      // Extract theme
      const zip = new AdmZip(zipBuffer);
      zip.extractAllTo(tempDir, true);

      // Read theme manifest
      const manifestPath = path.join(tempDir, THEME_FILES.MANIFEST);
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: ThemeManifest = JSON.parse(manifestContent);

      // Create theme record
      const theme = this.themeRepository.create({
        slug: manifest.name.toLowerCase().replace(/\s+/g, '-'),
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        authorUrl: manifest.authorUrl,
        screenshot: manifest.screenshot,
        demoUrl: manifest.demoUrl,
        type: 'external',
        status: 'inactive',
        requiredPlugins: manifest.requiredPlugins,
        supportedLanguages: manifest.supportedLanguages,
        license: manifest.license,
        templateFiles: manifest.templateFiles,
        colorSchemes: manifest.colorSchemes,
        layoutOptions: manifest.layoutOptions,
        typography: manifest.typography
      });

      const savedTheme = await this.themeRepository.save(theme);

      // Move theme to permanent location
      const themeDir = path.join(this.themesDir, savedTheme.slug);
      await fs.rename(tempDir, themeDir);

      // Create installation record
      const installation = this.installationRepository.create({
        themeId: savedTheme.id,
        siteId,
        status: 'installed'
      });

      const savedInstallation = await this.installationRepository.save(installation);

      // Hook after installation
      await hooks.doAction('after_theme_install', savedTheme, savedInstallation);

      return savedInstallation;
    } catch (error) {
      // Hook on error
      await hooks.doAction('theme_install_error', error, themeUrl, siteId);
      throw error;
    }
  }

  /**
   * Activate theme
   */
  async activateTheme(themeId: string, siteId: string): Promise<void> {
    const theme = await this.getThemeById(themeId);
    if (!theme) {
      throw new Error('Theme not found');
    }

    // Hook before activation
    await hooks.doAction('before_theme_activate', theme, siteId);

    // Deactivate current active theme
    const currentActive = await this.installationRepository.findOne({
      where: { siteId, status: 'active' }
    });

    if (currentActive) {
      currentActive.status = 'installed';
      await this.installationRepository.save(currentActive);
    }

    // Activate new theme
    const installation = await this.installationRepository.findOne({
      where: { themeId, siteId }
    });

    if (!installation) {
      throw new Error('Theme not installed');
    }

    installation.status = 'active';
    installation.activatedAt = new Date();
    await this.installationRepository.save(installation);

    // Update theme status
    theme.status = 'active';
    await this.themeRepository.save(theme);

    this.activeTheme = theme;

    // Hook after activation
    await hooks.doAction(WP_HOOKS.SWITCH_THEME, theme, siteId);
    await hooks.doAction('after_theme_activate', theme, siteId);
  }

  /**
   * Deactivate theme
   */
  async deactivateTheme(themeId: string, siteId: string): Promise<void> {
    const installation = await this.installationRepository.findOne({
      where: { themeId, siteId, status: 'active' }
    });

    if (!installation) {
      throw new Error('Theme not active');
    }

    installation.status = 'installed';
    await this.installationRepository.save(installation);

    const theme = await this.getThemeById(themeId);
    if (theme) {
      theme.status = 'inactive';
      await this.themeRepository.save(theme);
    }

    if (this.activeTheme?.id === themeId) {
      this.activeTheme = null;
    }

    await hooks.doAction('theme_deactivated', themeId, siteId);
  }

  /**
   * Uninstall theme
   */
  async uninstallTheme(themeId: string, siteId: string): Promise<void> {
    const theme = await this.getThemeById(themeId);
    if (!theme) {
      throw new Error('Theme not found');
    }

    // Hook before uninstall
    await hooks.doAction('before_theme_uninstall', theme, siteId);

    // Delete installation record
    await this.installationRepository.delete({ themeId, siteId });

    // Delete theme files
    const themeDir = path.join(this.themesDir, theme.slug);
    await fs.rm(themeDir, { recursive: true, force: true });

    // Delete theme record if no other installations
    const otherInstallations = await this.installationRepository.count({
      where: { themeId }
    });

    if (otherInstallations === 0) {
      await this.themeRepository.delete(themeId);
    }

    // Hook after uninstall
    await hooks.doAction('after_theme_uninstall', theme, siteId);
  }

  /**
   * Update theme
   */
  async updateTheme(themeId: string, updateUrl: string): Promise<Theme> {
    const theme = await this.getThemeById(themeId);
    if (!theme) {
      throw new Error('Theme not found');
    }

    // Hook before update
    await hooks.doAction('before_theme_update', theme);

    // Backup current theme
    const backupDir = path.join(THEME_DIRS.BACKUPS, theme.slug, Date.now().toString());
    await fs.mkdir(backupDir, { recursive: true });
    
    const themeDir = path.join(this.themesDir, theme.slug);
    await this.copyDirectory(themeDir, backupDir);

    try {
      // Download update
      const response = await axios.get(updateUrl, { responseType: 'arraybuffer' });
      const zipBuffer = Buffer.from(response.data);

      // Extract update
      const zip = new AdmZip(zipBuffer);
      zip.extractAllTo(themeDir, true);

      // Read updated manifest
      const manifestPath = path.join(themeDir, THEME_FILES.MANIFEST);
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: ThemeManifest = JSON.parse(manifestContent);

      // Update theme record
      theme.version = manifest.version;
      theme.lastUpdate = new Date();
      
      // Add to changelog
      if (!theme.changelog) {
        theme.changelog = [];
      }
      theme.changelog.push({
        version: manifest.version,
        date: new Date(),
        changes: ['Theme updated']
      });

      const updatedTheme = await this.themeRepository.save(theme);

      // Hook after update
      await hooks.doAction('after_theme_update', updatedTheme);

      return updatedTheme;
    } catch (error) {
      // Restore backup on error
      await fs.rm(themeDir, { recursive: true, force: true });
      await this.copyDirectory(backupDir, themeDir);
      
      await hooks.doAction('theme_update_error', error, theme);
      throw error;
    }
  }

  /**
   * Get theme preview data
   */
  async getThemePreview(themeId: string): Promise<any> {
    const theme = await this.getThemeById(themeId);
    if (!theme) {
      throw new Error('Theme not found');
    }

    const previewData = {
      theme,
      styles: await this.getThemeStyles(theme),
      scripts: await this.getThemeScripts(theme),
      templates: theme.templateFiles || [],
      colorSchemes: theme.colorSchemes || [],
      layoutOptions: theme.layoutOptions || {},
      typography: theme.typography || {}
    };

    // Apply filters
    return await hooks.applyFilters('theme_preview_data', previewData, theme);
  }

  /**
   * Save theme customizations
   */
  async saveCustomizations(
    themeId: string,
    siteId: string,
    customizations: any
  ): Promise<void> {
    const installation = await this.installationRepository.findOne({
      where: { themeId, siteId }
    });

    if (!installation) {
      throw new Error('Theme not installed');
    }

    // Apply filters to customizations
    const filtered = await hooks.applyFilters('theme_customizations', customizations, themeId);

    installation.customizations = filtered;
    await this.installationRepository.save(installation);

    // Hook after save
    await hooks.doAction(WP_HOOKS.CUSTOMIZE_SAVE, filtered, themeId, siteId);
  }

  /**
   * Get active theme
   */
  async getActiveTheme(siteId: string): Promise<Theme | null> {
    const installation = await this.installationRepository.findOne({
      where: { siteId, status: 'active' }
    });

    if (!installation) {
      return null;
    }

    return await this.getThemeById(installation.themeId);
  }

  /**
   * Search themes in marketplace
   */
  async searchMarketplace(query: string, filters?: any): Promise<Theme[]> {
    const queryBuilder = this.themeRepository.createQueryBuilder('theme');

    if (query) {
      queryBuilder.where(
        '(theme.name ILIKE :query OR theme.description ILIKE :query OR theme.author ILIKE :query)',
        { query: `%${query}%` }
      );
    }

    if (filters?.type) {
      queryBuilder.andWhere('theme.type = :type', { type: filters.type });
    }

    if (filters?.isPremium !== undefined) {
      queryBuilder.andWhere('theme.isPremium = :isPremium', { isPremium: filters.isPremium });
    }

    if (filters?.minRating) {
      queryBuilder.andWhere('theme.rating >= :minRating', { minRating: filters.minRating });
    }

    if (filters?.maxPrice) {
      queryBuilder.andWhere('(theme.price IS NULL OR theme.price <= :maxPrice)', { 
        maxPrice: filters.maxPrice 
      });
    }

    const themes = await queryBuilder
      .orderBy('theme.downloads', 'DESC')
      .addOrderBy('theme.rating', 'DESC')
      .getMany();

    // Apply filters
    return await hooks.applyFilters('marketplace_themes', themes, query, filters);
  }

  /**
   * Helper: Get theme styles
   */
  private async getThemeStyles(theme: Theme): Promise<string[]> {
    const styles: string[] = [];
    const themeDir = path.join(this.themesDir, theme.slug);

    try {
      const stylesDir = path.join(themeDir, THEME_SUBDIRS.STYLES);
      const files = await fs.readdir(stylesDir);
      
      for (const file of files) {
        if (file.endsWith('.css')) {
          const content = await fs.readFile(path.join(stylesDir, file), 'utf-8');
          styles.push(content);
        }
      }
    } catch (error) {
      // Styles directory might not exist
    }

    if (theme.customCss) {
      styles.push(theme.customCss);
    }

    return styles;
  }

  /**
   * Helper: Get theme scripts
   */
  private async getThemeScripts(theme: Theme): Promise<string[]> {
    const scripts: string[] = [];
    const themeDir = path.join(this.themesDir, theme.slug);

    try {
      const scriptsDir = path.join(themeDir, THEME_SUBDIRS.SCRIPTS);
      const files = await fs.readdir(scriptsDir);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          const content = await fs.readFile(path.join(scriptsDir, file), 'utf-8');
          scripts.push(content);
        }
      }
    } catch (error) {
      // Scripts directory might not exist
    }

    if (theme.customJs) {
      scripts.push(theme.customJs);
    }

    return scripts;
  }

  /**
   * Helper: Copy directory
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}