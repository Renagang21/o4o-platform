# 디지털 사이니지 시스템 API 구현 작업 지시서

## 📋 작업 개요
O4O Platform의 디지털 사이니지 시스템 고도화 작업입니다.
현재 기본 기능(85%)은 구현되었으나, WebSocket 실시간 동기화, 미디어 업로드, 디바이스 관리가 필요합니다.

## 🎯 작업 목표
1. WebSocket 서버 구현 (Socket.IO)
2. 미디어 업로드 시스템 구축 (S3/CDN)
3. 디바이스 인증 및 관리
4. 실시간 상태 동기화

## 📁 현재 파일 구조
```
apps/api-server/src/
├── entities/
│   ├── SignageContent.ts (✅ 완성)
│   ├── SignageSchedule.ts (✅ 완성)
│   ├── Store.ts (✅ 완성)
│   ├── StorePlaylist.ts (✅ 완성)
│   ├── SignageDevice.ts (❌ 생성 필요)
│   └── MediaAsset.ts (❌ 생성 필요)
├── services/
│   ├── SignageService.ts (🔶 확장 필요)
│   ├── MediaUploadService.ts (❌ 생성 필요)
│   └── DeviceManagementService.ts (❌ 생성 필요)
└── websocket/
    └── signageSocketHandler.ts (❌ 생성 필요)
```

## 🔧 Phase 1: WebSocket 서버 구현

### 1.1 Socket.IO 서버 설정
**파일 위치**: `apps/api-server/src/websocket/signageSocketServer.ts`

