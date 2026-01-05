
//import React from 'react';
import { lazy, Suspense } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
// @ts-ignore
import Dashboard from './pages/Dashboard';
// @ts-ignore
import Results from './pages/Results.tsx';
//import BenchmarkWorkspace from './pages/BenchmarkWorkspace';
// @ts-ignore
const BenchmarkWorkspace = lazy(() => import('./pages/BenchmarkWorkspace'));


function App() {
  return (
    <Router>
      <Suspense fallback={<div className="loading">Loading Workspace...</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workspace" element={<BenchmarkWorkspace />} />
          <Route path="/results/:id" element={<Results />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
