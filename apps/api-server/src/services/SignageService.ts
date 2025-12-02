import { AppDataSource } from '../database/connection.js';
import { SignageDevice } from '../entities/SignageDevice.js';
import { SignageSlide } from '../entities/SignageSlide.js';
import { SignagePlaylist, SignagePlaylistItem } from '../entities/SignagePlaylist.js';
import { SignageSchedule } from '../entities/SignageSchedule.js';
import { In } from 'typeorm';

export class SignageService {
  // Device methods
  async getDevices() {
    const repo = AppDataSource.getRepository(SignageDevice);
    return repo.find({ order: { registeredAt: 'DESC' } });
  }

  async createDevice(data: Partial<SignageDevice>) {
    const repo = AppDataSource.getRepository(SignageDevice);
    const device = repo.create(data);
    return repo.save(device);
  }

  async getDevice(id: string) {
    const repo = AppDataSource.getRepository(SignageDevice);
    return repo.findOne({ where: { id } });
  }

  async updateDevice(id: string, data: Partial<SignageDevice>) {
    const repo = AppDataSource.getRepository(SignageDevice);
    await repo.update(id, data);
    return this.getDevice(id);
  }

  async deleteDevice(id: string) {
    const repo = AppDataSource.getRepository(SignageDevice);
    await repo.delete(id);
  }

  // Slide methods
  async getSlides() {
    const repo = AppDataSource.getRepository(SignageSlide);
    return repo.find({ order: { createdAt: 'DESC' } });
  }

  async createSlide(data: Partial<SignageSlide>) {
    const repo = AppDataSource.getRepository(SignageSlide);
    const slide = repo.create(data);
    return repo.save(slide);
  }

  async getSlide(id: string) {
    const repo = AppDataSource.getRepository(SignageSlide);
    return repo.findOne({ where: { id } });
  }

  async updateSlide(id: string, data: Partial<SignageSlide>) {
    const repo = AppDataSource.getRepository(SignageSlide);
    await repo.update(id, data);
    return this.getSlide(id);
  }

  async deleteSlide(id: string) {
    const repo = AppDataSource.getRepository(SignageSlide);
    await repo.delete(id);
  }

  // Playlist methods
  async getPlaylists() {
    const repo = AppDataSource.getRepository(SignagePlaylist);
    return repo.find({ relations: ['items'], order: { createdAt: 'DESC' } });
  }

  async createPlaylist(data: Partial<SignagePlaylist> & { slideIds?: string[] }) {
    const playlistRepo = AppDataSource.getRepository(SignagePlaylist);
    const itemRepo = AppDataSource.getRepository(SignagePlaylistItem);

    const playlist = playlistRepo.create({
      title: data.title,
      description: data.description,
      active: data.active,
      loop: data.loop,
    });

    const savedPlaylist = await playlistRepo.save(playlist);

    if (data.slideIds && data.slideIds.length > 0) {
      const items = data.slideIds.map((slideId, index) =>
        itemRepo.create({
          playlistId: savedPlaylist.id,
          slideId,
          order: index,
        })
      );
      await itemRepo.save(items);
    }

    return this.getPlaylist(savedPlaylist.id);
  }

  async getPlaylist(id: string) {
    const repo = AppDataSource.getRepository(SignagePlaylist);
    return repo.findOne({ where: { id }, relations: ['items'] });
  }

  async updatePlaylist(id: string, data: Partial<SignagePlaylist>) {
    const repo = AppDataSource.getRepository(SignagePlaylist);
    await repo.update(id, data);
    return this.getPlaylist(id);
  }

  async deletePlaylist(id: string) {
    const repo = AppDataSource.getRepository(SignagePlaylist);
    await repo.delete(id);
  }

  // Schedule methods
  async getSchedules(deviceId?: string) {
    const repo = AppDataSource.getRepository(SignageSchedule);
    const where: any = deviceId ? { deviceId } : {};
    return repo.find({ where, order: { priority: 'DESC' } });
  }

  async createSchedule(data: Partial<SignageSchedule>) {
    const repo = AppDataSource.getRepository(SignageSchedule);
    const schedule = repo.create(data);
    return repo.save(schedule);
  }

  async updateSchedule(id: string, data: Partial<SignageSchedule>) {
    const repo = AppDataSource.getRepository(SignageSchedule);
    await repo.update(id, data);
    return repo.findOne({ where: { id } });
  }

  async deleteSchedule(id: string) {
    const repo = AppDataSource.getRepository(SignageSchedule);
    await repo.delete(id);
  }

  // Player method
  async getCurrentPlaylist(deviceId: string) {
    const scheduleRepo = AppDataSource.getRepository(SignageSchedule);
    const playlistRepo = AppDataSource.getRepository(SignagePlaylist);
    const slideRepo = AppDataSource.getRepository(SignageSlide);

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay();

    // Find active schedules
    const schedules = await scheduleRepo
      .createQueryBuilder('schedule')
      .where('schedule.deviceId = :deviceId', { deviceId })
      .andWhere('schedule.active = :active', { active: true })
      .andWhere('schedule.startTime <= :currentTime', { currentTime })
      .andWhere('schedule.endTime >= :currentTime', { currentTime })
      .orderBy('schedule.priority', 'DESC')
      .getMany();

    const validSchedule = schedules.find(schedule => {
      if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0) return true;
      return schedule.daysOfWeek.includes(currentDay);
    });

    if (!validSchedule) return null;

    const playlist = await playlistRepo.findOne({
      where: { id: validSchedule.playlistId },
      relations: ['items'],
    });

    if (!playlist) return null;

    const slideIds = playlist.items.map(item => item.slideId);
    const slides = await slideRepo.find({ where: { id: In(slideIds) } });

    const slidesMap = new Map(slides.map(s => [s.id, s]));
    const orderedSlides = playlist.items
      .sort((a, b) => a.order - b.order)
      .map(item => {
        const slide = slidesMap.get(item.slideId);
        if (!slide) return null;
        return { ...slide, duration: item.duration || slide.duration };
      })
      .filter(s => s !== null);

    return {
      playlist: { id: playlist.id, title: playlist.title, loop: playlist.loop },
      slides: orderedSlides,
      schedule: validSchedule,
    };
  }

  async getStats() {
    const devices = await this.getDevices();
    const slides = await this.getSlides();
    const playlists = await this.getPlaylists();
    const schedules = await this.getSchedules();

    return {
      totalDevices: devices.length,
      activeDevices: devices.filter(d => d.active).length,
      totalSlides: slides.length,
      activeSlides: slides.filter(s => s.active).length,
      totalPlaylists: playlists.length,
      activePlaylists: playlists.filter(p => p.active).length,
      totalSchedules: schedules.length,
      activeSchedules: schedules.filter(s => s.active).length,
    };
  }
}
