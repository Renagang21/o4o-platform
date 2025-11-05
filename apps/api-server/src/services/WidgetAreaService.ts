import { AppDataSource } from '../database/connection.js';
import { WidgetArea } from '../entities/WidgetArea.js';
import { Repository } from 'typeorm';

export class WidgetAreaService {
  private widgetAreaRepository: Repository<WidgetArea>;

  constructor() {
    this.widgetAreaRepository = AppDataSource.getRepository(WidgetArea);
  }

  /**
   * Get all active widget areas
   */
  async getAllActive(): Promise<WidgetArea[]> {
    try {
      return await this.widgetAreaRepository.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC', name: 'ASC' }
      });
    } catch (error) {
      console.error('[WidgetAreaService] Error fetching active widget areas:', error);
      throw error;
    }
  }

  /**
   * Get all widget areas (including inactive)
   */
  async getAll(): Promise<WidgetArea[]> {
    try {
      return await this.widgetAreaRepository.find({
        order: { sortOrder: 'ASC', name: 'ASC' }
      });
    } catch (error) {
      console.error('[WidgetAreaService] Error fetching all widget areas:', error);
      throw error;
    }
  }

  /**
   * Get widget area by ID
   */
  async getById(id: string): Promise<WidgetArea | null> {
    try {
      return await this.widgetAreaRepository.findOne({ where: { id } });
    } catch (error) {
      console.error(`[WidgetAreaService] Error fetching widget area ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get widget area by slug
   */
  async getBySlug(slug: string): Promise<WidgetArea | null> {
    try {
      return await this.widgetAreaRepository.findOne({ where: { slug } });
    } catch (error) {
      console.error(`[WidgetAreaService] Error fetching widget area by slug ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Create a new widget area
   */
  async create(data: Partial<WidgetArea>): Promise<WidgetArea> {
    try {
      const widgetArea = this.widgetAreaRepository.create(data);
      return await this.widgetAreaRepository.save(widgetArea);
    } catch (error) {
      console.error('[WidgetAreaService] Error creating widget area:', error);
      throw error;
    }
  }

  /**
   * Update a widget area
   */
  async update(id: string, data: Partial<WidgetArea>): Promise<WidgetArea | null> {
    try {
      const widgetArea = await this.getById(id);
      if (!widgetArea) {
        return null;
      }

      Object.assign(widgetArea, data);
      return await this.widgetAreaRepository.save(widgetArea);
    } catch (error) {
      console.error(`[WidgetAreaService] Error updating widget area ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a widget area
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.widgetAreaRepository.delete(id);
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      console.error(`[WidgetAreaService] Error deleting widget area ${id}:`, error);
      throw error;
    }
  }
}
