//Lazy loading the BenchmarkWorkspace component so TS
// stops crying. Delete it if you want.
import React from 'react';

const BenchmarkWorkspace = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Benchmark Workspace</h1>
      <p className="mt-2">Hi there :)</p>
    </div>
  );
};

export default BenchmarkWorkspace;
