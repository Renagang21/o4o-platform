import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm'
import { MediaFile } from './MediaFile'

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

  @ManyToOne(() => MediaFolder, folder => folder.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent!: MediaFolder

  @OneToMany(() => MediaFolder, folder => folder.parent)
  children!: MediaFolder[]

  @OneToMany(() => MediaFile, file => file.folder)
  files!: MediaFile[]

  @Column({ default: 0 })
  fileCount!: number

  @Column({ type: 'bigint', default: 0 })
  totalSize!: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}