```typescript
import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { Store } from '../entities/Store';
import { SignageDevice } from '../entities/SignageDevice';
import { SignageContent } from '../entities/SignageContent';
import { StorePlaylist } from '../entities/StorePlaylist';
import { SignageSchedule } from '../entities/SignageSchedule';
import logger from '../utils/simpleLogger';
import { EventEmitter } from 'events';

interface SocketUser {
  userId: string;
  storeId?: string;
  deviceId?: string;
  role: string;
}

interface PlaybackStatus {
  storeId: string;
  deviceId?: string;
  isPlaying: boolean;
  currentContent?: {
    id: string;
    title: string;
    type: string;
    url: string;
    duration?: number;
  };
  currentPlaylist?: {
    id: string;
    name: string;
  };
  progress?: number;
  volume?: number;
  lastUpdated: Date;
}

class SignageSocketServer extends EventEmitter {
  private io: SocketServer;
  private connectedDevices: Map<string, Socket> = new Map();
  private deviceStatus: Map<string, PlaybackStatus> = new Map();
  private storeRepository: Repository<Store>;
  private deviceRepository: Repository<SignageDevice>;
  private contentRepository: Repository<SignageContent>;
  private playlistRepository: Repository<StorePlaylist>;
  private scheduleRepository: Repository<SignageSchedule>;

  constructor(httpServer: HttpServer) {
    super();
    
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Initialize repositories
    this.storeRepository = AppDataSource.getRepository(Store);
    this.deviceRepository = AppDataSource.getRepository(SignageDevice);
    this.contentRepository = AppDataSource.getRepository(SignageContent);
    this.playlistRepository = AppDataSource.getRepository(StorePlaylist);
    this.scheduleRepository = AppDataSource.getRepository(SignageSchedule);

    this.setupSocketHandlers();
    this.startHeartbeat();
  }

  private setupSocketHandlers() {
    // Middleware for authentication
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        const storeId = socket.handshake.query.storeId as string;
        const deviceId = socket.handshake.query.deviceId as string;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = verify(token, process.env.JWT_SECRET!) as any;
        
        // Attach user info to socket
        (socket as any).user = {
          userId: decoded.userId,
          storeId,
          deviceId,
          role: decoded.role
        } as SocketUser;

        // Verify device if deviceId provided
        if (deviceId) {
          const device = await this.deviceRepository.findOne({
            where: { id: deviceId, isActive: true }
          });

          if (!device) {
            return next(new Error('Invalid device'));
          }

          this.connectedDevices.set(deviceId, socket);
        }

        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      const user = (socket as any).user as SocketUser;
      logger.info(`Socket connected: ${socket.id}, User: ${user.userId}, Store: ${user.storeId}`);

      // Join room based on store
      if (user.storeId) {
        socket.join(`store:${user.storeId}`);
        this.handleStoreConnection(socket, user.storeId);
      }

      // Device-specific setup
      if (user.deviceId) {
        socket.join(`device:${user.deviceId}`);
        this.handleDeviceConnection(socket, user.deviceId);
      }

      // Event handlers
      this.setupEventHandlers(socket, user);

      // Disconnection handler
      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
        
        if (user.deviceId) {
          this.connectedDevices.delete(user.deviceId);
          this.updateDeviceStatus(user.deviceId, { online: false });
        }
      });
    });
  }

  private setupEventHandlers(socket: Socket, user: SocketUser) {
    // Join/Leave store room
    socket.on('join-store', ({ storeId }) => {
      if (this.validateStoreAccess(user, storeId)) {
        socket.join(`store:${storeId}`);
        logger.info(`Socket ${socket.id} joined store ${storeId}`);
        
        // Send current store status
        this.sendStoreStatus(socket, storeId);
      }
    });

    socket.on('leave-store', ({ storeId }) => {
      socket.leave(`store:${storeId}`);
      logger.info(`Socket ${socket.id} left store ${storeId}`);
    });

    // Playback status updates from devices
    socket.on('playback-status-update', async (status: Partial<PlaybackStatus>) => {
      if (!user.deviceId) return;

      const fullStatus: PlaybackStatus = {
        storeId: user.storeId!,
        deviceId: user.deviceId,
        ...status,
        lastUpdated: new Date()
      };

      this.deviceStatus.set(user.deviceId, fullStatus);
      
      // Broadcast to store room
      this.io.to(`store:${user.storeId}`).emit('playback-status', fullStatus);
      
      // Store in database
      await this.updateDevicePlaybackStatus(user.deviceId, fullStatus);
      
      logger.debug(`Playback status updated for device ${user.deviceId}`);
    });

    // Control commands from admin
    socket.on('control-command', async (command) => {
      if (!this.validateAdminAccess(user)) return;

      const { storeId, deviceId, action, data } = command;
      
      logger.info(`Control command: ${action} for ${deviceId || storeId}`);

      if (deviceId) {
        // Send to specific device
        this.io.to(`device:${deviceId}`).emit('control-command', {
          action,
          data,
          timestamp: new Date()
        });
      } else if (storeId) {
        // Send to all devices in store
        const devices = await this.getStoreDevices(storeId);
        devices.forEach(device => {
          this.io.to(`device:${device.id}`).emit('control-command', {
            action,
            data,
            timestamp: new Date()
          });
        });
      }
    });

    // Content update requests
    socket.on('request-content', async ({ contentId, storeId }) => {
      const content = await this.contentRepository.findOne({
        where: { id: contentId },
        relations: ['tags']
      });

      if (content) {
        socket.emit('content-updated', content);
        
        // Notify all devices in store
        if (storeId) {
          this.io.to(`store:${storeId}`).emit('content-updated', content);
        }
      }
    });

    // Playlist update requests
    socket.on('request-playlist', async ({ playlistId, storeId }) => {
      const playlist = await this.playlistRepository.findOne({
        where: { id: playlistId },
        relations: ['items', 'items.content']
      });

      if (playlist) {
        socket.emit('playlist-updated', playlist);
        
        // Notify all devices in store
        if (storeId) {
          this.io.to(`store:${storeId}`).emit('playlist-updated', playlist);
        }
      }
    });

    // Schedule update notification
    socket.on('schedule-change', async ({ storeId }) => {
      const schedules = await this.getActiveSchedules(storeId);
      
      this.io.to(`store:${storeId}`).emit('schedule-updated', schedules);
      logger.info(`Schedule updated for store ${storeId}`);
    });

    // Emergency broadcast
    socket.on('emergency-broadcast', async ({ message, stores }) => {
      if (!this.validateAdminAccess(user)) return;

      const broadcastData = {
        type: 'emergency',
        message,
        timestamp: new Date(),
        priority: 999
      };

      if (stores && stores.length > 0) {
        stores.forEach((storeId: string) => {
          this.io.to(`store:${storeId}`).emit('emergency-broadcast', broadcastData);
        });
      } else {
        // Broadcast to all connected devices
        this.io.emit('emergency-broadcast', broadcastData);
      }

      logger.warn(`Emergency broadcast sent: ${message}`);
    });

    // Device registration
    socket.on('register-device', async (deviceInfo) => {
      if (!user.storeId) return;

      const device = await this.registerDevice({
        ...deviceInfo,
        storeId: user.storeId,
        socketId: socket.id
      });

      socket.emit('device-registered', {
        deviceId: device.id,
        token: device.token
      });

      logger.info(`Device registered: ${device.id} for store ${user.storeId}`);
    });

    // Sync request
    socket.on('sync-request', async () => {
      if (!user.storeId) return;

      await this.syncStoreData(socket, user.storeId);
    });
  }

  // Helper methods
  private async handleStoreConnection(socket: Socket, storeId: string) {
    // Send current store configuration
    const store = await this.storeRepository.findOne({
      where: { id: storeId },
      relations: ['playlists', 'schedules']
    });

    if (store) {
      socket.emit('store-config-updated', {
        store,
        timestamp: new Date()
      });
    }
  }

  private async handleDeviceConnection(socket: Socket, deviceId: string) {
    // Update device online status
    await this.updateDeviceStatus(deviceId, { online: true });

    // Send current playback instructions
    const currentSchedule = await this.getCurrentSchedule(deviceId);
    if (currentSchedule) {
      socket.emit('schedule-updated', currentSchedule);
    }
  }

  private async sendStoreStatus(socket: Socket, storeId: string) {
    const devices = await this.getStoreDevices(storeId);
    const onlineDevices = devices.filter(d => this.connectedDevices.has(d.id));
    
    const status = {
      storeId,
      totalDevices: devices.length,
      onlineDevices: onlineDevices.length,
      devices: devices.map(d => ({
        id: d.id,
        name: d.name,
        online: this.connectedDevices.has(d.id),
        playbackStatus: this.deviceStatus.get(d.id)
      }))
    };

    socket.emit('store-status', status);
  }

  private async syncStoreData(socket: Socket, storeId: string) {
    // Get all relevant data
    const [store, playlists, schedules, contents] = await Promise.all([
      this.storeRepository.findOne({ where: { id: storeId } }),
      this.playlistRepository.find({ 
        where: { store: { id: storeId } },
        relations: ['items', 'items.content']
      }),
      this.getActiveSchedules(storeId),
      this.contentRepository.find({
        where: { status: 'approved', isPublic: true },
        take: 100
      })
    ]);

    socket.emit('sync-data', {
      store,
      playlists,
      schedules,
      contents,
      timestamp: new Date()
    });

    logger.info(`Synced data for store ${storeId}`);
  }

  private async getStoreDevices(storeId: string): Promise<SignageDevice[]> {
    return this.deviceRepository.find({
      where: { store: { id: storeId }, isActive: true }
    });
  }

  private async getActiveSchedules(storeId: string) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    return this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.playlist', 'playlist')
      .leftJoinAndSelect('playlist.items', 'items')
      .leftJoinAndSelect('items.content', 'content')
      .where('schedule.storeId = :storeId', { storeId })
      .andWhere('schedule.isActive = :isActive', { isActive: true })
      .andWhere('(schedule.startDate IS NULL OR schedule.startDate <= :now)', { now })
      .andWhere('(schedule.endDate IS NULL OR schedule.endDate >= :now)', { now })
      .orderBy('schedule.priority', 'DESC')
      .getMany();
  }

  private async getCurrentSchedule(deviceId: string) {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ['store']
    });

    if (!device) return null;

    const schedules = await this.getActiveSchedules(device.store.id);
    
    // Return highest priority schedule
    return schedules[0] || null;
  }

  private async updateDeviceStatus(deviceId: string, status: any) {
    await this.deviceRepository.update(deviceId, {
      lastSeenAt: new Date(),
      ...status
    });
  }

  private async updateDevicePlaybackStatus(deviceId: string, status: PlaybackStatus) {
    await this.deviceRepository.update(deviceId, {
      playbackStatus: status as any,
      lastSeenAt: new Date()
    });
  }

  private async registerDevice(deviceInfo: any) {
    const device = this.deviceRepository.create({
      ...deviceInfo,
      token: this.generateDeviceToken(),
      isActive: true,
      lastSeenAt: new Date()
    });

    return this.deviceRepository.save(device);
  }

  private generateDeviceToken(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateStoreAccess(user: SocketUser, storeId: string): boolean {
    // Admin can access all stores
    if (user.role === 'admin') return true;
    
    // Check if user has access to this store
    return user.storeId === storeId;
  }

  private validateAdminAccess(user: SocketUser): boolean {
    return user.role === 'admin' || user.role === 'manager';
  }

  // Heartbeat to check device connections
  private startHeartbeat() {
    setInterval(() => {
      this.connectedDevices.forEach((socket, deviceId) => {
        socket.emit('ping');
        
        // Set timeout for pong response
        const timeout = setTimeout(() => {
          logger.warn(`Device ${deviceId} not responding, disconnecting...`);
          socket.disconnect();
          this.connectedDevices.delete(deviceId);
        }, 5000);

        socket.once('pong', () => {
          clearTimeout(timeout);
        });
      });
    }, 30000); // Every 30 seconds
  }

  // Public methods for external use
  public broadcastToStore(storeId: string, event: string, data: any) {
    this.io.to(`store:${storeId}`).emit(event, data);
  }

  public broadcastToDevice(deviceId: string, event: string, data: any) {
    this.io.to(`device:${deviceId}`).emit(event, data);
  }

  public getConnectedDevices(): string[] {
    return Array.from(this.connectedDevices.keys());
  }

  public getDeviceStatus(deviceId: string): PlaybackStatus | undefined {
    return this.deviceStatus.get(deviceId);
  }
}

export default SignageSocketServer;
```

