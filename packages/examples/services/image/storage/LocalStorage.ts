// src/services/image/storage/LocalStorage.ts
import fs from 'fs/promises'
import path from 'path'
import { ProcessedImage } from '../types'

export class LocalStorage {
  private basePath: string

  constructor(basePath: string = './uploads') {
    this.basePath = basePath
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath)
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true })
    }
  }

  async saveFile(buffer: Buffer, filename: string): Promise<string> {
    await this.ensureDirectory(this.basePath)
    
    const fullPath = path.join(this.basePath, filename)
    await fs.writeFile(fullPath, buffer)
    
    // 웹에서 접근 가능한 URL 반환
    return `/uploads/${filename}`
  }

  async saveMultipleFiles(
    files: Record<string, Buffer>,
    baseFilename: string
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {}
    
    for (const [variant, buffer] of Object.entries(files)) {
      const filename = `${baseFilename}_${variant}`
      results[variant] = await this.saveFile(buffer, filename)
    }
    
    return results
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.basePath, path.basename(filePath))
      await fs.unlink(fullPath)
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  }

  async deleteMultipleFiles(filePaths: string[]): Promise<void> {
    const deletePromises = filePaths.map(filePath => this.deleteFile(filePath))
    await Promise.allSettled(deletePromises)
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, path.basename(filePath))
      await fs.access(fullPath)
      return true
    } catch (error) {
      return false
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    try {
      const fullPath = path.join(this.basePath, path.basename(filePath))
      const stats = await fs.stat(fullPath)
      return stats.size
    } catch (error) {
      return 0
    }
  }

  async getFileBuffer(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, path.basename(filePath))
    return fs.readFile(fullPath)
  }

  generateFilename(
    originalName: string,
    suffix: string = '',
    format: string = 'jpg'
  ): string {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const nameWithoutExt = path.parse(originalName).name
    
    return `${nameWithoutExt}_${timestamp}_${randomString}${suffix}.${format}`
  }

  async cleanupOldFiles(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const files = await fs.readdir(this.basePath)
      const now = Date.now()
      
      for (const file of files) {
        const fullPath = path.join(this.basePath, file)
        const stats = await fs.stat(fullPath)
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(fullPath)
          console.log(`Deleted old file: ${file}`)
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old files:', error)
    }
  }

  async getDiskUsage(): Promise<{ used: number; total: number }> {
    try {
      const files = await fs.readdir(this.basePath)
      let totalSize = 0
      
      for (const file of files) {
        const fullPath = path.join(this.basePath, file)
        const stats = await fs.stat(fullPath)
        totalSize += stats.size
      }
      
      return { used: totalSize, total: 0 } // total은 시스템 정보가 필요
    } catch (error) {
      return { used: 0, total: 0 }
    }
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    const sourceFullPath = path.join(this.basePath, path.basename(sourcePath))
    const destFullPath = path.join(this.basePath, path.basename(destinationPath))
    
    await fs.copyFile(sourceFullPath, destFullPath)
  }

  async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    const sourceFullPath = path.join(this.basePath, path.basename(sourcePath))
    const destFullPath = path.join(this.basePath, path.basename(destinationPath))
    
    await fs.rename(sourceFullPath, destFullPath)
  }
}
