'use client';

import React, { useState } from 'react';
import { Header } from './Header';
import { CodeEditor } from './Editor';
import { MetricCard } from './Metrics';
import { Footer } from './Footer';

export default function Dashboard() {
  const [code, setCode] = useState();

  const [metrics, setMetrics] = useState<Record<string, string | number> | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    try {
      // TODO: Replace with actual API call to your backend
      // const response = await fetch(`/api/jobs/${jobId}/run-benchmark`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ code })
      // });
      // const data = await response.json();
      // setMetrics(data.perf_metrics);

      // Simulated response for demo
      setTimeout(() => {
        setMetrics({
          executionTime: '1.23ms',
          memoryUsed: '2.5MB',
          efficiency: '98%',
          timestamp: new Date().toLocaleString()
        });
        setIsRunning(false);
      }, 1000);
    } catch (error) {
      console.error('Error running benchmark:', error);
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header isRunning={isRunning} onRunBenchmark={handleRunBenchmark} />
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 border-r border-gray-200 bg-white">
          <CodeEditor code={code} onChange={setCode} />
        </div>
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
          <MetricsPane metrics={metrics} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