## 🔧 Phase 2: 미디어 업로드 서비스

### 2.1 MediaAsset 엔티티 생성
**파일 위치**: `apps/api-server/src/entities/MediaAsset.ts`

```typescript
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index 
} from 'typeorm';
import { User } from './User';
import { Store } from './Store';

@Entity('media_assets')
@Index(['type', 'status'])
@Index(['uploadedBy'])
export class MediaAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column({
    type: 'enum',
    enum: ['video', 'image', 'audio', 'document'],
  })
  type: 'video' | 'image' | 'audio' | 'document';

  @Column('bigint')
  size: number; // in bytes

  @Column()
  url: string; // S3/CDN URL

  @Column({ nullable: true })
  thumbnailUrl?: string;

  @Column('json', { nullable: true })
  metadata?: {
    width?: number;
    height?: number;
    duration?: number; // in seconds
    frameRate?: number;
    bitrate?: number;
    codec?: string;
    format?: string;
    aspectRatio?: string;
  };

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending'
  })
  status: 'pending' | 'processing' | 'ready' | 'failed';

  @Column({ nullable: true })
  processingError?: string;

  @Column({ nullable: true })
  s3Key?: string;

  @Column({ nullable: true })
  s3Bucket?: string;

  @Column({ nullable: true })
  cdnUrl?: string;

  @ManyToOne(() => User)
  uploadedBy: User;

  @ManyToOne(() => Store, { nullable: true })
  store?: Store;

  @Column('simple-array', { nullable: true })
  tags?: string[];

  @Column({ default: false })
  isPublic: boolean;

  @CreateDateColumn()
  uploadedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
```

