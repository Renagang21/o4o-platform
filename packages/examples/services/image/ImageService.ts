
  // 이미지 검색
  async searchImages(
    query: string, 
    filters?: {
      category?: string
      dateFrom?: Date
      dateTo?: Date
      minWidth?: number
      maxFileSize?: number
    }
  ): Promise<ProcessedImage[]> {
    try {
      const params = new URLSearchParams({ q: query })
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString())
          }
        })
      }
      
      const response = await fetch(`${this.baseUrl}/search?${params}`)
      if (!response.ok) {
        throw new Error('Failed to search images')
      }
      
      return response.json()
    } catch (error) {
      console.error('Error searching images:', error)
      return []
    }
  }

  // 이미지 통계
  async getImageStats(): Promise<{
    totalImages: number
    totalSize: number
    averageSize: number
    formatDistribution: Record<string, number>
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`)
      if (!response.ok) {
        throw new Error('Failed to fetch image stats')
      }
      
      return response.json()
    } catch (error) {
      console.error('Error fetching image stats:', error)
      return {
        totalImages: 0,
        totalSize: 0,
        averageSize: 0,
        formatDistribution: {}
      }
    }
  }

  // 배치 이미지 처리
  async batchOptimize(imageIds: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageIds })
      })
      
      if (!response.ok) {
        throw new Error('Failed to start batch optimization')
      }
    } catch (error) {
      console.error('Error starting batch optimization:', error)
      throw error
    }
  }
}
