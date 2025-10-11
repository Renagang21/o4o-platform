/**
 * useAIJob Hook
 * Sprint 3: Manage AI job lifecycle with SSE streaming
 *
 * Features:
 * - Start async AI generation jobs
 * - Subscribe to real-time progress via SSE
 * - Validate results automatically
 * - Retry failed jobs
 * - Cancel running jobs
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { aiValidation, ValidationResult } from '../utils/ai-validation';
import { AIJobStatus } from '../components/AIProgressPanel';

interface AIJobRequest {
  provider: 'openai' | 'gemini' | 'claude';
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

interface AIJobData {
  jobId: string;
  requestId: string;
  status: AIJobStatus;
  progress: number;
  result?: any;
  validationResult?: ValidationResult;
  error?: string;
}

export const useAIJob = () => {
  const [jobData, setJobData] = useState<AIJobData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  /**
   * Start a new AI generation job
   */
  const startJob = useCallback(async (request: AIJobRequest): Promise<string | null> => {
    try {
      setIsLoading(true);

      // Enqueue job
      const response = await axios.post('/api/ai/generate/async', request);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to start job');
      }

      const { jobId, requestId } = response.data;

      // Initialize job data
      setJobData({
        jobId,
        requestId,
        status: 'queued',
        progress: 0,
      });

      // Start SSE connection
      connectSSE(jobId);

      return jobId;

    } catch (error: any) {
      console.error('Failed to start AI job:', error);
      setJobData({
        jobId: '',
        requestId: '',
        status: 'failed',
        progress: 0,
        error: error.response?.data?.message || error.message,
      });
      setIsLoading(false);
      return null;
    }
  }, []);

  /**
   * Connect to SSE stream for real-time updates
   */
  const connectSSE = useCallback((jobId: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/ai/stream/${jobId}`);

    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'connected') {
        // SSE connection established
      }

      if (data.type === 'progress') {
        setJobData((prev) => prev ? {
          ...prev,
          progress: data.progress.progress || 0,
          status: mapProgressToStatus(data.progress.progress),
        } : null);
      }

      if (data.type === 'completed') {
        handleJobCompleted(data.result, jobId);
        eventSource.close();
      }

      if (data.type === 'failed') {
        handleJobFailed(data.error);
        eventSource.close();
      }
    });

    eventSource.addEventListener('error', (error) => {
      console.error('SSE error:', error);
      eventSource.close();
      setIsLoading(false);
    });

    eventSourceRef.current = eventSource;
  }, []);

  /**
   * Handle job completion
   */
  const handleJobCompleted = async (result: any, jobId: string) => {
    setIsLoading(false);

    // Validate result
    const validationResult = aiValidation.validate(result);

    setJobData((prev) => prev ? {
      ...prev,
      status: 'completed',
      progress: 100,
      result,
      validationResult,
    } : null);
  };

  /**
   * Handle job failure
   */
  const handleJobFailed = (error: string) => {
    setIsLoading(false);

    setJobData((prev) => prev ? {
      ...prev,
      status: 'failed',
      error,
    } : null);
  };

  /**
   * Retry a failed job
   */
  const retryJob = useCallback(async () => {
    if (!jobData || !jobData.jobId) return;

    try {
      setIsLoading(true);

      const response = await axios.post(`/api/ai/jobs/${jobData.jobId}/retry`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to retry job');
      }

      const { jobId, requestId } = response.data.data;

      // Reset job data
      setJobData({
        jobId,
        requestId,
        status: 'queued',
        progress: 0,
      });

      // Start SSE connection
      connectSSE(jobId);

    } catch (error: any) {
      console.error('Failed to retry job:', error);
      setJobData((prev) => prev ? {
        ...prev,
        error: error.response?.data?.message || error.message,
      } : null);
      setIsLoading(false);
    }
  }, [jobData, connectSSE]);

  /**
   * Cancel a running job
   */
  const cancelJob = useCallback(async () => {
    if (!jobData || !jobData.jobId) return;

    try {
      await axios.delete(`/api/ai/jobs/${jobData.jobId}`);

      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setJobData(null);
      setIsLoading(false);

    } catch (error: any) {
      console.error('Failed to cancel job:', error);
    }
  }, [jobData]);

  /**
   * Discard job data (cleanup)
   */
  const discardJob = useCallback(() => {
    // Close SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setJobData(null);
    setIsLoading(false);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    jobData,
    isLoading,
    startJob,
    retryJob,
    cancelJob,
    discardJob,
  };
};

/**
 * Map progress percentage to status
 */
function mapProgressToStatus(progress: number): AIJobStatus {
  if (progress === 0) return 'queued';
  if (progress < 30) return 'queued';
  if (progress < 80) return 'processing';
  if (progress < 100) return 'validating';
  return 'completed';
}
