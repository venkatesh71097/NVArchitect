import { useState } from 'react';
import { Cpu, GitBranch, ShieldAlert } from 'lucide-react';
import './index.css';

import PromptToProd from './components/PromptToProd';
import ROISimulator from './components/ROISimulator';

function App() {
  const [activeModule, setActiveModule] = useState<'flow' | 'roi'>('flow');

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="top-nav">
        <div className="nav-brand">
          <Cpu color="#76b900" size={28} />
          <span>NVIDIA</span>
          <span className="brand-badge">Virtual SA</span>
        </div>

        <div className="nav-controls">
          <span style={{ fontSize: '12px', color: '#888', marginRight: '4px' }}>Powered by</span>
          <span style={{ fontSize: '14px', color: 'var(--nv-green)', fontWeight: 600 }}>NVIDIA NIM (Llama-3.3 70B)</span>
        </div>
      </header>

      {/* Module Tabs */}
      <div className="module-tabs">
        <button
          className={`tab-btn ${activeModule === 'flow' ? 'active' : ''}`}
          onClick={() => setActiveModule('flow')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <GitBranch size={18} />
          1. Discovery Accelerator
        </button>
        <button
          className={`tab-btn ${activeModule === 'roi' ? 'active' : ''}`}
          onClick={() => setActiveModule('roi')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ShieldAlert size={18} />
          2. ROI Simulator
        </button>
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        {activeModule === 'flow' && <PromptToProd />}
        {activeModule === 'roi' && <ROISimulator />}
      </main>
    </div>
  );
}

export default App;
