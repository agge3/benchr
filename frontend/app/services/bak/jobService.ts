import apiClient from './apiClient';
import {
  Job,
  SubmitJobRequest,
  SubmitJobResponse,
  JobListResponse,
  CurrentJobResponse,
  HealthResponse,
} from '../types/job.types';

export const jobService = {
  
  submitJob: async (request: SubmitJobRequest): Promise<SubmitJobResponse> => {
    const response = await apiClient.post<SubmitJobResponse>('/submit', request);
    return response.data;
  },

  getCurrentJob: async (): Promise<Job | null> => {
    const response = await apiClient.get<CurrentJobResponse>('/current');
    return response.data.job;
  },

  
  getJob: async (jobId: string): Promise<Job> => {
    const response = await apiClient.get<Job>(`/jobs/${jobId}`);
    return response













  listJobs: async (limit: number = 10): Promise<Job[]> => {
    const response = await apiClient.get<JobListResponse>('/jobs', {
      params: { limit },
    });
    return response.data.jobs;
  },

  // Health check
  checkHealth: async (): Promise<HealthResponse> => {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  },
  pollJobStatus: async (
    jobId: string,
    onUpdate?: (job: Job) => void,
    interval: number = 1000,
    maxAttempts: number = 60
  ): Promise<Job> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const poll = async () => {
        try {
          const job = await jobService.getJob(jobId);
          
          if (onUpdate) {
            onUpdate(job);
          }

          if (job.status === 'completed' || job.status === 'failed') {
            resolve(job);
            return;
          }

          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error('Polling timeout'));
            return;
          }

          setTimeout(poll, interval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  },
};
