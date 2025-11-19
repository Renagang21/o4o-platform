import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import type { User } from './User.js'
import { MediaFolder } from './MediaFolder.js'

export interface MediaSize {
  name: string // thumbnail, small, medium, large, original
  width: number
  height: number
  url: string
  fileSize: number
  mimeType: string
}

export interface ImageFormats {
  webp: Record<string, MediaSize> // { thumbnail: MediaSize, small: MediaSize, ... }
  avif?: Record<string, MediaSize>
  jpg: Record<string, MediaSize>
}

@Entity('media_files')
export class MediaFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255 })
  filename!: string

  @Column({ type: 'varchar', length: 255 })
  originalName!: string

  @Column({ type: 'varchar', length: 500 })
  url!: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  path!: string

  @Column({ type: 'varchar' })
  mimeType!: string

  @Column({ type: 'bigint' })
  size!: number

  @Column({ type: 'integer', nullable: true })
  width!: number

  @Column({ type: 'integer', nullable: true })
  height!: number

  @Column({ type: 'json', nullable: true })
  sizes!: Record<string, MediaSize> // { thumbnail: MediaSize, small: MediaSize, ... }

  @Column({ type: 'json', nullable: true })
  formats!: ImageFormats // Complete format variants

  @Column({ type: 'text', nullable: true })
  altText!: string

  @Column({ type: 'text', nullable: true })
  caption!: string

  @Column({ type: 'text', nullable: true })
  description!: string

  @Column({ type: 'uuid', nullable: true })
  folderId!: string

  @ManyToOne('MediaFolder', { nullable: true, lazy: true })
  @JoinColumn({ name: 'folderId' })
  folder!: Promise<MediaFolder>

  @Column({ type: 'uuid' })
  uploadedBy!: string

  @ManyToOne('User')
  @JoinColumn({ name: 'uploadedBy' })
  uploader!: User

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, unknown> // EXIF, color profile, etc.

  @Column({ type: 'integer', default: 0 })
  downloads!: number

  @Column({ type: 'timestamp', nullable: true })
  lastAccessed!: Date

  @CreateDateColumn()
  uploadedAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}