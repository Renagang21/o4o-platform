import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'

@Entity('media_folders')
export class MediaFolder {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ length: 255 })
  name!: string

  @Column({ unique: true, length: 255 })
  slug!: string

  @Column({ type: 'uuid', nullable: true })
  parentId!: string

  @ManyToOne('MediaFolder', { nullable: true, lazy: true })
  @JoinColumn({ name: 'parentId' })
  parent!: Promise<MediaFolder>

  // Note: OneToMany relationships removed to prevent circular dependency
  // Use MediaFolderRepository.find({ where: { parentId: folder.id } }) to get children
  // Use MediaFileRepository.find({ where: { folderId: folder.id } }) to get files

  @Column({ default: 0 })
  fileCount!: number

  @Column({ type: 'bigint', default: 0 })
  totalSize!: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}