### 2.2 MediaUploadService 구현
**파일 위치**: `apps/api-server/src/services/MediaUploadService.ts`

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaAsset } from '../entities/MediaAsset';
import { S3 } from 'aws-sdk';
import * as sharp from 'sharp';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/simpleLogger';

interface UploadOptions {
  userId: string;
  storeId?: string;
  tags?: string[];
  isPublic?: boolean;
}

interface ProcessingResult {
  url: string;
  thumbnailUrl?: string;
  metadata?: any;
  s3Key: string;
}

@Injectable()
export class MediaUploadService {
  private s3: S3;
  private bucketName: string;
  private cdnBaseUrl: string;

  constructor(
    @InjectRepository(MediaAsset)
    private mediaAssetRepository: Repository<MediaAsset>,
  ) {
    this.s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.bucketName = process.env.S3_BUCKET_NAME || 'o4o-signage-media';
    this.cdnBaseUrl = process.env.CDN_BASE_URL || `https://${this.bucketName}.s3.amazonaws.com`;
  }

  // Upload media file
  async uploadMedia(
    file: Express.Multer.File,
    options: UploadOptions
  ): Promise<MediaAsset> {
    // Validate file
    this.validateFile(file);

    // Create media asset record
    const mediaAsset = this.mediaAssetRepository.create({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      type: this.getMediaType(file.mimetype),
      size: file.size,
      status: 'processing',
      uploadedBy: { id: options.userId },
      store: options.storeId ? { id: options.storeId } : undefined,
      tags: options.tags,
      isPublic: options.isPublic || false
    });

    const savedAsset = await this.mediaAssetRepository.save(mediaAsset);

    try {
      // Process and upload to S3
      const processingResult = await this.processAndUpload(file, savedAsset.id);

      // Update asset with results
      savedAsset.url = processingResult.url;
      savedAsset.thumbnailUrl = processingResult.thumbnailUrl;
      savedAsset.metadata = processingResult.metadata;
      savedAsset.s3Key = processingResult.s3Key;
      savedAsset.s3Bucket = this.bucketName;
      savedAsset.cdnUrl = `${this.cdnBaseUrl}/${processingResult.s3Key}`;
      savedAsset.status = 'ready';

      await this.mediaAssetRepository.save(savedAsset);

      logger.info(`Media uploaded successfully: ${savedAsset.id}`);

      return savedAsset;
    } catch (error) {
      // Update status to failed
      savedAsset.status = 'failed';
      savedAsset.processingError = error.message;
      await this.mediaAssetRepository.save(savedAsset);

      logger.error(`Media upload failed: ${savedAsset.id}`, error);
      throw error;
    } finally {
      // Clean up temporary file
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  }

  // Process and upload file to S3
  private async processAndUpload(
    file: Express.Multer.File,
    assetId: string
  ): Promise<ProcessingResult> {
    const mediaType = this.getMediaType(file.mimetype);
    let result: ProcessingResult;

    switch (mediaType) {
      case 'image':
        result = await this.processImage(file, assetId);
        break;
      case 'video':
        result = await this.processVideo(file, assetId);
        break;
      default:
        result = await this.uploadRawFile(file, assetId);
    }

    return result;
  }

  // Process image file
  private async processImage(
    file: Express.Multer.File,
    assetId: string
  ): Promise<ProcessingResult> {
    const image = sharp(file.path);
    const metadata = await image.metadata();

    // Create thumbnail
    const thumbnailBuffer = await image
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload original
    const originalKey = `media/${assetId}/original${path.extname(file.originalname)}`;
    await this.uploadToS3(file.path, originalKey, file.mimetype);

    // Upload thumbnail
    const thumbnailKey = `media/${assetId}/thumbnail.jpg`;
    await this.s3.putObject({
      Bucket: this.bucketName,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read'
    }).promise();

    return {
      url: `${this.cdnBaseUrl}/${originalKey}`,
      thumbnailUrl: `${this.cdnBaseUrl}/${thumbnailKey}`,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        aspectRatio: metadata.width && metadata.height 
          ? `${metadata.width}:${metadata.height}` 
          : undefined
      },
      s3Key: originalKey
    };
  }

