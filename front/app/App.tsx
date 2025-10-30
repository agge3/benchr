
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BenchmarkWorkspace from './pages/BenchmarkWorkspace';
import Dashboard from './pages/Dashboard';
import Results from './pages/Results';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workspace" element={<BenchmarkWorkspace />} />
        <Route path="/results/:id" element={<Results />} />
      </Routes>
    </Router>
  );
}

export default App;
