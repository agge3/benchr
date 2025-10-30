import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { jobService } from '../services/jobService';
import { Job } from '../types/job.types';

export default function JobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    loadJobs();
  }, [limit]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const jobsList = await jobService.listJobs(limit);
      setJobs(jobsList);
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Job History</h1>
        <div className="flex gap-4 items-center">
          <label>
            Show:
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="ml-2 border rounded px-2 py-1"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <button
            onClick={loadJobs}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse">Loading jobs...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2 text-left">Job ID</th>
                <th className="border p-2 text-left">Language</th>
                <th className="border p-2 text-left">Compiler</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Created</th>
                <th className="border p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.job_id} className="hover:bg-gray-50">
                  <td className="border p-2 font-mono text-sm">
                    {job.job_id.slice(0, 8)}...
                  </td>
                  <td className="border p-2">{job.language}</td>
                  <td className="border p-2">{job.compiler}</td>
                  <td className="border p-2">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        job.status === 'completed'
                          ? 'bg-green-200 text-green-800'
                          : job.status === 'failed'
                          ? 'bg-red-200 text-red-800'
                          : job.status === 'running'
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="border p-2 text-sm">
                    {new Date(job.created_at).toLocaleString()}
                  </td>
                  <td className="border p-2">
                    <Link
                      to={`/jobs/${job.job_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