  // Process video file
  private async processVideo(
    file: Express.Multer.File,
    assetId: string
  ): Promise<ProcessingResult> {
    return new Promise((resolve, reject) => {
      const outputDir = path.join(process.cwd(), 'temp', assetId);
      
      // Create temp directory
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Get video metadata
      ffmpeg.ffprobe(file.path, async (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        // Generate thumbnail
        const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
        
        ffmpeg(file.path)
          .screenshots({
            timestamps: ['10%'],
            filename: 'thumbnail.jpg',
            folder: outputDir,
            size: '640x360'
          })
          .on('end', async () => {
            try {
              // Upload original video
              const videoKey = `media/${assetId}/video${path.extname(file.originalname)}`;
              await this.uploadToS3(file.path, videoKey, file.mimetype);

              // Upload thumbnail
              const thumbnailKey = `media/${assetId}/thumbnail.jpg`;
              await this.uploadToS3(thumbnailPath, thumbnailKey, 'image/jpeg');

              // Clean up temp files
              fs.rmSync(outputDir, { recursive: true, force: true });

              resolve({
                url: `${this.cdnBaseUrl}/${videoKey}`,
                thumbnailUrl: `${this.cdnBaseUrl}/${thumbnailKey}`,
                metadata: {
                  width: videoStream?.width,
                  height: videoStream?.height,
                  duration: metadata.format.duration,
                  frameRate: videoStream?.r_frame_rate,
                  bitrate: metadata.format.bit_rate,
                  codec: videoStream?.codec_name,
                  format: metadata.format.format_name,
                  aspectRatio: videoStream?.display_aspect_ratio
                },
                s3Key: videoKey
              });
            } catch (error) {
              reject(error);
            }
          })
          .on('error', (err) => {
            reject(err);
          });
      });
    });
  }

