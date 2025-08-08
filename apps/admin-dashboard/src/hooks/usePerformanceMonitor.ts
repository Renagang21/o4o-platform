/**
 * Performance Monitoring Hook
 * Tracks and optimizes editor performance
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  blockCount: number;
  renderTime: number;
  memoryUsage: number;
  fps: number;
  lagSpikes: number;
}

interface PerformanceConfig {
  enableMonitoring?: boolean;
  warnThreshold?: {
    blockCount?: number;
    renderTime?: number;
    memoryUsage?: number;
    fps?: number;
  };
  onPerformanceIssue?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMonitor(config: PerformanceConfig = {}) {
  const {
    enableMonitoring = true,
    warnThreshold = {
      blockCount: 100,
      renderTime: 100,
      memoryUsage: 50 * 1024 * 1024, // 50MB
      fps: 30
    },
    onPerformanceIssue
  } = config;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    blockCount: 0,
    renderTime: 0,
    memoryUsage: 0,
    fps: 60,
    lagSpikes: 0
  });

  const frameCount = useRef(0);
  const lastFrameTime = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);
  const animationId = useRef<number | undefined>(undefined);

  // Monitor FPS
  const measureFPS = useCallback(() => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastFrameTime.current;
    
    if (deltaTime > 0) {
      const currentFPS = 1000 / deltaTime;
      fpsHistory.current.push(currentFPS);
      
      // Keep only last 60 frames
      if (fpsHistory.current.length > 60) {
        fpsHistory.current.shift();
      }
      
      // Calculate average FPS
      const avgFPS = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;
      
      // Detect lag spikes (frame took more than 33ms)
      if (deltaTime > 33) {
        setMetrics(prev => ({ ...prev, lagSpikes: prev.lagSpikes + 1 }));
      }
      
      setMetrics(prev => ({ ...prev, fps: Math.round(avgFPS) }));
    }
    
    lastFrameTime.current = currentTime;
    frameCount.current++;
    
    if (enableMonitoring) {
      animationId.current = requestAnimationFrame(measureFPS);
    }
  }, [enableMonitoring]);

  // Monitor memory usage
  const measureMemory = useCallback(async () => {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize
      }));
    }
  }, []);

  // Monitor block count
  const measureBlockCount = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).wp?.data) {
      const { getBlocks } = (window as any).wp.data.select('core/block-editor');
      const blocks = getBlocks();
      
      if (blocks) {
        let totalCount = 0;
        const countBlocks = (blocks: any[]) => {
          blocks.forEach(block => {
            totalCount++;
            if (block.innerBlocks?.length > 0) {
              countBlocks(block.innerBlocks);
            }
          });
        };
        
        countBlocks(blocks);
        setMetrics(prev => ({ ...prev, blockCount: totalCount }));
      }
    }
  }, []);

  // Measure render time
  const measureRenderTime = useCallback((callback: () => void) => {
    const startTime = performance.now();
    
    callback();
    
    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      const renderTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, renderTime }));
    });
  }, []);

  // Check for performance issues
  useEffect(() => {
    if (!enableMonitoring) return;

    const warnings: string[] = [];
    
    if (warnThreshold.blockCount && metrics.blockCount > warnThreshold.blockCount) {
      warnings.push(`High block count: ${metrics.blockCount}`);
    }
    
    if (warnThreshold.renderTime && metrics.renderTime > warnThreshold.renderTime) {
      warnings.push(`Slow render: ${metrics.renderTime.toFixed(2)}ms`);
    }
    
    if (warnThreshold.memoryUsage && metrics.memoryUsage > warnThreshold.memoryUsage) {
      warnings.push(`High memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }
    
    if (warnThreshold.fps && metrics.fps < warnThreshold.fps) {
      warnings.push(`Low FPS: ${metrics.fps}`);
    }
    
    if (warnings.length > 0 && onPerformanceIssue) {
    // Removed console.warn
      onPerformanceIssue(metrics);
    }
  }, [metrics, warnThreshold, onPerformanceIssue, enableMonitoring]);

  // Start monitoring
  useEffect(() => {
    if (!enableMonitoring) return;

    // Start FPS monitoring
    measureFPS();
    
    // Periodic measurements
    const intervalId = setInterval(() => {
      measureMemory();
      measureBlockCount();
    }, 1000);
    
    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
      clearInterval(intervalId);
    };
  }, [enableMonitoring, measureFPS, measureMemory, measureBlockCount]);

  return {
    metrics,
    measureRenderTime,
    resetMetrics: () => {
      setMetrics({
        blockCount: 0,
        renderTime: 0,
        memoryUsage: 0,
        fps: 60,
        lagSpikes: 0
      });
      fpsHistory.current = [];
    }
  };
}

/**
 * Performance optimization suggestions based on metrics
 */
export function getPerformanceOptimizations(metrics: PerformanceMetrics): string[] {
  const suggestions: string[] = [];

  if (metrics.blockCount > 100) {
    suggestions.push('Consider splitting content into multiple pages');
    suggestions.push('Use reusable blocks for repeated content');
  }

  if (metrics.renderTime > 100) {
    suggestions.push('Reduce complex nested structures');
    suggestions.push('Optimize block attributes and inline styles');
  }

  if (metrics.memoryUsage > 50 * 1024 * 1024) {
    suggestions.push('Clear unused blocks from trash');
    suggestions.push('Reduce image sizes and media content');
  }

  if (metrics.fps < 30) {
    suggestions.push('Disable unnecessary visual effects');
    suggestions.push('Close other browser tabs');
  }

  return suggestions;
}