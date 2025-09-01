import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './User'
import { MediaFolder } from './MediaFolder'

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

  @Column({ length: 255 })
  filename!: string

  @Column({ length: 255 })
  originalName!: string

  @Column({ length: 500 })
  url!: string

  @Column({ length: 500, nullable: true })
  path!: string

  @Column()
  mimeType!: string

  @Column({ type: 'bigint' })
  size!: number

  @Column({ nullable: true })
  width!: number

  @Column({ nullable: true })
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

  @ManyToOne(() => MediaFolder, { nullable: true, lazy: true })
  @JoinColumn({ name: 'folderId' })
  folder!: Promise<MediaFolder>

  @Column({ type: 'uuid' })
  uploadedBy!: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedBy' })
  uploader!: User

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, unknown> // EXIF, color profile, etc.

  @Column({ default: 0 })
  downloads!: number

  @Column({ type: 'timestamp', nullable: true })
  lastAccessed!: Date

  @CreateDateColumn()
  uploadedAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}