  // Upload raw file without processing
  private async uploadRawFile(
    file: Express.Multer.File,
    assetId: string
  ): Promise<ProcessingResult> {
    const key = `media/${assetId}/${file.originalname}`;
    await this.uploadToS3(file.path, key, file.mimetype);

    return {
      url: `${this.cdnBaseUrl}/${key}`,
      s3Key: key,
      metadata: {}
    };
  }

  // Upload file to S3
  private async uploadToS3(
    filePath: string,
    key: string,
    contentType: string
  ): Promise<void> {
    const fileStream = fs.createReadStream(filePath);

    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
      ACL: 'public-read',
      CacheControl: 'max-age=31536000' // 1 year
    };

    await this.s3.upload(params).promise();
  }

  // Validate file
  private validateFile(file: Express.Multer.File) {
    const maxSize = 500 * 1024 * 1024; // 500MB
    const allowedMimeTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'audio/mpeg',
      'audio/wav'
    ];

    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds ${maxSize / 1024 / 1024}MB`);
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
  }

  // Get media type from mime type
  private getMediaType(mimeType: string): 'video' | 'image' | 'audio' | 'document' {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  // Get media assets
  async getMediaAssets(filters: any) {
    const query = this.mediaAssetRepository.createQueryBuilder('asset')
      .leftJoinAndSelect('asset.uploadedBy', 'user')
      .leftJoinAndSelect('asset.store', 'store');

    if (filters.type) {
      query.andWhere('asset.type = :type', { type: filters.type });
    }

    if (filters.storeId) {
      query.andWhere('asset.store.id = :storeId', { storeId: filters.storeId });
    }

    if (filters.status) {
      query.andWhere('asset.status = :status', { status: filters.status });
    }

    if (filters.isPublic !== undefined) {
      query.andWhere('asset.isPublic = :isPublic', { isPublic: filters.isPublic });
    }

    return query
      .orderBy('asset.uploadedAt', 'DESC')
      .getMany();
  }

  // Delete media asset
  async deleteMediaAsset(assetId: string) {
    const asset = await this.mediaAssetRepository.findOne({
      where: { id: assetId }
    });

    if (!asset) {
      throw new BadRequestException('Media asset not found');
    }

    // Delete from S3
    if (asset.s3Key) {
      try {
        await this.s3.deleteObject({
          Bucket: this.bucketName,
          Key: asset.s3Key
        }).promise();

        // Delete thumbnail if exists
        if (asset.thumbnailUrl) {
          const thumbnailKey = `media/${assetId}/thumbnail.jpg`;
          await this.s3.deleteObject({
            Bucket: this.bucketName,
            Key: thumbnailKey
          }).promise();
        }
      } catch (error) {
        logger.error(`Failed to delete S3 objects for asset ${assetId}`, error);
      }
    }

    // Soft delete the record
    asset.deletedAt = new Date();
    await this.mediaAssetRepository.save(asset);

    logger.info(`Media asset deleted: ${assetId}`);
  }
}
```

## 🔧 Phase 3: 디바이스 관리

### 3.1 SignageDevice 엔티티 생성
**파일 위치**: `apps/api-server/src/entities/SignageDevice.ts`

```typescript
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index 
} from 'typeorm';
import { Store } from './Store';

@Entity('signage_devices')
@Index(['store', 'isActive'])
@Index(['token'])
export class SignageDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Store, store => store.devices)
  store: Store;

  @Column()
  name: string;

  @Column({ unique: true })
  token: string;

  @Column({ nullable: true })
  deviceModel?: string;

  @Column({ nullable: true })
  osVersion?: string;

  @Column({ nullable: true })
  appVersion?: string;

  @Column({ nullable: true })
  screenResolution?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  macAddress?: string;

  @Column({ default: false })
  online: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column('json', { nullable: true })
  playbackStatus?: {
    isPlaying: boolean;
    currentContentId?: string;
    currentPlaylistId?: string;
    progress?: number;
    volume?: number;
    lastUpdated: Date;
  };

  @Column('json', { nullable: true })
  settings?: {
    autoStart: boolean;
    volume: number;
    brightness: number;
    orientation: 'landscape' | 'portrait';
    scheduleEnabled: boolean;
    emergencyBroadcastEnabled: boolean;
  };

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  registeredAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## 🔧 Phase 4: API Routes 업데이트

### 4.1 Media Upload Routes
**파일 위치**: `apps/api-server/src/routes/media.ts`

```typescript
import { Router } from 'express';
import multer from 'multer';
import { MediaUploadService } from '../services/MediaUploadService';
import { authMiddleware } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';

const router = Router();
const mediaUploadService = new MediaUploadService();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'temp/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'video/mp4',
      'video/webm',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Upload media
router.post('/upload',
  authMiddleware,
  upload.single('file'),
  async (req, res, next) => {
    try {
      const mediaAsset = await mediaUploadService.uploadMedia(req.file, {
        userId: req.user.id,
        storeId: req.body.storeId,
        tags: req.body.tags?.split(','),
        isPublic: req.body.isPublic === 'true'
      });

      res.json({
        success: true,
        data: mediaAsset
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get media assets
router.get('/',
  authMiddleware,
  async (req, res, next) => {
    try {
      const assets = await mediaUploadService.getMediaAssets(req.query);
      res.json({
        success: true,
        data: assets
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete media asset
router.delete('/:id',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  async (req, res, next) => {
    try {
      await mediaUploadService.deleteMediaAsset(req.params.id);
      res.json({
        success: true,
        message: 'Media asset deleted'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

## 🔧 Phase 5: 서버 초기화 업데이트

### 5.1 WebSocket 서버 통합
**파일 수정**: `apps/api-server/src/server.ts`

```typescript
import express from 'express';
import http from 'http';
import SignageSocketServer from './websocket/signageSocketServer';

const app = express();
const httpServer = http.createServer(app);

// Initialize WebSocket server
const socketServer = new SignageSocketServer(httpServer);

// Make socket server available globally
(global as any).signageSocketServer = socketServer;

// ... rest of server setup

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server initialized`);
});
```

## 📊 환경 변수 설정

**.env 파일에 추가**
```env
# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=o4o-signage-media
CDN_BASE_URL=https://cdn.example.com

# WebSocket
WEBSOCKET_PORT=3002
WEBSOCKET_CORS_ORIGIN=http://localhost:5173

# FFmpeg
FFMPEG_PATH=/usr/local/bin/ffmpeg
FFPROBE_PATH=/usr/local/bin/ffprobe
```

## 📋 테스트 시나리오

### 1. WebSocket 연결 테스트
```javascript
// Client-side test
const socket = io('http://localhost:3001', {
  auth: {
    token: localStorage.getItem('token')
  },
  query: {
    storeId: 'store-123',
    deviceId: 'device-456'
  }
});

socket.on('connect', () => {
  console.log('Connected to signage server');
});

socket.on('content-updated', (content) => {
  console.log('Content updated:', content);
});
```

### 2. 미디어 업로드 테스트
```bash
curl -X POST http://localhost:3001/api/media/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@video.mp4" \
  -F "storeId=store-123" \
  -F "tags=promo,featured" \
  -F "isPublic=true"
```

## 🚀 배포 체크리스트

1. **Dependencies 설치**
   ```bash
   npm install socket.io aws-sdk sharp fluent-ffmpeg multer
   npm install -D @types/socket.io @types/multer
   ```

2. **S3 버킷 설정**
   - 버킷 생성
   - CORS 정책 설정
   - Public read 권한 설정

3. **FFmpeg 설치**
   ```bash
   apt-get install ffmpeg
   ```

4. **PM2 설정 업데이트**
   - WebSocket 포트 오픈
   - Cluster 모드 설정

5. **Nginx 설정**
   ```nginx
   location /socket.io/ {
     proxy_pass http://localhost:3002;
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
   }
   ```

## 📌 주의사항

1. **WebSocket 연결**
   - 재연결 로직 필수
   - 하트비트 구현
   - 메모리 누수 방지

2. **미디어 처리**
   - 대용량 파일 처리 시 메모리 관리
   - 임시 파일 정리
   - 에러 핸들링

3. **보안**
   - 디바이스 토큰 검증
   - 파일 업로드 검증
   - Rate limiting

---

이 작업 지시서를 API 서버의 Claude Code에게 전달하여 디지털 사이니지 시스템을 완성하세요.
예상 작업 시간: 6-8시간