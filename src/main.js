import './style.css';
import { SAMPLE_PROTEINS, INITIAL_HISTORY } from './data.js';
import { createMolecularViewer } from './molecule3d.js';

// Application State & Configuration
const API_BASE_URL = 'http://localhost:8000';

const state = {
  activeTab: 'home', // 'home' | 'predict' | 'history' | 'about' | 'quantum'
  predictStep: 1,    // 1: Input, 2: Representation, 3: Structure, 4: Binding-Site, 5: Docking, 6: Affinity, 7: Final
  structureViewMode: 'ribbon', // 'ribbon' | 'surface'
  selectedProteinKey: 'P00123',
  isAuthModalOpen: false,
  authMode: 'login', // 'login' | 'signup' | 'verify' | 'forgot' | 'reset'
  currentUser: null,
  sessionToken: localStorage.getItem('qbindai_session_token') || null,
  authVerificationEmail: '',
  authPendingCode: '',
  authError: null,
  authSuccess: null,
  authLoading: false,
  isUserMenuOpen: false,
  showPassword: false,
  isMobileMenuOpen: false,
  historyData: [...INITIAL_HISTORY],
  activeViewerInstance: null,
  activeSecondaryViewer: null,
  historyPage: 1,
  theme: localStorage.getItem('qbindai_theme') || 'light',
  selectedPocketSite: 'site_1',
  selectedDockingPose: 1,
  backendConnected: false,
  latestPredictionResult: null
};

// SVG Chemical Structure Drawer for Ligand (Coumarin derivative matching Image 2)
function renderLigandChemicalSVG() {
  return `
    <svg viewBox="0 0 340 140" width="100%" height="100%" style="max-height: 130px;">
      <!-- Coumarin core rings -->
      <g stroke="#0f172a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <!-- Benzene ring -->
        <polygon points="60,70 85,55 110,70 110,100 85,115 60,100" />
        <line x1="85" y1="62" x2="104" y2="73" stroke="#0f172a" stroke-width="1.8" />
        <line x1="104" y1="97" x2="85" y2="108" stroke="#0f172a" stroke-width="1.8" />
        <line x1="66" y1="97" x2="66" y2="73" stroke="#0f172a" stroke-width="1.8" />

        <!-- Pyranone / Lactone ring -->
        <line x1="110" y1="70" x2="135" y2="55" />
        <line x1="135" y1="55" x2="155" y2="70" />
        <line x1="155" y1="70" x2="155" y2="95" />
        <line x1="155" y1="105" x2="135" y2="115" />
        <line x1="135" y1="115" x2="110" y2="100" />
        
        <!-- Ester Oxygen -->
        <circle cx="155" cy="100" r="3" fill="#0f172a" />
        <circle cx="130" cy="118" r="2.5" fill="#0f172a" />

        <!-- Carbonyl =O -->
        <line x1="162" y1="46" x2="162" y2="60" stroke="#0f172a" stroke-width="2" />
        <line x1="166" y1="46" x2="166" y2="60" stroke="#0f172a" stroke-width="2" />

        <!-- Side-chain connecting to amide / carboxylic branch -->
        <line x1="155" y1="70" x2="185" y2="65" />
        <line x1="185" y1="65" x2="200" y2="45" />
        <line x1="200" y1="45" x2="200" y2="35" stroke-width="2.5" />
        <line x1="185" y1="65" x2="215" y2="75" stroke-dasharray="3,3" />
        
        <!-- Terminal group -->
        <circle cx="200" cy="35" r="3" fill="#0f172a" />
      </g>
      <!-- Labels -->
      <text x="195" y="28" font-family="'Inter', sans-serif" font-size="13" font-weight="700" fill="#0f172a">O</text>
      <text x="220" y="76" font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="#0f172a">OH,</text>
      <circle cx="155" cy="105" r="2.5" fill="#0f172a" />
      <circle cx="160" cy="115" r="2.5" fill="#0f172a" />
    </svg>
  `;
}

// Quantum Circuit SVG for Screen 7 (Binding Affinity & Refinement)
function renderQuantumCircuitSVG() {
  return `
    <svg class="circuit-svg" viewBox="0 0 460 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Qubit wire 0 -->
      <text x="20" y="58" font-family="'JetBrains Mono', monospace" font-size="17" font-weight="600" fill="#0f172a">|0⟩</text>
      <line x1="55" y1="52" x2="430" y2="52" stroke="#64748b" stroke-width="2" />

      <!-- Qubit wire 1 -->
      <text x="20" y="128" font-family="'JetBrains Mono', monospace" font-size="17" font-weight="600" fill="#0f172a">|0⟩</text>
      <line x1="55" y1="122" x2="430" y2="122" stroke="#64748b" stroke-width="2" />

      <!-- Hadamard Gate Q0 -->
      <rect x="80" y="32" width="38" height="40" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="2" />
      <text x="93" y="57" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="#0f172a">H</text>

      <!-- Hadamard Gate Q1 -->
      <rect x="80" y="102" width="38" height="40" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="2" />
      <text x="93" y="127" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="#0f172a">H</text>

      <!-- Entanglement Vertical Bridge -->
      <line x1="140" y1="52" x2="140" y2="122" stroke="#3b82f6" stroke-width="2" />
      <circle cx="140" cy="52" r="3.5" fill="#3b82f6" />
      <circle cx="140" cy="122" r="3.5" fill="#3b82f6" />

      <!-- Rz Gate Q0 -->
      <rect x="165" y="32" width="40" height="40" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="2" />
      <text x="175" y="57" font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="#0f172a">Rz</text>

      <!-- Rz Gate Q1 -->
      <rect x="165" y="102" width="40" height="40" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="2" />
      <text x="175" y="127" font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="#0f172a">Rz</text>

      <!-- Ry Gate Q0 -->
      <rect x="235" y="32" width="40" height="40" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="2" />
      <text x="245" y="57" font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="#0f172a">Ry</text>

      <!-- Ry Gate Q1 -->
      <rect x="235" y="102" width="40" height="40" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="2" />
      <text x="245" y="127" font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="#0f172a">Ry</text>

      <!-- Controlled Entangling Line -->
      <line x1="298" y1="52" x2="298" y2="122" stroke="#1d4ed8" stroke-width="2" />
      <circle cx="298" cy="52" r="3" fill="#1d4ed8" />

      <!-- Second Ry Gate Q0 -->
      <rect x="320" y="32" width="40" height="40" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="2" />
      <text x="330" y="57" font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="#0f172a">Ry</text>

      <!-- Measurement / Convergence Arrow -->
      <path d="M 360 122 L 395 122 M 395 52 L 395 122 L 415 122" stroke="#1e3a8a" stroke-width="2.5" fill="none" />
      <polygon points="415,118 425,122 415,126" fill="#1e3a8a" />
    </svg>
  `;
}

// Graph Neural Network Visual for Screen 7
function renderGNNNetworkSVG() {
  return `
    <svg viewBox="0 0 320 220" width="100%" height="200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </radialGradient>
      </defs>
      <!-- Edges -->
      <g stroke="#94a3b8" stroke-width="2" stroke-linecap="round">
        <line x1="70" y1="110" x2="120" y2="60" />
        <line x1="70" y1="110" x2="110" y2="170" />
        <line x1="120" y1="60" x2="175" y2="90" />
        <line x1="120" y1="60" x2="140" y2="140" />
        <line x1="110" y1="170" x2="140" y2="140" />
        <line x1="110" y1="170" x2="170" y2="180" />
        <line x1="140" y1="140" x2="200" y2="135" stroke="#2563eb" stroke-width="2.5" />
        <line x1="175" y1="90" x2="200" y2="135" stroke="#2563eb" stroke-width="2.5" />
        <line x1="170" y1="180" x2="200" y2="135" />
        <line x1="200" y1="135" x2="250" y2="135" stroke="#059669" stroke-width="3" stroke-dasharray="4,4" />
      </g>
      <!-- Nodes -->
      <circle cx="70" cy="110" r="14" fill="#ffffff" stroke="#1d4ed8" stroke-width="3" />
      <circle cx="120" cy="60" r="14" fill="#ffffff" stroke="#1d4ed8" stroke-width="3" />
      <circle cx="110" cy="170" r="14" fill="#ffffff" stroke="#1d4ed8" stroke-width="3" />
      <circle cx="140" cy="140" r="16" fill="#ffffff" stroke="#1d4ed8" stroke-width="3" />
      <circle cx="175" cy="90" r="13" fill="#ffffff" stroke="#f59e0b" stroke-width="3" />
      <circle cx="170" cy="180" r="12" fill="#ffffff" stroke="#f59e0b" stroke-width="3" />
      
      <!-- Key embedding readout node -->
      <circle cx="200" cy="135" r="17" fill="#1e293b" stroke="#38bdf8" stroke-width="3" />
      <text x="195" y="141" font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="#ffffff">S</text>

      <path d="M 235 125 L 255 135 L 235 145" fill="#059669" />
    </svg>
  `;
}

// Top Navbar Template (Strictly matching Images 1 - 11)
function renderNavbar() {
  const isPredictActive = state.activeTab === 'predict';
  return `
    <nav class="navbar">
      <div class="nav-brand" id="brand-logo-btn">
        <div class="brand-icon-wrapper">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="M3.6 9h16.8"/>
            <path d="M3.6 15h16.8"/>
            <path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z"/>
          </svg>
        </div>
        <span class="brand-text">QBindAI</span>
      </div>

      <ul class="nav-links ${state.isMobileMenuOpen ? 'open' : ''}" id="nav-links-list">
        <li class="nav-item">
          <a class="nav-link ${state.activeTab === 'home' ? 'active' : ''}" data-nav="home">Home</a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${isPredictActive ? 'active' : ''}" data-nav="predict">Predict</a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${state.activeTab === 'quantum' ? 'active' : ''}" data-nav="quantum">Quantum</a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${state.activeTab === 'history' ? 'active' : ''}" data-nav="history">History</a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${state.activeTab === 'about' ? 'active' : ''}" data-nav="about">About</a>
        </li>
      </ul>

      <div class="nav-actions">
        <!-- Dark / Light Theme Toggle Button -->
        <button class="theme-toggle-btn" id="theme-toggle-btn" title="Switch to ${state.theme === 'dark' ? 'Light' : 'Dark'} Mode" aria-label="Toggle Theme">
          ${state.theme === 'dark' ? `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ` : `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          `}
        </button>

        <!-- User Account / Sign In Component -->
        ${state.currentUser ? `
          <div class="user-nav-dropdown-container">
            <button class="user-pill-btn" id="user-profile-menu-btn" title="Account Menu">
              <span class="user-avatar-initials">${(state.currentUser.full_name || 'U').split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase()}</span>
              <span class="user-nav-name">${(state.currentUser.full_name || 'Researcher').split(' ')[0]}</span>
              ${state.currentUser.is_verified ? '<span class="nav-verified-badge" title="Verified Account">✓</span>' : '<span class="nav-unverified-dot" title="Unverified Email">!</span>'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <div class="user-dropdown-menu ${state.isUserMenuOpen ? 'open' : ''}" id="user-dropdown-menu">
              <div class="user-dropdown-header">
                <div class="user-dropdown-name">${state.currentUser.full_name}</div>
                <div class="user-dropdown-email">${state.currentUser.email}</div>
                <div class="user-dropdown-badges">
                  <span class="user-role-badge">${state.currentUser.role || 'Researcher'}</span>
                  ${state.currentUser.is_verified ? 
                    '<span class="user-verified-badge">✓ Verified</span>' : 
                    '<span class="user-unverified-badge" id="dropdown-verify-btn">Verify Email</span>'}
                </div>
              </div>
              <div class="user-dropdown-divider"></div>
              <button class="user-dropdown-item" id="dropdown-history-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Prediction History</span>
              </button>
              <button class="user-dropdown-item" id="dropdown-new-pred-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>New Prediction</span>
              </button>
              <div class="user-dropdown-divider"></div>
              <button class="user-dropdown-item logout" id="dropdown-logout-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ` : `
          <button class="user-btn" id="open-auth-btn" title="Sign In / Register">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="sign-in-text" style="margin-left: 0.35rem; font-size: 0.88rem; font-weight: 600;">Sign In</span>
          </button>
        `}
        <button class="mobile-menu-toggle" id="mobile-toggle-btn" aria-label="Toggle Menu">
          ${state.isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  `;
}

// Stepper bar for the Predict pipeline (Screens 2 through 8)
function renderPredictStepper() {
  const steps = [
    { num: 1, name: 'Input', title: 'Protein Input' },
    { num: 2, name: 'Representation', title: 'ESM-2 Embeddings' },
    { num: 3, name: 'Structure', title: 'AlphaFold 3 / ESMFold' },
    { num: 4, name: 'Binding-Site', title: 'GNN / GAT Pocket' },
    { num: 5, name: 'Docking', title: 'AutoDock Vina / DiffDock' },
    { num: 6, name: 'Affinity', title: 'Quantum VQE / QNN' },
    { num: 7, name: 'Final', title: 'Final Prediction' }
  ];

  return `
    <div class="predict-stepper-bar">
      ${steps.map((s, idx) => `
        <div class="step-indicator ${state.predictStep === s.num ? 'active' : ''} ${state.predictStep > s.num ? 'completed' : ''}" data-step="${s.num}">
          <span class="step-number-badge">${state.predictStep > s.num ? '✓' : s.num}</span>
          <span>${s.name}</span>
        </div>
        ${idx < steps.length - 1 ? '<span class="step-chevron">→</span>' : ''}
      `).join('')}
    </div>
  `;
}

// Screen 1: Home Page (Strict Match to Image 1 & 12)
function renderHomeView() {
  return `
    <div class="home-view">
      <div class="hero-section">
        <div class="hero-left">
          <h1 class="hero-title">
            Quantum AI/ML for
            <span class="gradient-cyan">Protein Structure and</span>
            <span class="gradient-magenta">Binding-Site Prediction</span>
          </h1>
          <p class="hero-subtitle">
            Combining classical AI/ML with quantum computing to predict protein folding and ligand binding with higher accuracy and efficiency.
          </p>
          <div class="hero-cta-group">
            <button class="btn-primary" id="home-start-prediction-btn">
              Start Prediction →
            </button>
            <button class="btn-outline" id="home-learn-more-btn">
              Learn More
            </button>
          </div>
        </div>

        <div class="hero-visual-card">
          <div class="hero-3d-canvas-container" id="hero-molecule-canvas"></div>
        </div>
      </div>

      <!-- Available Platform Options & Capabilities Section -->
      <section class="home-options-section" id="platform-options">
        <div class="home-options-header">
          <span class="home-options-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Platform Capabilities
          </span>
          <h2 class="home-options-title">Available Tools & Prediction Options</h2>
          <p class="home-options-subtitle">
            Explore our end-to-end pipeline combining evolutionary protein language models, geometric graph neural networks, and quantum variational algorithms.
          </p>
        </div>

        <div class="options-grid">
          <!-- Option 1: Protein & Ligand Input -->
          <div class="option-card" data-nav-target="predict" data-step-target="1" title="Launch Protein & Ligand Input">
            <div class="option-card-top">
              <div class="option-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <span class="option-step-tag">Step 01</span>
            </div>
            <div class="option-card-content">
              <h3 class="option-card-title">Protein & Ligand Input</h3>
              <p class="option-card-desc">
                Input FASTA sequences, upload sequence files, select benchmark targets (EGFR, Mpro, CDK2), and specify ligand SMILES.
              </p>
            </div>
            <div class="option-card-action">
              <span>Enter Sequence</span>
              <span>→</span>
            </div>
          </div>

          <!-- Option 2: ESM-2 Representation -->
          <div class="option-card" data-nav-target="predict" data-step-target="2" title="Inspect ESM-2 Representation">
            <div class="option-card-top">
              <div class="option-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                  <rect x="9" y="9" width="6" height="6"/>
                  <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>
                </svg>
              </div>
              <span class="option-step-tag">Step 02</span>
            </div>
            <div class="option-card-content">
              <h3 class="option-card-title">ESM-2 Embeddings</h3>
              <p class="option-card-desc">
                Convert amino acid sequences into rich 1280-dimensional evolutionary embeddings with attention maps and residue vectors.
              </p>
            </div>
            <div class="option-card-action">
              <span>View Embeddings</span>
              <span>→</span>
            </div>
          </div>

          <!-- Option 3: 3D Structure Prediction -->
          <div class="option-card" data-nav-target="predict" data-step-target="3" title="Inspect 3D Structure Prediction">
            <div class="option-card-top">
              <div class="option-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <span class="option-step-tag">Step 03</span>
            </div>
            <div class="option-card-content">
              <h3 class="option-card-title">3D Structure Folding</h3>
              <p class="option-card-desc">
                ESMFold & AlphaFold 3 deep learning 3D folding with pLDDT confidence (92.4%), Ribbon, Surface, and Cartoon visualization.
              </p>
            </div>
            <div class="option-card-action">
              <span>Inspect 3D Model</span>
              <span>→</span>
            </div>
          </div>

          <!-- Option 4: Binding-Site Detection -->
          <div class="option-card" data-nav-target="predict" data-step-target="4" title="Inspect Binding-Site Detection">
            <div class="option-card-top">
              <div class="option-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="4"/>
                  <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/>
                  <line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/>
                  <line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/>
                  <line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>
                </svg>
              </div>
              <span class="option-step-tag">Step 04</span>
            </div>
            <div class="option-card-content">
              <h3 class="option-card-title">Binding-Site Detection</h3>
              <p class="option-card-desc">
                Graph Attention Networks (GAT) identify active binding pockets, evaluate druggability, and isolate catalytic residues.
              </p>
            </div>
            <div class="option-card-action">
              <span>Detect Pockets</span>
              <span>→</span>
            </div>
          </div>

          <!-- Option 5: Molecular Docking -->
          <div class="option-card" data-nav-target="predict" data-step-target="5" title="Inspect Molecular Docking">
            <div class="option-card-top">
              <div class="option-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
              <span class="option-step-tag">Step 05</span>
            </div>
            <div class="option-card-content">
              <h3 class="option-card-title">Molecular Docking</h3>
              <p class="option-card-desc">
                Simulate ligand poses via AutoDock Vina & DiffDock, ranking conformations by affinity (kcal/mol) and RMSD clustering.
              </p>
            </div>
            <div class="option-card-action">
              <span>View Docking Poses</span>
              <span>→</span>
            </div>
          </div>

          <!-- Option 6: Quantum VQE Refinement -->
          <div class="option-card" data-nav-target="predict" data-step-target="6" title="Inspect Quantum VQE Refinement">
            <div class="option-card-top">
              <div class="option-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)"/>
                  <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/>
                  <circle cx="12" cy="12" r="2.5"/>
                </svg>
              </div>
              <span class="option-step-tag">Step 06</span>
            </div>
            <div class="option-card-content">
              <h3 class="option-card-title">Quantum VQE Refinement</h3>
              <p class="option-card-desc">
                Variational Quantum Eigensolver (VQE) algorithm calculates ground-state energy landscapes for quantum-accurate binding affinities.
              </p>
            </div>
            <div class="option-card-action">
              <span>Simulate VQE</span>
              <span>→</span>
            </div>
          </div>

          <!-- Option 7: Final Consensus Prediction -->
          <div class="option-card" data-nav-target="predict" data-step-target="7" title="Inspect Final Consensus Prediction">
            <div class="option-card-top">
              <div class="option-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <span class="option-step-tag">Step 07</span>
            </div>
            <div class="option-card-content">
              <h3 class="option-card-title">Consensus Scoring</h3>
              <p class="option-card-desc">
                Integrated hybrid score combining classical GNN and quantum energy with nanomolar Ki inhibition predictions and PDF export.
              </p>
            </div>
            <div class="option-card-action">
              <span>Review Results</span>
              <span>→</span>
            </div>
          </div>

          <!-- Option 8: Prediction History Archive -->
          <div class="option-card" data-nav-target="history" data-step-target="1" title="Browse Prediction History">
            <div class="option-card-top">
              <div class="option-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <span class="option-step-tag">Database</span>
            </div>
            <div class="option-card-content">
              <h3 class="option-card-title">Prediction History</h3>
              <p class="option-card-desc">
                Search, filter, and review previously executed predictions saved in SQLite with timestamps, affinities, and pocket records.
              </p>
            </div>
            <div class="option-card-action">
              <span>Open History</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

// Screen 2: Protein Input Page (Strict Match to Image 2)
function renderProteinInputView() {
  const currentProtein = SAMPLE_PROTEINS[state.selectedProteinKey] || SAMPLE_PROTEINS.P00123;
  return `
    <div class="light-page-wrapper">
      <div class="page-container">
        ${renderPredictStepper()}

        <header class="page-header">
          <h2 class="page-title">Protein Input</h2>
          <p class="page-subtitle">Provide a protein sequence and ligand molecule to start the prediction.</p>
        </header>

        <div class="two-card-grid">
          <!-- Left Card: Protein Sequence (FASTA) -->
          <div class="panel-card">
            <h3 class="panel-title">Protein Sequence (FASTA)</h3>
            <textarea class="fasta-textarea" id="fasta-input" spellcheck="false">${currentProtein.fasta}</textarea>
            
            <input type="file" id="fasta-file-upload" accept=".fasta,.txt" style="display:none;" />
            <button class="upload-button-styled" id="trigger-fasta-upload">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload FASTA file
            </button>
            <span class="helper-caption">Example: .fasta, txt</span>
          </div>

          <!-- Right Card: Ligand Molecule -->
          <div class="panel-card">
            <h3 class="panel-title">Ligand Molecule</h3>
            <div class="chem-preview-box">
              ${renderLigandChemicalSVG()}
            </div>

            <div class="smiles-input-group">
              <label class="input-sublabel">SMILES / MOL / SDF</label>
              <input type="text" class="styled-text-input" id="smiles-input" value="${currentProtein.defaultSmiles}" />
            </div>

            <input type="file" id="ligand-file-upload" accept=".sdf,.mol,.pdb" style="display:none;" />
            <button class="upload-button-styled" id="trigger-ligand-upload">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload Ligand File
            </button>
            <span class="helper-caption">SDF / MOL / PDB</span>
          </div>
        </div>

        <div class="cta-button-row" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <button class="btn-run-prediction" id="run-prediction-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Run Prediction (Full 9-Step Pipeline) →
          </button>
          <button class="btn-step-nav btn-step-next" id="next-to-representation-btn">
            Next: ESM-2 Representation →
          </button>
        </div>
      </div>
    </div>
  `;
}

// Screen 3: Protein Representation Page (Step 3 - ESM-2)
function renderProteinRepresentationView() {
  const currentProtein = SAMPLE_PROTEINS[state.selectedProteinKey] || SAMPLE_PROTEINS.P00123;
  return `
    <div class="light-page-wrapper">
      <div class="page-container">
        ${renderPredictStepper()}

        <!-- Step 3 Architecture Flow Breadcrumb -->
        <div class="flow-breadcrumb-bar">
          <span class="flow-step-tag">FASTA</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag active">ESM-2</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">768/1280-dimensional Embedding</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">Feature Visualization / GNN</span>
          <span style="margin-left: auto;">
            <span class="model-status-pill">Model status: ✓ Completed</span>
          </span>
        </div>

        <header class="page-header">
          <h2 class="page-title">Protein Representation</h2>
          <p class="page-subtitle">ESM-2 converts the protein sequence into high-dimensional numerical embeddings for downstream geometric learning.</p>
        </header>

        <div class="two-card-grid">
          <!-- Left: Protein Structure (from sequence) -->
          <div class="panel-card">
            <h3 class="panel-title">Protein Structure (from sequence)</h3>
            <div class="canvas-3d-box" id="representation-molecule-canvas"></div>
          </div>

          <!-- Right: Sequence Embeddings & Feature Vectors -->
          <div class="panel-card">
            <h3 class="panel-title">Sequence Embeddings (768/1280-dim)</h3>
            
            <div class="embeddings-container">
              <div class="heatmap-wrapper">
                <div class="heatmap-grid" id="heatmap-cells-container"></div>
                <div class="heatmap-scale-bar">
                  <span>100</span>
                  <div class="scale-gradient"></div>
                  <span>0</span>
                </div>
              </div>

              <div>
                <h4 class="input-sublabel" style="font-size: 0.95rem; margin-bottom: 0.5rem;">Sample Feature Vectors (Extracted from Transformer Layers)</h4>
                <div class="feature-vectors-row">
                  ${currentProtein.featureVectors.map(v => `<span class="vector-chip">${v}</span>`).join('')}
                  <span class="vector-chip">...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Banner: ESM-2 -->
        <div class="model-info-banner">
          <div class="model-badge-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
          </div>
          <div class="model-info-text">
            <h4 class="model-info-title">Model: ESM-2 (650M / 3B)</h4>
            <p class="model-info-desc">Evolutionary Scale Modeling protein language model • Output: 1280-dim embedding matrix • Status: ✓ Completed</p>
          </div>
        </div>

        <!-- Step Navigation Footer -->
        <div class="step-navigation-row">
          <button class="btn-step-nav btn-step-prev">
            ← Previous: Protein Input
          </button>
          <button class="btn-step-nav btn-step-next">
            Next: 3D Structure Prediction →
          </button>
        </div>
      </div>
    </div>
  `;
}

// Screen 4: Structure Prediction Page (Step 4 - ESMFold / AlphaFold)
function renderStructurePredictionView() {
  return `
    <div class="light-page-wrapper">
      <div class="page-container">
        ${renderPredictStepper()}

        <!-- Step 4 Architecture Flow Breadcrumb -->
        <div class="flow-breadcrumb-bar">
          <span class="flow-step-tag">FASTA</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag active">ESMFold / AlphaFold</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">3D Protein Structure</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">PDB File</span>
          <span style="margin-left: auto;">
            <span class="model-status-pill">Confidence: 92.4% (pLDDT)</span>
          </span>
        </div>

        <header class="page-header">
          <h2 class="page-title">Predicted Protein Structure</h2>
          <p class="page-subtitle">3D atomic coordinate generation via ESMFold / AlphaFold 3 with interactive geometric representations.</p>
        </header>

        <div class="two-card-grid">
          <!-- Left: 3D Protein Canvas -->
          <div class="panel-card">
            <div class="canvas-3d-box" id="structure-molecule-canvas"></div>
          </div>

          <!-- Right: Controls & Download -->
          <div class="panel-card" style="justify-content: flex-start;">
            <label class="input-sublabel" style="font-size: 0.98rem; font-weight: 700; margin-bottom: 0.6rem;">Predicted Structure View Mode</label>
            <div class="segmented-control">
              <button class="seg-btn ${state.structureViewMode === 'ribbon' ? 'active' : ''}" id="view-mode-ribbon-btn">Ribbon</button>
              <button class="seg-btn ${state.structureViewMode === 'surface' ? 'active' : ''}" id="view-mode-surface-btn">Surface</button>
              <button class="seg-btn ${state.structureViewMode === 'cartoon' ? 'active' : ''}" id="view-mode-cartoon-btn">Cartoon</button>
            </div>

            <div style="margin-bottom: 1.5rem;">
              <label class="input-sublabel" style="font-size: 0.98rem; font-weight: 700; margin-bottom: 0.6rem;">Prediction Model & Accuracy</label>
              <input type="text" class="styled-text-input" value="Model: ESMFold / AlphaFold 3  |  Confidence: 92.4%" readonly style="background:#ffffff; font-weight:600; font-family:var(--font-sans);" />
            </div>

            <button class="btn-download-pdb" id="download-pdb-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download PDB File
            </button>
          </div>
        </div>

        <!-- Bottom Banner: AlphaFold 3 / ESMFold -->
        <div class="model-info-banner">
          <div class="model-badge-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div class="model-info-text">
            <h4 class="model-info-title">Model: ESMFold / AlphaFold 3</h4>
            <p class="model-info-desc">Single-sequence end-to-end atomic coordinates • Mean pLDDT: 92.4% (Very High Confidence)</p>
          </div>
        </div>

        <!-- Step Navigation Footer -->
        <div class="step-navigation-row">
          <button class="btn-step-nav btn-step-prev">
            ← Previous: ESM-2 Representation
          </button>
          <button class="btn-step-nav btn-step-next">
            Next: Binding-Site Prediction →
          </button>
        </div>
      </div>
    </div>
  `;
}

// Screen 5: Binding-Site Prediction Page (Step 5 - GNN / GAT)
function renderBindingSiteView() {
  const sites = [
    { id: 'site_1', name: 'Site 1 (Active Cavity)', score: '0.92', barPct: '92%', vol: '486.2 Å³', residues: 'TYR102, PHE103, LEU106, VAL109', probBar: '██████████' },
    { id: 'site_2', name: 'Site 2 (Allosteric Pocket)', score: '0.76', barPct: '76%', vol: '342.1 Å³', residues: 'GLU81, LYS83, ASP145', probBar: '████████' },
    { id: 'site_3', name: 'Site 3 (Secondary Cleft)', score: '0.63', barPct: '63%', vol: '289.4 Å³', residues: 'MET793, THR790, CYS797', probBar: '██████' }
  ];

  const currentSite = sites.find(s => s.id === state.selectedPocketSite) || sites[0];

  return `
    <div class="light-page-wrapper">
      <div class="page-container">
        ${renderPredictStepper()}

        <!-- Step 5 Architecture Flow Breadcrumb -->
        <div class="flow-breadcrumb-bar">
          <span class="flow-step-tag">3D Protein</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">Residue/Atom Graph</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag active">GNN / GAT</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">Binding-Site Probability</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">Top Predicted Pockets</span>
          <span style="margin-left: auto;">
            <span class="model-status-pill">Active Target: ${currentSite.name.split(' ')[0]} ${currentSite.name.split(' ')[1]} (${currentSite.score})</span>
          </span>
        </div>

        <header class="page-header">
          <h2 class="page-title">Binding-Site Prediction</h2>
          <p class="page-subtitle">3D protein atom graph processed by Graph Attention Networks (GAT) to compute residue binding probabilities and rank binding pockets.</p>
        </header>

        <div class="two-card-grid">
          <!-- Left: Pocket Surface with probability colors -->
          <div class="panel-card" style="position: relative;">
            <h3 class="panel-title">Ligand Binding Pocket (3D Surface) — ${currentSite.name}</h3>
            
            <div class="pocket-legend-wrapper">
              <div class="legend-item">
                <span class="legend-dot red"></span>
                <span>High probability (&gt;0.85)</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot orange"></span>
                <span>Medium (0.50 - 0.85)</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot grey"></span>
                <span>Low (&lt;0.50)</span>
              </div>
            </div>

            <div class="canvas-3d-box" id="pocket-molecule-canvas"></div>
          </div>

          <!-- Right: Ranked Binding Sites -->
          <div class="panel-card">
            <h3 class="panel-title">Binding Site (Top Predicted Pockets)</h3>
            
            <div class="pockets-list-container">
              ${sites.map(s => `
                <div class="pocket-site-card ${state.selectedPocketSite === s.id ? 'active' : ''}" data-pocket-id="${s.id}">
                  <div class="pocket-site-header">
                    <span class="pocket-site-name">${s.name}</span>
                    <span class="pocket-site-score">${s.score} <span style="font-size:0.75rem; color:#1d68f0; font-family:var(--font-mono); font-weight:700;">${s.probBar}</span></span>
                  </div>
                  <div class="probability-bar-track">
                    <div class="probability-bar-fill" style="width: ${s.barPct};"></div>
                  </div>
                  <div class="pocket-site-meta">
                    <strong>Residues:</strong> ${s.residues} • <strong>Volume:</strong> ${s.vol}
                  </div>
                </div>
              `).join('')}
            </div>

            <div style="margin-top: 1rem;">
              <h4 class="input-sublabel" style="margin-bottom:0.4rem;">Binding Site Cavity Zoom (${currentSite.name})</h4>
              <div class="canvas-3d-box" style="height: 140px; min-height: 140px;" id="pocket-zoomed-canvas"></div>
            </div>
          </div>
        </div>

        <!-- Bottom Banner: GNN / GAT -->
        <div class="model-info-banner">
          <div class="model-badge-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="4"/>
              <line x1="12" y1="2" x2="12" y2="4"/>
              <line x1="12" y1="20" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="4" y2="12"/>
              <line x1="20" y1="12" x2="22" y2="12"/>
            </svg>
          </div>
          <div class="model-info-text">
            <h4 class="model-info-title">Model: GNN / GAT (Graph Attention Network)</h4>
            <p class="model-info-desc">Residue-level pocket detection • Top Site 1 probability: 0.92 • Selected: ${currentSite.name}</p>
          </div>
        </div>

        <!-- Step Navigation Footer -->
        <div class="step-navigation-row">
          <button class="btn-step-nav btn-step-prev">
            ← Previous: Structure Prediction
          </button>
          <button class="btn-step-nav btn-step-next">
            Next: Molecular Docking →
          </button>
        </div>
      </div>
    </div>
  `;
}

// Screen 6: Molecular Docking Page (Step 6 - AutoDock Vina / DiffDock)
function renderMolecularDockingView() {
  const poses = [
    { id: 1, label: 'Pose 1 (Primary)', affinity: '-9.8 kcal/mol', rmsd: '0.00 Å', desc: 'Lowest energy conformation (Best Pose)' },
    { id: 2, label: 'Pose 2 (Rotamer A)', affinity: '-8.7 kcal/mol', rmsd: '1.42 Å', desc: 'Alternative amide flipped orientation' },
    { id: 3, label: 'Pose 3 (Rotamer B)', affinity: '-8.1 kcal/mol', rmsd: '2.15 Å', desc: 'Shifted aromatic ring position' },
    { id: 4, label: 'Pose 4 (Peripheral)', affinity: '-7.6 kcal/mol', rmsd: '2.88 Å', desc: 'Outer pocket edge interaction' }
  ];

  const currentPose = poses.find(p => p.id === state.selectedDockingPose) || poses[0];

  return `
    <div class="light-page-wrapper">
      <div class="page-container">
        ${renderPredictStepper()}

        <!-- Step 6 Architecture Flow Breadcrumb -->
        <div class="flow-breadcrumb-bar">
          <span class="flow-step-tag">Protein + Ligand</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag active">AutoDock Vina / DiffDock</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">Multiple Binding Poses</span>
          <span style="margin-left: auto;">
            <span class="model-status-pill">Selected Pose: ${currentPose.label.split(' ')[0]} ${currentPose.label.split(' ')[1]} (${currentPose.affinity})</span>
          </span>
        </div>

        <header class="page-header">
          <h2 class="page-title">Molecular Docking</h2>
          <p class="page-subtitle">AutoDock Vina / DiffDock performs conformational sampling to explore multiple binding poses and receptor interactions.</p>
        </header>

        <div class="two-card-grid">
          <!-- Left: Docked Surface -->
          <div class="panel-card">
            <h3 class="panel-title">Ligand in Receptor Pocket (Pose ${state.selectedDockingPose})</h3>
            <div class="canvas-3d-box" id="docking-molecule-canvas"></div>
          </div>

          <!-- Right: Multiple Poses & Best Pose Zoomed -->
          <div class="panel-card" style="position: relative;">
            <h3 class="panel-title">Docking Results (Select Pose 1, Pose 2, Pose 3, Pose 4...)</h3>

            <!-- Multiple Binding Poses Grid -->
            <div class="poses-grid">
              ${poses.map(p => `
                <div class="pose-card-btn ${state.selectedDockingPose === p.id ? 'active' : ''}" data-pose-id="${p.id}">
                  <span class="pose-label">${p.label}</span>
                  <span class="pose-affinity">${p.affinity}</span>
                  <span class="pose-rmsd">RMSD: ${p.rmsd}</span>
                </div>
              `).join('')}
            </div>

            <div style="position: relative; flex: 1; min-height: 200px;">
              <h4 class="input-sublabel" style="margin-bottom:0.4rem;">Pose Interaction Zoom (Active Residue Contacts)</h4>
              <div class="canvas-3d-box" style="min-height: 190px;" id="docking-zoomed-canvas"></div>
              
              <!-- Residue Tags matching Image 6 -->
              <div class="docking-zoomed-overlay">
                <div class="residue-tag" style="top: 25%; right: 18%;">TYR102 (2.8Å)</div>
                <div class="residue-tag" style="top: 42%; right: 15%;">PHE103 (3.4Å)</div>
                <div class="residue-tag" style="top: 60%; right: 16%;">LEU106 (3.9Å)</div>
                <div class="residue-tag" style="top: 78%; right: 19%;">VAL109 (3.1Å)</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Banner: AutoDock Vina / DiffDock -->
        <div class="model-info-banner">
          <div class="model-badge-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="10" rx="2"/>
              <circle cx="12" cy="5" r="3"/>
              <path d="M12 8v3"/>
            </svg>
          </div>
          <div class="model-info-text">
            <h4 class="model-info-title">Model: AutoDock Vina / DiffDock</h4>
            <p class="model-info-desc">Rigid & flexible docking sampling • Pose 1 Best Affinity: -9.8 kcal/mol (RMSD: 0.00 Å)</p>
          </div>
        </div>

        <!-- Step Navigation Footer -->
        <div class="step-navigation-row">
          <button class="btn-step-nav btn-step-prev">
            ← Previous: Binding-Site Prediction
          </button>
          <button class="btn-step-nav btn-step-next">
            Next: Affinity & Quantum Refinement →
          </button>
        </div>
      </div>
    </div>
  `;
}

// Screen 7: Binding Affinity & Refinement Page (Step 7 & 8 - EGNN/SchNet + Quantum VQE)
function renderAffinityRefinementView() {
  return `
    <div class="light-page-wrapper">
      <div class="page-container">
        ${renderPredictStepper()}

        <!-- Step 7 & 8 Architecture Flow Breadcrumb -->
        <div class="flow-breadcrumb-bar">
          <span class="flow-step-tag">Active Binding Site</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">Select Active Region (TYR102, PHE103, LEU106, VAL109)</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">Truncated Hamiltonian</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag active">VQE / QNN</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">ML Refinement</span>
          <span style="margin-left: auto;">
            <span class="model-status-pill">Hybrid VQE Refinement: ΔE = -0.35 kcal/mol</span>
          </span>
        </div>

        <header class="page-header">
          <h2 class="page-title">Binding Affinity & Refinement</h2>
          <p class="page-subtitle">Classical Equivariant GNN (EGNN / SchNet) combined with Variational Quantum Eigensolver (VQE) on the active pocket cleft.</p>
        </header>

        <!-- Step 8: Variational Quantum Expectation Banner -->
        <div class="vqe-equation-banner">
          <div>
            <span style="font-size: 0.85rem; font-weight: 700; color: #1d68f0; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">
              Active Pocket Variational Principle
            </span>
            <div class="vqe-math-expr">
              E(θ) = ⟨ψ(θ)| Ĥ<sub>active</sub> |ψ(θ)⟩
            </div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.82rem; color: var(--color-text-muted);">Classical Optimizer (COBYLA/SPSA) Minimization:</span>
            <div class="vqe-convergence-strip">
              <span class="convergence-pill">-8.90</span>
              <span style="color:#64748b;">➔</span>
              <span class="convergence-pill">-9.25</span>
              <span style="color:#64748b;">➔</span>
              <span class="convergence-pill">-9.51</span>
              <span style="color:#64748b;">➔</span>
              <span class="convergence-pill">-9.68</span>
              <span style="color:#64748b;">➔</span>
              <span class="convergence-pill final">-9.80 kcal/mol ✓</span>
            </div>
          </div>
        </div>

        <div class="two-card-grid">
          <!-- Left: GNN / SchNet (Step 7) -->
          <div class="panel-card">
            <h3 class="panel-title" style="text-align: left;">Step 7 — Classical GNN / SchNet</h3>
            <div class="gnn-visual-container">
              ${renderGNNNetworkSVG()}
              <div class="affinity-subtext">EGNN Equivariant Affinity Prediction</div>
            </div>
            
            <div class="hybrid-breakdown-card" style="margin-top: 0.8rem;">
              <div class="hybrid-metric-row">
                <span class="hybrid-metric-label">Input Features:</span>
                <span class="hybrid-metric-val" style="font-size:0.82rem;">Protein + Ligand + Interaction</span>
              </div>
              <div class="hybrid-metric-row">
                <span class="hybrid-metric-label">Classical Base Prediction:</span>
                <span class="hybrid-metric-val" style="color:#1d68f0;">-9.45 kcal/mol</span>
              </div>
              <div class="hybrid-metric-row">
                <span class="hybrid-metric-label">Prediction Confidence:</span>
                <span class="hybrid-metric-val" style="color:#10b981;">High</span>
              </div>
            </div>
          </div>

          <!-- Right: VQE / QNN Quantum Circuit (Step 8) -->
          <div class="panel-card">
            <h3 class="panel-title" style="text-align: left;">Step 8 — Quantum VQE Active Region</h3>
            <div class="quantum-circuit-container">
              ${renderQuantumCircuitSVG()}
              <div class="quantum-subtext">PennyLane / Qiskit Hardware-Efficient Ansatz</div>
            </div>

            <div class="hybrid-breakdown-card" style="margin-top: 0.8rem;">
              <div class="hybrid-metric-row">
                <span class="hybrid-metric-label">Active Pocket Residues:</span>
                <div class="active-region-tags">
                  <span class="residue-active-tag">TYR102</span>
                  <span class="residue-active-tag">PHE103</span>
                  <span class="residue-active-tag">LEU106</span>
                  <span class="residue-active-tag">VAL109</span>
                </div>
              </div>
              <div class="hybrid-metric-row">
                <span class="hybrid-metric-label">Truncated Hamiltonian:</span>
                <span class="hybrid-metric-val" style="font-size:0.82rem;">4 Qubits (Pauli-Z/X strings)</span>
              </div>
              <div class="hybrid-metric-row">
                <span class="hybrid-metric-label">Quantum Energy Delta (ΔE):</span>
                <span class="hybrid-metric-val" style="color:#7c3aed;">-0.35 kcal/mol</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Combined Hybrid Breakdown Banner -->
        <div class="model-info-banner">
          <div class="model-badge-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <circle cx="12" cy="12" r="8"/>
              <line x1="12" y1="1" x2="12" y2="4"/>
              <line x1="12" y1="20" x2="12" y2="23"/>
            </svg>
          </div>
          <div class="model-info-text" style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
              <h4 class="model-info-title">Hybrid Formulation: Classical ML (-9.45 kcal/mol) + Quantum Refinement (-0.35 kcal/mol)</h4>
              <span style="font-family: var(--font-mono); font-size: 1.15rem; font-weight: 800; color: #1d68f0;">
                = -9.80 kcal/mol
              </span>
            </div>
            <p class="model-info-desc">Quantum: Qiskit / PennyLane • Classical: PyTorch Geometric EGNN • Refined Ground Energy Confirmed</p>
          </div>
        </div>

        <!-- Step Navigation Footer -->
        <div class="step-navigation-row">
          <button class="btn-step-nav btn-step-prev">
            ← Previous: Molecular Docking
          </button>
          <button class="btn-step-nav btn-step-next">
            Next: Final Prediction →
          </button>
        </div>
      </div>
    </div>
  `;
}

// Screen 8: Final Prediction Page (Step 9 - Unified Final Consensus)
function renderFinalPredictionView() {
  const currentProtein = SAMPLE_PROTEINS[state.selectedProteinKey] || SAMPLE_PROTEINS.P00123;
  return `
    <div class="light-page-wrapper">
      <div class="page-container">
        ${renderPredictStepper()}

        <!-- Step 9 Unified Pipeline Breadcrumb -->
        <div class="flow-breadcrumb-bar">
          <span class="flow-step-tag">ESM-2</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">Structure</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">Pocket GNN</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">Docking</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">Affinity ML</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag">Quantum VQE</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-step-tag active">Final Consensus</span>
          <span style="margin-left: auto;">
            <span class="model-status-pill">Consensus: -9.8 kcal/mol (High)</span>
          </span>
        </div>

        <header class="page-header">
          <h2 class="page-title">Final Prediction</h2>
          <p class="page-subtitle">Unified Quantum-Classical Ensemble consensus binding score, target conformation, and quality assessment.</p>
        </header>

        <div class="two-card-grid">
          <!-- Left: Docked Complex 3D Visual -->
          <div class="panel-card">
            <h3 class="panel-title">Docked Complex (Receptor + Pose 1)</h3>
            <div class="canvas-3d-box" id="final-molecule-canvas"></div>
          </div>

          <!-- Right: Affinity Score & Checklist -->
          <div class="panel-card final-results-card">
            <div class="affinity-label">Predicted Binding Affinity</div>
            <div class="affinity-giant-value">${currentProtein.predictedAffinity}</div>
            
            <div class="confidence-badge">
              Confidence: ${currentProtein.confidence}
            </div>

            <!-- Consensus Breakdown Box -->
            <div class="hybrid-breakdown-card" style="margin-bottom: 1.25rem;">
              <div class="hybrid-metric-row">
                <span class="hybrid-metric-label">Classical EGNN Baseline:</span>
                <span class="hybrid-metric-val">-9.45 kcal/mol</span>
              </div>
              <div class="hybrid-metric-row">
                <span class="hybrid-metric-label">Quantum VQE Refinement:</span>
                <span class="hybrid-metric-val" style="color:#7c3aed;">-0.35 kcal/mol</span>
              </div>
              <div class="hybrid-metric-row" style="border-top: 1px dashed var(--color-card-border); padding-top: 4px; margin-top: 2px;">
                <span class="hybrid-metric-label" style="font-weight: 700;">Final Hybrid Affinity:</span>
                <span class="hybrid-metric-val" style="color:#1d68f0; font-size: 1rem;">-9.80 kcal/mol</span>
              </div>
            </div>

            <div class="checklist-container">
              <div class="checklist-item">
                <span class="check-icon-circle">✓</span>
                <span>Predicted structure (ESMFold / AlphaFold 92.4%)</span>
              </div>
              <div class="checklist-item">
                <span class="check-icon-circle">✓</span>
                <span>Binding pocket location (Site 1: 0.92 probability)</span>
              </div>
              <div class="checklist-item">
                <span class="check-icon-circle">✓</span>
                <span>Best ligand pose (Pose 1: RMSD 0.00 Å)</span>
              </div>
              <div class="checklist-item">
                <span class="check-icon-circle">✓</span>
                <span>Quantum active-site energy converged</span>
              </div>
              <div class="checklist-item">
                <span class="check-icon-circle">✓</span>
                <span>Binding affinity score (-9.8 kcal/mol)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Banner: XGBoost / Ensemble -->
        <div class="model-info-banner">
          <div class="model-badge-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div class="model-info-text">
            <h4 class="model-info-title">Model: XGBoost / Ensemble Consensus</h4>
            <p class="model-info-desc">Final prediction and ranking blending geometric GNN, docking scoring functions, and active-site VQE refinement.</p>
          </div>
        </div>

        <!-- Step Navigation Footer -->
        <div class="step-navigation-row">
          <button class="btn-step-nav btn-step-prev">
            ← Previous: Quantum Refinement
          </button>
          <button class="btn-step-nav btn-step-next" id="new-prediction-btn" style="background:#059669; border-color:#059669;">
            Start New Prediction ↺
          </button>
        </div>
      </div>
    </div>
  `;
}

// Screen Quantum: Quantum Analysis Page (Powered by Qiskit)
function renderQuantumAnalysisView() {
  const result = state.latestPredictionResult?.quantum_analysis || {
    quantum_framework: 'Qiskit',
    feature_map: 'Rotational Quantum Feature Map + entangling circuit',
    classifier_type: 'Variational Quantum Classifier (VQC)',
    binding_prediction: 'Binding likely',
    binding_probability: 0.86,
    confidence_score: 0.91,
    pipeline: ['Molecular Features', 'Feature Scaling', 'Quantum Feature Map', 'Qiskit Quantum Circuit', 'Variational Quantum Classifier', 'Binding Prediction'],
    circuit_summary: {
      qubit_0: '|0⟩ ── H ── Ry(x₀) ── CX(0,1) ── Rz(x₂) ── Ry(θ₀) ──►',
      qubit_1: '|0⟩ ── H ── Ry(x₁) ── Rz(x₃) ── CX(1,0) ── Ry(θ₁) ──►'
    }
  };

  return `
    <div class="light-page-wrapper">
      <div class="page-container">
        <header class="page-header" style="margin-bottom: 1.2rem;">
          <div>
            <span class="about-badge" style="margin-bottom: 0.75rem; display: inline-flex;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 12l10 5 10-5"/>
                <path d="M2 17l10 5 10-5"/>
              </svg>
              Powered by Qiskit
            </span>
            <h2 class="page-title" style="margin-top: 0.3rem;">Quantum Analysis</h2>
          </div>
        </header>

        <div class="about-grid">
          <div class="panel-card" style="padding: 1.2rem;">
            <div class="model-info-banner" style="margin-bottom: 1rem;">
              <div class="model-badge-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 12l10 5 10-5"/>
                  <path d="M2 17l10 5 10-5"/>
                </svg>
              </div>
              <div class="model-info-text">
                <h4 class="model-info-title">Qiskit Quantum ML Model</h4>
                <p class="model-info-desc">Hybrid molecular encoding, variational quantum classifier, and binding probability estimation.</p>
              </div>
            </div>

            <div class="hybrid-breakdown-card" style="margin-bottom: 1rem;">
              <div class="hybrid-metric-row">
                <span class="hybrid-metric-label">Model Type</span>
                <span class="hybrid-metric-val">${result.classifier_type}</span>
              </div>
              <div class="hybrid-metric-row">
                <span class="hybrid-metric-label">Quantum Feature Map</span>
                <span class="hybrid-metric-val">${result.feature_map}</span>
              </div>
              <div class="hybrid-metric-row">
                <span class="hybrid-metric-label">Prediction</span>
                <span class="hybrid-metric-val" style="color:#1d68f0;">${result.binding_prediction}</span>
              </div>
            </div>

            <div class="affinity-giant-value" style="font-size: 2.5rem; margin: 0.5rem 0 0.35rem;">${(result.binding_probability * 100).toFixed(1)}%</div>
            <div class="confidence-badge">Quantum confidence: ${(result.confidence_score * 100).toFixed(1)}%</div>

            <div class="pocket-legend-wrapper" style="margin-top: 1rem;">
              <div class="legend-item"><strong>Observable:</strong> Pauli-Z expectation on qubit 0</div>
              <div class="legend-item"><strong>Decision Rule:</strong> Positive expectation => binding likely</div>
              <div class="legend-item"><strong>Framework:</strong> ${result.quantum_framework}</div>
            </div>
          </div>

          <div class="panel-card" style="padding: 1.2rem;">
            <div class="section-heading-wrap" style="margin-bottom: 0.75rem;">
              <span class="about-badge">Quantum Circuit</span>
            </div>
            ${renderQuantumCircuitSVG()}
            <div class="pocket-legend-wrapper" style="margin-top: 1rem;">
              <div class="legend-item">${result.circuit_summary.qubit_0}</div>
              <div class="legend-item">${result.circuit_summary.qubit_1}</div>
              <div class="legend-item"><strong>Measurement:</strong> ${result.circuit_summary.measurement || 'Measure Z on qubit 0 to estimate binding likelihood.'}</div>
            </div>
          </div>
        </div>

        <div class="panel-card" style="margin-top: 1.2rem; padding: 1.2rem;">
          <div class="section-heading-wrap">
            <span class="about-badge">Pipeline</span>
            <h3 class="section-block-title">Molecular Features → Feature Scaling → Quantum Feature Map → Qiskit Circuit → Quantum Classifier → Binding Prediction</h3>
          </div>

          <div class="uses-cards-grid">
            ${result.pipeline.map((step, index) => `
              <div class="use-card">
                <div class="use-card-header">
                  <div class="use-icon-circle">${index + 1}</div>
                  <span class="use-pill">Stage ${index + 1}</span>
                </div>
                <h4 class="use-title">${step}</h4>
                <p class="use-desc">
                  ${
                    index === 0 ? 'Protein and ligand descriptors are reduced into a compact representation.' :
                    index === 1 ? 'The classical signal is normalized to stable angular values for the quantum feature map.' :
                    index === 2 ? 'Encoded molecular descriptors are injected into the quantum state through rotation gates.' :
                    index === 3 ? 'The Qiskit circuit applies a compact entangling ansatz suitable for local simulation.' :
                    index === 4 ? 'The variational classifier learns the decision boundary for binding vs. non-binding.' :
                    'The final expectation value yields the binding likelihood and confidence estimate.'
                  }
                </p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Screen 9: Prediction History Page (Strict Match to Image 9)
function renderHistoryView() {
  return `
    <div class="light-page-wrapper">
      <div class="page-container">
        <header class="page-header">
          <h2 class="page-title">Prediction History</h2>
        </header>

        <div class="history-table-card">
          <table class="history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Protein Name</th>
                <th>Ligand</th>
                <th>Binding Affinity</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.historyData.slice(0, 5).map(item => `
                <tr>
                  <td><strong>${item.id}</strong></td>
                  <td><strong>${item.proteinName}</strong></td>
                  <td>${item.ligand}</td>
                  <td><strong>${item.affinity}</strong></td>
                  <td style="color:#64748b; font-size:0.88rem;">${item.date}</td>
                  <td>
                    <span class="status-badge-completed">${item.status}</span>
                  </td>
                  <td>
                    <button class="action-view-btn" data-history-id="${item.id}" title="View Details">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="pagination-bar">
            <button class="page-btn" ${state.historyPage === 1 ? 'disabled style="opacity:0.5;"' : ''}>&lt;</button>
            <button class="page-btn ${state.historyPage === 1 ? 'active' : ''}">1</button>
            <button class="page-btn ${state.historyPage === 2 ? 'active' : ''}">2</button>
            <button class="page-btn ${state.historyPage === 3 ? 'active' : ''}">3</button>
            <button class="page-btn">&gt;</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Screen 10: About / Uses / System Architecture Page
function renderAboutView() {
  return `
    <div class="light-page-wrapper">
      <div class="page-container about-page-container">
        <!-- Top Row: Overview + Visual Quote Card -->
        <div class="about-grid">
          <!-- Left Column: Overview & Mission -->
          <div class="about-left-col">
            <span class="about-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              Next-Gen Computational Biology
            </span>
            <h2 class="page-title" style="margin-bottom: 0.75rem;">About QBindAI</h2>
            <p class="about-description">
              QBindAI bridges modern deep learning with quantum computing algorithms to resolve complex molecular folding, binding-pocket detection, and drug-target interaction challenges. By synthesizing 1280-dimensional evolutionary language embeddings, geometric graph attention networks, and Variational Quantum Eigensolvers (VQE), QBindAI offers unprecedented computational accuracy for pharmaceutical discovery and precision medicine.
            </p>
            <div class="about-stats-row">
              <div class="about-stat-item">
                <span class="stat-number">92.4%</span>
                <span class="stat-label">Folding Confidence (pLDDT)</span>
              </div>
              <div class="about-stat-item">
                <span class="stat-number">1280d</span>
                <span class="stat-label">ESM-2 Embeddings</span>
              </div>
              <div class="about-stat-item">
                <span class="stat-number">&lt; 15s</span>
                <span class="stat-label">Full Hybrid Pipeline</span>
              </div>
            </div>
          </div>

          <!-- Right Column: Dark Quote Card (Image 10) -->
          <div class="about-quote-card">
            <div class="quote-canvas-container" id="about-quote-canvas"></div>
            <div class="quote-text">
              “Better models.<br>
              Better molecules.<br>
              A healthier future.”
            </div>
          </div>
        </div>

        <!-- Section 1: What are the Uses of the Website -->
        <section class="about-section-block">
          <div class="section-heading-wrap">
            <span class="about-badge">Platform Capabilities</span>
            <h3 class="section-block-title">What are the Uses of QBindAI?</h3>
            <p class="section-block-subtitle">
              QBindAI is engineered for computational biologists, medicinal chemists, and drug discovery researchers to accelerate preclinical research workflows:
            </p>
          </div>

          <div class="uses-cards-grid">
            <!-- Use 1: Rapid Drug Discovery -->
            <div class="use-card">
              <div class="use-card-header">
                <div class="use-icon-circle">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </div>
                <span class="use-pill">Preclinical Pharma</span>
              </div>
              <h4 class="use-title">In Silico Hit Discovery & Screening</h4>
              <p class="use-desc">
                Screen large chemical libraries against therapeutic protein targets (e.g. EGFR, COVID Mpro, CDK2) in minutes without expensive wet-lab assay costs.
              </p>
            </div>

            <!-- Use 2: 3D Structure Prediction -->
            <div class="use-card">
              <div class="use-card-header">
                <div class="use-icon-circle">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <span class="use-pill">Structure Biology</span>
              </div>
              <h4 class="use-title">De Novo Protein Folding from Sequence</h4>
              <p class="use-desc">
                Convert uncharacterized FASTA sequences into atomic-resolution 3D PDB coordinates via ESMFold and AlphaFold 3, bypassing synchrotron crystallization delays.
              </p>
            </div>

            <!-- Use 3: Pocket & Active Site Identification -->
            <div class="use-card">
              <div class="use-card-header">
                <div class="use-icon-circle">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="4"/>
                    <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/>
                    <line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/>
                  </svg>
                </div>
                <span class="use-pill">Cavity Mapping</span>
              </div>
              <h4 class="use-title">Active Site & Pocket Detection</h4>
              <p class="use-desc">
                Employ Geometric Deep Learning (GNN / GAT) to identify allosteric pockets and druggable cavities, ranking critical catalytic residues (Thr790, Met793).
              </p>
            </div>

            <!-- Use 4: Molecular Docking & Poses -->
            <div class="use-card">
              <div class="use-card-header">
                <div class="use-icon-circle">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                    <polyline points="2 17 12 22 22 17"/>
                    <polyline points="2 12 12 17 22 12"/>
                  </svg>
                </div>
                <span class="use-pill">Conformational Search</span>
              </div>
              <h4 class="use-title">High-Precision Molecular Docking</h4>
              <p class="use-desc">
                Sample ligand conformational poses with AutoDock Vina, evaluating steric fit, binding free energy (&Delta;G), and RMSD cluster stability.
              </p>
            </div>

            <!-- Use 5: Quantum VQE Refinement -->
            <div class="use-card">
              <div class="use-card-header">
                <div class="use-icon-circle">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)"/>
                    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/>
                    <circle cx="12" cy="12" r="2.5"/>
                  </svg>
                </div>
                <span class="use-pill">Quantum Simulation</span>
              </div>
              <h4 class="use-title">Quantum Electronic Refinement</h4>
              <p class="use-desc">
                Overcome classical force-field inaccuracies by computing ground-state electronic Hamiltonians via Variational Quantum Eigensolver (VQE) circuits.
              </p>
            </div>

            <!-- Use 6: Lead Optimization & Resistance Profiling -->
            <div class="use-card">
              <div class="use-card-header">
                <div class="use-icon-circle">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <span class="use-pill">Lead Optimization</span>
              </div>
              <h4 class="use-title">Mutational Resistance Profiling</h4>
              <p class="use-desc">
                Compare wild-type and oncogenic drug-resistant mutants (e.g. EGFR T790M) to redesign molecules that maintain nanomolar inhibition constants (Ki).
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  `;
}

// Password Strength evaluation helper
function checkPasswordStrength(password) {
  const rules = {
    length: (password || '').length >= 8,
    upper: /[A-Z]/.test(password || ''),
    lower: /[a-z]/.test(password || ''),
    digit: /[0-9]/.test(password || ''),
    special: /[^A-Za-z0-9]/.test(password || '')
  };
  const passedCount = Object.values(rules).filter(Boolean).length;
  let label = 'Weak';
  let color = '#ef4444';
  let percent = 20;

  if (passedCount === 5) {
    label = 'Strong';
    color = '#10b981';
    percent = 100;
  } else if (passedCount >= 3) {
    label = 'Medium';
    color = '#f59e0b';
    percent = 60;
  } else if (passedCount >= 1) {
    label = 'Weak';
    color = '#ef4444';
    percent = passedCount * 20;
  } else {
    percent = 0;
    label = '';
  }

  return { rules, passedCount, label, color, percent, isValid: passedCount === 5 };
}

// Authentication API Operations
async function apiLogin(email, password) {
  state.authLoading = true;
  state.authError = null;
  state.authSuccess = null;
  renderApp();

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 403 && data.detail && data.detail.includes('verify your email')) {
        state.authVerificationEmail = email;
        state.authMode = 'verify';
        state.authError = data.detail;
        state.authLoading = false;
        renderApp();
        return;
      }
      throw new Error(data.detail || 'Login failed. Please check your credentials.');
    }

    state.sessionToken = data.token;
    localStorage.setItem('qbindai_session_token', data.token);
    state.currentUser = data.user;
    state.isAuthModalOpen = false;
    state.authError = null;
    state.authSuccess = null;
    state.authLoading = false;
    renderApp();
  } catch (err) {
    state.authError = err.message || 'Network error during sign in.';
    state.authLoading = false;
    renderApp();
  }
}

async function apiRegister(fullName, email, password) {
  state.authLoading = true;
  state.authError = null;
  state.authSuccess = null;
  renderApp();

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Sign up failed. Please check the requirements.');
    }

    state.authVerificationEmail = email;
    state.authMode = 'verify';
    state.authSuccess = data.message || 'Account created! Enter the 6-digit verification code sent to your email.';
    state.authError = null;
    state.authLoading = false;
    renderApp();
  } catch (err) {
    state.authError = err.message || 'Registration failed.';
    state.authLoading = false;
    renderApp();
  }
}

async function apiVerifyEmail(email, code) {
  state.authLoading = true;
  state.authError = null;
  state.authSuccess = null;
  renderApp();

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Verification code invalid or expired.');
    }

    if (state.currentUser && state.currentUser.email === email) {
      state.currentUser.is_verified = true;
    }

    state.authMode = 'login';
    state.authSuccess = data.message || 'Email successfully verified! You can now sign in.';
    state.authError = null;
    state.authLoading = false;
    renderApp();
  } catch (err) {
    state.authError = err.message || 'Verification failed.';
    state.authLoading = false;
    renderApp();
  }
}

async function apiResendVerification(email) {
  state.authLoading = true;
  state.authError = null;
  state.authSuccess = null;
  renderApp();

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to resend verification code.');
    }

    state.authSuccess = data.message || 'A new verification code has been dispatched!';
    state.authError = null;
    state.authLoading = false;
    renderApp();
  } catch (err) {
    state.authError = err.message || 'Failed to resend code.';
    state.authLoading = false;
    renderApp();
  }
}

async function apiForgotPassword(email) {
  state.authLoading = true;
  state.authError = null;
  state.authSuccess = null;
  renderApp();

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to request password reset code.');
    }

    state.authVerificationEmail = email;
    state.authMode = 'reset';
    state.authSuccess = data.message || 'Reset code sent! Check your email and enter the code.';
    state.authError = null;
    state.authLoading = false;
    renderApp();
  } catch (err) {
    state.authError = err.message || 'Request failed.';
    state.authLoading = false;
    renderApp();
  }
}

async function apiResetPassword(email, code, newPassword) {
  state.authLoading = true;
  state.authError = null;
  state.authSuccess = null;
  renderApp();

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, new_password: newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to reset password. Please verify the code.');
    }

    state.authMode = 'login';
    state.authSuccess = data.message || 'Password reset successfully! You can now log in with your new password.';
    state.authError = null;
    state.authLoading = false;
    renderApp();
  } catch (err) {
    state.authError = err.message || 'Password reset failed.';
    state.authLoading = false;
    renderApp();
  }
}

async function apiCheckSession() {
  if (!state.sessionToken) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${state.sessionToken}`
      }
    });

    if (res.ok) {
      state.currentUser = await res.json();
      renderApp();
    } else {
      localStorage.removeItem('qbindai_session_token');
      state.sessionToken = null;
      state.currentUser = null;
      renderApp();
    }
  } catch (err) {
    console.warn('Backend session verification unreachable:', err);
  }
}

async function apiLogout() {
  if (state.sessionToken) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.sessionToken}`
        }
      });
    } catch (e) {
      console.warn('Logout network sync error:', e);
    }
  }

  localStorage.removeItem('qbindai_session_token');
  state.sessionToken = null;
  state.currentUser = null;
  state.isUserMenuOpen = false;
  renderApp();
}

function renderAuthFormBody(mode) {
  if (mode === 'signup') {
    return `
      <form id="auth-signup-form" onsubmit="return false;">
        <div class="auth-field-group">
          <label class="auth-label">Full Name</label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <input type="text" class="auth-input" id="auth-signup-name" placeholder="Dr. Rosalind Franklin" required />
          </div>
        </div>

        <div class="auth-field-group">
          <label class="auth-label">Email address</label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M22 6l-10 7L2 6"/>
              </svg>
            </span>
            <input type="email" class="auth-input" id="auth-signup-email" placeholder="researcher@biotech.org" required />
          </div>
        </div>

        <div class="auth-field-group">
          <label class="auth-label">Password</label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input type="${state.showPassword ? 'text' : 'password'}" class="auth-input" id="auth-signup-password" placeholder="Create a strong password" required />
            <button type="button" class="password-toggle-btn" id="toggle-signup-password-btn" title="Toggle password visibility">
              ${state.showPassword ? '👁' : '👁‍🗨'}
            </button>
          </div>
        </div>

        <!-- Live Password Strength Meter -->
        <div class="password-strength-container" id="signup-strength-container">
          <div class="strength-meter-bar">
            <div class="strength-meter-fill" id="signup-strength-fill" style="width: 0%; background-color: #ef4444;"></div>
          </div>
          <div class="strength-rules-list">
            <span class="strength-rule-item" id="rule-length"><span>○</span> 8+ chars</span>
            <span class="strength-rule-item" id="rule-upper"><span>○</span> Uppercase</span>
            <span class="strength-rule-item" id="rule-lower"><span>○</span> Lowercase</span>
            <span class="strength-rule-item" id="rule-digit"><span>○</span> Number</span>
            <span class="strength-rule-item" id="rule-special"><span>○</span> Symbol</span>
          </div>
        </div>

        <div class="auth-field-group">
          <label class="auth-label">Confirm Password</label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input type="${state.showPassword ? 'text' : 'password'}" class="auth-input" id="auth-signup-confirm-password" placeholder="Confirm your password" required />
          </div>
        </div>

        <button type="submit" class="btn-auth-submit" id="submit-signup-btn" ${state.authLoading ? 'disabled' : ''}>
          ${state.authLoading ? 'Creating Account...' : 'Create Account'}
        </button>

        <div class="auth-footer-toggle">
          Already have an account? <a class="auth-toggle-link" id="goto-login-btn">Sign In</a>
        </div>
      </form>
    `;
  }

  if (mode === 'verify') {
    return `
      <form id="auth-verify-form" onsubmit="return false;">
        <div class="auth-alert info">
          <span>📧</span>
          <span>We sent a 6-digit verification code to <strong>${state.authVerificationEmail || 'your email'}</strong>. Enter it below to activate your account.</span>
        </div>

        <div class="auth-field-group">
          <label class="auth-label">Target Email</label>
          <input type="email" class="auth-input" id="auth-verify-email-input" value="${state.authVerificationEmail || ''}" readonly style="opacity: 0.85; cursor: not-allowed; background: var(--color-bg-subtle, #f8fafc);" />
        </div>

        <div class="auth-field-group">
          <label class="auth-label">6-Digit Verification Code</label>
          <input type="text" class="auth-input verify-code-input" id="auth-verify-code-input" maxlength="6" placeholder="000000" autocomplete="one-time-code" required autofocus />
        </div>

        <button type="submit" class="btn-auth-submit" id="submit-verify-btn" ${state.authLoading ? 'disabled' : ''}>
          ${state.authLoading ? 'Verifying...' : 'Verify Email & Activate'}
        </button>

        <div class="auth-resend-row">
          <span style="color:#64748b; font-size:0.82rem;">Didn't receive the code?</span>
          <button type="button" class="btn-link-action" id="resend-verification-btn" ${state.authLoading ? 'disabled' : ''}>Resend Code</button>
        </div>

        <div class="auth-footer-toggle">
          <a class="auth-toggle-link" id="goto-login-btn">Back to Sign In</a>
        </div>
      </form>
    `;
  }

  if (mode === 'forgot') {
    return `
      <form id="auth-forgot-form" onsubmit="return false;">
        <p style="font-size:0.86rem; color:#64748b; margin-bottom:1.1rem; line-height:1.45;">
          Enter the email address registered with your QBindAI account. We'll send you a 6-digit recovery code to reset your password.
        </p>

        <div class="auth-field-group">
          <label class="auth-label">Email address</label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M22 6l-10 7L2 6"/>
              </svg>
            </span>
            <input type="email" class="auth-input" id="auth-forgot-email" placeholder="you@example.com" value="${state.authVerificationEmail || ''}" required />
          </div>
        </div>

        <button type="submit" class="btn-auth-submit" id="submit-forgot-btn" ${state.authLoading ? 'disabled' : ''}>
          ${state.authLoading ? 'Sending Recovery Code...' : 'Send Password Reset Code'}
        </button>

        <div class="auth-footer-toggle">
          Remembered your password? <a class="auth-toggle-link" id="goto-login-btn">Back to Sign In</a>
        </div>
      </form>
    `;
  }

  if (mode === 'reset') {
    return `
      <form id="auth-reset-form" onsubmit="return false;">
        <div class="auth-alert info">
          <span>🔑</span>
          <span>Enter the 6-digit reset code sent to <strong>${state.authVerificationEmail || 'your email'}</strong> and set your new password.</span>
        </div>

        <div class="auth-field-group">
          <label class="auth-label">Resetting For</label>
          <input type="email" class="auth-input" id="auth-reset-email-input" value="${state.authVerificationEmail || ''}" readonly style="opacity: 0.85; cursor: not-allowed; background: var(--color-bg-subtle, #f8fafc);" />
        </div>

        <div class="auth-field-group">
          <label class="auth-label">6-Digit Reset Code</label>
          <input type="text" class="auth-input verify-code-input" id="auth-reset-code-input" maxlength="6" placeholder="000000" autocomplete="one-time-code" required autofocus />
        </div>

        <div class="auth-field-group">
          <label class="auth-label">New Password</label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input type="${state.showPassword ? 'text' : 'password'}" class="auth-input" id="auth-reset-password" placeholder="Enter new strong password" required />
            <button type="button" class="password-toggle-btn" id="toggle-reset-password-btn" title="Toggle password visibility">
              ${state.showPassword ? '👁' : '👁‍🗨'}
            </button>
          </div>
        </div>

        <!-- Live Password Strength Meter for Reset -->
        <div class="password-strength-container" id="reset-strength-container">
          <div class="strength-meter-bar">
            <div class="strength-meter-fill" id="reset-strength-fill" style="width: 0%; background-color: #ef4444;"></div>
          </div>
          <div class="strength-rules-list">
            <span class="strength-rule-item" id="reset-rule-length"><span>○</span> 8+ chars</span>
            <span class="strength-rule-item" id="reset-rule-upper"><span>○</span> Uppercase</span>
            <span class="strength-rule-item" id="reset-rule-lower"><span>○</span> Lowercase</span>
            <span class="strength-rule-item" id="reset-rule-digit"><span>○</span> Number</span>
            <span class="strength-rule-item" id="reset-rule-special"><span>○</span> Symbol</span>
          </div>
        </div>

        <div class="auth-field-group">
          <label class="auth-label">Confirm New Password</label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input type="${state.showPassword ? 'text' : 'password'}" class="auth-input" id="auth-reset-confirm-password" placeholder="Confirm new password" required />
          </div>
        </div>

        <button type="submit" class="btn-auth-submit" id="submit-reset-btn" ${state.authLoading ? 'disabled' : ''}>
          ${state.authLoading ? 'Resetting Password...' : 'Save New Password & Sign In'}
        </button>

        <div class="auth-resend-row">
          <span style="color:#64748b; font-size:0.82rem;">Need another code?</span>
          <button type="button" class="btn-link-action" id="resend-reset-btn" ${state.authLoading ? 'disabled' : ''}>Resend Reset Code</button>
        </div>

        <div class="auth-footer-toggle">
          <a class="auth-toggle-link" id="goto-login-btn">Back to Sign In</a>
        </div>
      </form>
    `;
  }

  // Default: 'login' (or 'signin')
  return `
    <form id="auth-login-form" onsubmit="return false;">
      <div class="auth-field-group">
        <label class="auth-label">Email address</label>
        <div class="auth-input-wrapper">
          <span class="auth-input-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M22 6l-10 7L2 6"/>
            </svg>
          </span>
          <input type="email" class="auth-input" id="auth-login-email" placeholder="you@example.com" value="${state.authVerificationEmail || ''}" required />
        </div>
      </div>

      <div class="auth-field-group">
        <label class="auth-label">Password</label>
        <div class="auth-input-wrapper">
          <span class="auth-input-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <input type="${state.showPassword ? 'text' : 'password'}" class="auth-input" id="auth-login-password" placeholder="Enter your password" value="QuantumAI@2026" required />
          <button type="button" class="password-toggle-btn" id="toggle-login-password-btn" title="Toggle password visibility">
            ${state.showPassword ? '👁' : '👁‍🗨'}
          </button>
        </div>
      </div>

      <div class="auth-remember-row">
        <label class="remember-label">
          <input type="checkbox" id="auth-remember-checkbox" checked />
          <span>Remember me</span>
        </label>
        <a href="#" class="forgot-link" id="goto-forgot-btn">Forgot password?</a>
      </div>

      <button type="submit" class="btn-auth-submit" id="submit-login-btn" ${state.authLoading ? 'disabled' : ''}>
        ${state.authLoading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>

    <div class="auth-divider">
      <span>OR</span>
    </div>

    <div class="oauth-btn-group">
      <button class="btn-oauth" id="oauth-google-btn" type="button">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        Continue with Google
      </button>
      <button class="btn-oauth" id="oauth-github-btn" type="button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
        Continue with GitHub
      </button>
    </div>

    <div class="auth-footer-toggle">
      Don't have an account? <a class="auth-toggle-link" id="goto-signup-btn">Sign Up</a>
    </div>
  `;
}

// Screen 11: Login / Sign Up / Auth Modal
function renderAuthModal() {
  const titles = {
    login: { title: 'Welcome Back', sub: 'Sign in to access quantum AI molecular modeling' },
    signup: { title: 'Create Account', sub: 'Join QBindAI for quantum drug discovery' },
    verify: { title: 'Verify Email', sub: 'Confirm your email address with the 6-digit code' },
    forgot: { title: 'Reset Password', sub: 'Recover your QBindAI account credentials' },
    reset: { title: 'Set New Password', sub: 'Create a strong new password for your account' }
  };
  const modeInfo = titles[state.authMode] || titles.login;

  return `
    <div class="modal-backdrop ${state.isAuthModalOpen ? 'open' : ''}" id="auth-modal-backdrop">
      <div class="auth-modal-dialog">
        <button class="auth-close-btn" id="close-auth-modal-btn" title="Close">✕</button>

        <!-- Left: Form Body -->
        <div class="auth-left-form">
          <div class="auth-brand-row">
            <div class="brand-icon-wrapper" style="width:30px; height:30px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9"/>
              </svg>
            </div>
            <span class="brand-text" style="color:var(--color-text-main, #0b1a3d); font-size:1.25rem;">QBindAI</span>
          </div>

          <h3 class="auth-title">${modeInfo.title}</h3>
          <p class="auth-subtitle">${modeInfo.sub}</p>

          ${state.authError ? `
            <div class="auth-alert error" id="auth-error-alert">
              <span>⚠️</span>
              <span>${state.authError}</span>
            </div>
          ` : ''}

          ${state.authSuccess ? `
            <div class="auth-alert success" id="auth-success-alert">
              <span>✓</span>
              <span>${state.authSuccess}</span>
            </div>
          ` : ''}

          ${renderAuthFormBody(state.authMode)}
        </div>

        <!-- Right Banner: Quantum visuals (Strict match to Image 11) -->
        <div class="auth-right-banner">
          <div style="height: 240px; width: 100%; position: relative; display:flex; align-items:center; justify-content:center;" id="auth-molecule-canvas">
            <svg viewBox="0 0 260 220" width="100%" height="100%" fill="none" style="filter: drop-shadow(0 0 25px rgba(56,189,248,0.35));">
              <ellipse cx="130" cy="110" rx="95" ry="40" stroke="rgba(56,189,248,0.4)" stroke-width="1.5" transform="rotate(-25 130 110)" stroke-dasharray="4 3" />
              <ellipse cx="130" cy="110" rx="95" ry="40" stroke="rgba(147,197,253,0.3)" stroke-width="1.5" transform="rotate(35 130 110)" />
              <ellipse cx="130" cy="110" rx="95" ry="40" stroke="rgba(99,102,241,0.3)" stroke-width="1.5" transform="rotate(85 130 110)" stroke-dasharray="6 2" />
              
              <circle cx="50" cy="90" r="5" fill="#38bdf8" />
              <circle cx="210" cy="130" r="4.5" fill="#60a5fa" />
              <circle cx="115" cy="35" r="4" fill="#a78bfa" />
              <circle cx="145" cy="185" r="4" fill="#34d399" />
              
              <circle cx="130" cy="110" r="24" fill="url(#coreGradient)" />
              <circle cx="130" cy="110" r="14" fill="#ffffff" opacity="0.9" />
              
              <defs>
                <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#ffffff"/>
                  <stop offset="45%" stop-color="#38bdf8"/>
                  <stop offset="100%" stop-color="#1d4ed8"/>
                </radialGradient>
              </defs>
            </svg>
          </div>
          <div class="auth-banner-title">
            Accelerating drug discovery with Quantum AI/ML
            <div style="font-size: 0.82rem; font-weight: 400; opacity: 0.85; margin-top: 0.4rem; line-height: 1.4;">
              Secure session management with PBKDF2 encryption & email verification
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Pipeline Simulation Modal Overlay
function renderPipelineProgressOverlay() {
  return `
    <div class="pipeline-progress-overlay" id="pipeline-progress-modal">
      <div class="pipeline-progress-card">
        <div class="pipeline-spinner"></div>
        <div class="pipeline-status-title" id="pipeline-status-title">Initialising Pipeline...</div>
        <div class="pipeline-status-detail" id="pipeline-status-detail">Processing FASTA sequence through ESM-2 language model...</div>
        <div class="progress-track">
          <div class="progress-bar-fill" id="pipeline-progress-bar"></div>
        </div>
      </div>
    </div>
  `;
}

// Master Render Function
function renderApp() {
  // Sync Dark/Light theme attribute to documentElement
  document.documentElement.setAttribute('data-theme', state.theme);

  // Route protection: Check if user is trying to access protected routes without authentication
  const protectedRoutes = ['predict', 'quantum', 'history'];
  if (protectedRoutes.includes(state.activeTab) && !state.currentUser) {
    state.activeTab = 'home';
    state.isAuthModalOpen = true;
    state.authMode = 'login';
  }

  // Destroy existing Three.js instances before DOM update
  if (state.activeViewerInstance) {
    state.activeViewerInstance.destroy();
    state.activeViewerInstance = null;
  }
  if (state.activeSecondaryViewer) {
    state.activeSecondaryViewer.destroy();
    state.activeSecondaryViewer = null;
  }

  const appEl = document.getElementById('app');
  let viewHtml = '';

  if (state.activeTab === 'home') {
    viewHtml = renderHomeView();
  } else if (state.activeTab === 'predict') {
    switch (state.predictStep) {
      case 1: viewHtml = renderProteinInputView(); break;
      case 2: viewHtml = renderProteinRepresentationView(); break;
      case 3: viewHtml = renderStructurePredictionView(); break;
      case 4: viewHtml = renderBindingSiteView(); break;
      case 5: viewHtml = renderMolecularDockingView(); break;
      case 6: viewHtml = renderAffinityRefinementView(); break;
      case 7: viewHtml = renderFinalPredictionView(); break;
      default: viewHtml = renderProteinInputView();
    }
  } else if (state.activeTab === 'quantum') {
    viewHtml = renderQuantumAnalysisView();
  } else if (state.activeTab === 'history') {
    viewHtml = renderHistoryView();
  } else if (state.activeTab === 'about') {
    viewHtml = renderAboutView();
  }

  appEl.innerHTML = `
    ${renderNavbar()}
    <main class="main-content">
      ${viewHtml}
    </main>
    ${renderAuthModal()}
    ${renderPipelineProgressOverlay()}
  `;

  attachEventListeners();
  mount3DViews();
}

// Mount Three.js Viewers based on current page
function mount3DViews() {
  setTimeout(() => {
    if (state.activeTab === 'home') {
      const heroEl = document.getElementById('hero-molecule-canvas');
      if (heroEl) {
        state.activeViewerInstance = createMolecularViewer(heroEl, { mode: 'hero', autoRotate: true });
      }
    } else if (state.activeTab === 'predict') {
      if (state.predictStep === 2) {
        const repEl = document.getElementById('representation-molecule-canvas');
        if (repEl) {
          state.activeViewerInstance = createMolecularViewer(repEl, { mode: 'ribbon', autoRotate: true });
        }
        mountHeatmapGrid();
      } else if (state.predictStep === 3) {
        const structEl = document.getElementById('structure-molecule-canvas');
        if (structEl) {
          state.activeViewerInstance = createMolecularViewer(structEl, {
            mode: state.structureViewMode,
            autoRotate: true
          });
        }
      } else if (state.predictStep === 4) {
        const pocketEl = document.getElementById('pocket-molecule-canvas');
        if (pocketEl) {
          state.activeViewerInstance = createMolecularViewer(pocketEl, { mode: 'pocket', autoRotate: true });
        }
        const zoomedEl = document.getElementById('pocket-zoomed-canvas');
        if (zoomedEl) {
          state.activeSecondaryViewer = createMolecularViewer(zoomedEl, { mode: 'docking-zoomed', autoRotate: true });
        }
      } else if (state.predictStep === 5) {
        const dockEl = document.getElementById('docking-molecule-canvas');
        if (dockEl) {
          state.activeViewerInstance = createMolecularViewer(dockEl, { mode: 'docking', autoRotate: true });
        }
        const zoomedEl = document.getElementById('docking-zoomed-canvas');
        if (zoomedEl) {
          state.activeSecondaryViewer = createMolecularViewer(zoomedEl, { mode: 'docking-zoomed', autoRotate: true });
        }
      } else if (state.predictStep === 7) {
        const finalEl = document.getElementById('final-molecule-canvas');
        if (finalEl) {
          state.activeViewerInstance = createMolecularViewer(finalEl, { mode: 'final', autoRotate: true });
        }
      }
    } else if (state.activeTab === 'about') {
      const quoteEl = document.getElementById('about-quote-canvas');
      if (quoteEl) {
        state.activeViewerInstance = createMolecularViewer(quoteEl, { mode: 'hero', autoRotate: true });
      }
    }

    // Modal visual
    if (state.isAuthModalOpen) {
      const authCanvas = document.getElementById('auth-molecule-canvas');
      if (authCanvas) {
        state.activeSecondaryViewer = createMolecularViewer(authCanvas, { mode: 'hero', autoRotate: true });
      }
    }
  }, 30);
}

// Generate ESM-2 Heatmap Grid cells
function mountHeatmapGrid() {
  const container = document.getElementById('heatmap-cells-container');
  if (!container) return;

  container.innerHTML = '';
  // 10 columns x 5 rows = 50 cells
  const sampleValues = [
    [0.15, 0.22, 0.29, 0.35, 0.42, 0.95, 0.88, 0.81, 0.74, 0.68],
    [0.19, 0.28, 0.38, 0.45, 0.52, 0.98, 0.76, 0.62, 0.55, 0.48],
    [0.25, 0.33, 0.41, 0.49, 0.57, 0.92, 0.69, 0.58, 0.49, 0.41],
    [0.32, 0.39, 0.47, 0.54, 0.62, 0.89, 0.63, 0.51, 0.43, 0.36],
    [0.38, 0.45, 0.53, 0.61, 0.68, 0.84, 0.57, 0.45, 0.37, 0.29]
  ];

  sampleValues.forEach(row => {
    row.forEach(val => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.style.backgroundColor = getHeatmapColor(val);
      cell.title = `Embedding score: ${(val * 100).toFixed(1)}`;
      container.appendChild(cell);
    });
  });
}

function getHeatmapColor(val) {
  // val 0.0 -> 1.0 (Blue -> Cyan -> Green -> Yellow -> Red/Pink)
  if (val > 0.85) return '#1e3a8a'; // Deep blue spike matching Image 3!
  if (val > 0.7) return '#3b82f6';
  if (val > 0.55) return '#eab308';
  if (val > 0.4) return '#22c55e';
  if (val > 0.25) return '#06b6d4';
  return '#f43f5e';
}

// Call FastAPI backend for prediction pipeline run
async function executePredictionPipeline() {
  const modal = document.getElementById('pipeline-progress-modal');
  const title = document.getElementById('pipeline-status-title');
  const detail = document.getElementById('pipeline-status-detail');
  const bar = document.getElementById('pipeline-progress-bar');

  const fastaVal = document.getElementById('fasta-input')?.value || SAMPLE_PROTEINS[state.selectedProteinKey].fasta;
  const smilesVal = document.getElementById('smiles-input')?.value || SAMPLE_PROTEINS[state.selectedProteinKey].defaultSmiles;

  if (modal) {
    modal.classList.add('show');
    if (bar) bar.style.width = '10%';
  }

  const pipelineStages = [
    { pct: '11%', title: '1. Validate FASTA / SMILES', detail: 'Validating sequence grammar and chemical valence representation...' },
    { pct: '22%', title: '2. ESM-2 Protein Embeddings', detail: 'ESM-2 transformer generating 768/1280-dimensional numerical sequence representations...' },
    { pct: '36%', title: '3. 3D Structure Prediction', detail: 'ESMFold / AlphaFold 3 predicting tertiary folded coordinates (Confidence: 92.4% pLDDT)...' },
    { pct: '50%', title: '4. Binding-Site GNN / GAT', detail: 'Graph Attention Network predicting pocket residue probabilities (Site 1: 0.92)...' },
    { pct: '64%', title: '5. Molecular Docking', detail: 'AutoDock Vina / DiffDock sampling multiple binding poses (Pose 1 -9.8 kcal/mol)...' },
    { pct: '76%', title: '6. Classical Affinity ML (EGNN)', detail: 'EGNN / SchNet predicting equivariant interaction affinity (-9.45 kcal/mol)...' },
    { pct: '88%', title: '7. Quantum Analysis (Qiskit VQC)', detail: 'Qiskit feature map + variational classifier estimating binding probability from molecular descriptors...' },
    { pct: '96%', title: '8. Final ML Ranking', detail: 'XGBoost ensemble combining classical features and quantum correction...' },
    { pct: '100%', title: '9. Final Consensus Result', detail: 'Consensus Predicted Affinity: -9.8 kcal/mol (High Confidence)!' }
  ];

  // Initiate backend request concurrently
  let backendPromise = fetch(`${API_BASE_URL}/api/predict/full-pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fasta_sequence: fastaVal,
      smiles: smilesVal,
      protein_name: SAMPLE_PROTEINS[state.selectedProteinKey]?.name || "Target Protein",
      ligand_name: SAMPLE_PROTEINS[state.selectedProteinKey]?.ligandName || "Ligand Molecule"
    })
  }).then(res => res.json()).catch(err => {
    console.warn("Backend API request completed with fallback:", err);
    return null;
  });

  let currentStage = 0;
  const interval = setInterval(async () => {
    if (currentStage < pipelineStages.length) {
      const stage = pipelineStages[currentStage];
      if (title) title.textContent = stage.title;
      if (detail) detail.textContent = stage.detail;
      if (bar) bar.style.width = stage.pct;
      currentStage++;
    } else {
      clearInterval(interval);
      const backendData = await backendPromise;
      if (backendData && backendData.final_prediction) {
        state.latestPredictionResult = backendData;
      }
      setTimeout(() => {
        if (modal) modal.classList.remove('show');
        state.predictStep = 7; // Final prediction view (Screen 8)
        renderApp();
      }, 400);
    }
  }, 400);
}

// Download realistic PDB file (Screen 4) via FastAPI Backend
function downloadSamplePDB() {
  const currentProtein = SAMPLE_PROTEINS[state.selectedProteinKey] || SAMPLE_PROTEINS.P00123;
  // Trigger direct download from FastAPI backend
  const backendPdbUrl = `${API_BASE_URL}/api/protein/download-pdb/${currentProtein.id}`;
  
  fetch(backendPdbUrl)
    .then(res => {
      if (!res.ok) throw new Error("Network response was not ok");
      return res.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProtein.id}_predicted_structure.pdb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    })
    .catch(() => {
      // Graceful fallback to client generation
      const pdbContent = `HEADER    PROTEIN STRUCTURE PREDICTION           08-OCT-26   P001\nTITLE     QBINDAI ALPHAFOLD 3 PREDICTION FOR ${currentProtein.name}\nATOM      1  N   MET A   1      21.140  12.340  34.560  1.00 92.40           N\nATOM      2  CA  MET A   1      22.450  13.120  34.890  1.00 93.10           C\nEND\n`;
      const blob = new Blob([pdbContent], { type: 'chemical/x-pdb' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProtein.id}_predicted_structure.pdb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
}

// Event Listeners Binding
function attachEventListeners() {
  // Brand logo
  const brandLogo = document.getElementById('brand-logo-btn');
  if (brandLogo) {
    brandLogo.addEventListener('click', () => {
      state.activeTab = 'home';
      state.isMobileMenuOpen = false;
      renderApp();
    });
  }

  // Navigation Links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetNav = e.currentTarget.getAttribute('data-nav');
      if (targetNav) {
        // Check if route requires authentication
        const protectedRoutes = ['predict', 'quantum', 'history'];
        if (protectedRoutes.includes(targetNav) && !state.currentUser) {
          // Open auth modal instead of navigating
          state.isAuthModalOpen = true;
          state.authMode = 'login';
          state.isMobileMenuOpen = false;
          renderApp();
          return;
        }
        state.activeTab = targetNav;
        if (targetNav === 'predict' && state.predictStep === 0) {
          state.predictStep = 1;
        }
        state.isMobileMenuOpen = false;
        renderApp();
      }
    });
  });

  // Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-toggle-btn');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen;
      const navLinks = document.getElementById('nav-links-list');
      if (navLinks) {
        navLinks.classList.toggle('open', state.isMobileMenuOpen);
        mobileToggle.textContent = state.isMobileMenuOpen ? '✕' : '☰';
      }
    });
  }

  // Dark / Light Theme Toggle Button
  const themeToggle = document.getElementById('theme-toggle-btn');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('qbindai_theme', state.theme);
      document.documentElement.setAttribute('data-theme', state.theme);
      renderApp();
    });
  }

  // Auth Button
  const authBtn = document.getElementById('open-auth-btn');
  if (authBtn) {
    authBtn.addEventListener('click', () => {
      state.isAuthModalOpen = true;
      renderApp();
    });
  }

  const closeAuthBtn = document.getElementById('close-auth-modal-btn');
  if (closeAuthBtn) {
    closeAuthBtn.addEventListener('click', () => {
      state.isAuthModalOpen = false;
      renderApp();
    });
  }

  const authBackdrop = document.getElementById('auth-modal-backdrop');
  if (authBackdrop) {
    authBackdrop.addEventListener('click', (e) => {
      if (e.target === authBackdrop) {
        state.isAuthModalOpen = false;
        renderApp();
      }
    });
  }

  // Auth Mode Transitions
  const gotoSignupBtn = document.getElementById('goto-signup-btn');
  if (gotoSignupBtn) {
    gotoSignupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      state.authMode = 'signup';
      state.authError = null;
      state.authSuccess = null;
      renderApp();
    });
  }

  const gotoLoginBtn = document.getElementById('goto-login-btn');
  if (gotoLoginBtn) {
    gotoLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      state.authMode = 'login';
      state.authError = null;
      state.authSuccess = null;
      renderApp();
    });
  }

  const gotoForgotBtn = document.getElementById('goto-forgot-btn');
  if (gotoForgotBtn) {
    gotoForgotBtn.addEventListener('click', (e) => {
      e.preventDefault();
      state.authMode = 'forgot';
      state.authError = null;
      state.authSuccess = null;
      renderApp();
    });
  }

  // Password Visibility Toggles
  const bindPasswordToggle = (btnId, inputId) => {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (btn && input) {
      btn.addEventListener('click', () => {
        state.showPassword = !state.showPassword;
        input.type = state.showPassword ? 'text' : 'password';
        btn.textContent = state.showPassword ? '👁' : '👁‍🗨';
      });
    }
  };
  bindPasswordToggle('toggle-login-password-btn', 'auth-login-password');
  bindPasswordToggle('toggle-signup-password-btn', 'auth-signup-password');
  bindPasswordToggle('toggle-reset-password-btn', 'auth-reset-password');

  // Live Password Strength Indicator for Signup
  const signupPwInput = document.getElementById('auth-signup-password');
  if (signupPwInput) {
    signupPwInput.addEventListener('input', (e) => {
      const val = e.target.value;
      const { rules, percent, color } = checkPasswordStrength(val);
      const fill = document.getElementById('signup-strength-fill');
      if (fill) {
        fill.style.width = `${percent}%`;
        fill.style.backgroundColor = color;
      }
      const updateRule = (id, valid) => {
        const el = document.getElementById(id);
        if (el) {
          el.className = `strength-rule-item ${valid ? 'valid' : ''}`;
          el.innerHTML = `<span>${valid ? '✓' : '○'}</span> ${el.textContent.slice(2)}`;
        }
      };
      updateRule('rule-length', rules.length);
      updateRule('rule-upper', rules.upper);
      updateRule('rule-lower', rules.lower);
      updateRule('rule-digit', rules.digit);
      updateRule('rule-special', rules.special);
    });
  }

  // Live Password Strength Indicator for Password Reset
  const resetPwInput = document.getElementById('auth-reset-password');
  if (resetPwInput) {
    resetPwInput.addEventListener('input', (e) => {
      const val = e.target.value;
      const { rules, percent, color } = checkPasswordStrength(val);
      const fill = document.getElementById('reset-strength-fill');
      if (fill) {
        fill.style.width = `${percent}%`;
        fill.style.backgroundColor = color;
      }
      const updateRule = (id, valid) => {
        const el = document.getElementById(id);
        if (el) {
          el.className = `strength-rule-item ${valid ? 'valid' : ''}`;
          el.innerHTML = `<span>${valid ? '✓' : '○'}</span> ${el.textContent.slice(2)}`;
        }
      };
      updateRule('reset-rule-length', rules.length);
      updateRule('reset-rule-upper', rules.upper);
      updateRule('reset-rule-lower', rules.lower);
      updateRule('reset-rule-digit', rules.digit);
      updateRule('reset-rule-special', rules.special);
    });
  }

  // Form Submissions
  // 1. Login Form Submission
  const loginForm = document.getElementById('auth-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-login-email')?.value.trim();
      const password = document.getElementById('auth-login-password')?.value;
      if (!email || !password) {
        state.authError = 'Please provide both email and password.';
        renderApp();
        return;
      }
      apiLogin(email, password);
    });
  }

  // 2. Sign Up Form Submission
  const signupForm = document.getElementById('auth-signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('auth-signup-name')?.value.trim();
      const email = document.getElementById('auth-signup-email')?.value.trim();
      const password = document.getElementById('auth-signup-password')?.value;
      const confirm = document.getElementById('auth-signup-confirm-password')?.value;

      if (!name || !email || !password || !confirm) {
        state.authError = 'Please fill out all required fields.';
        renderApp();
        return;
      }
      if (password !== confirm) {
        state.authError = 'Passwords do not match.';
        renderApp();
        return;
      }
      const strength = checkPasswordStrength(password);
      if (!strength.isValid) {
        state.authError = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
        renderApp();
        return;
      }
      apiRegister(name, email, password);
    });
  }

  // 3. Email Verification Form Submission
  const verifyForm = document.getElementById('auth-verify-form');
  if (verifyForm) {
    verifyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-verify-email-input')?.value.trim() || state.authVerificationEmail;
      const code = document.getElementById('auth-verify-code-input')?.value.trim();
      if (!code || code.length !== 6) {
        state.authError = 'Please enter the 6-digit confirmation code.';
        renderApp();
        return;
      }
      apiVerifyEmail(email, code);
    });
  }

  // Resend verification code button
  const resendBtn = document.getElementById('resend-verification-btn');
  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      const email = state.authVerificationEmail || document.getElementById('auth-verify-email-input')?.value.trim();
      if (email) {
        apiResendVerification(email);
      }
    });
  }

  // 4. Forgot Password Form Submission
  const forgotForm = document.getElementById('auth-forgot-form');
  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-forgot-email')?.value.trim();
      if (!email) {
        state.authError = 'Please enter your account email address.';
        renderApp();
        return;
      }
      apiForgotPassword(email);
    });
  }

  // 5. Reset Password Form Submission
  const resetForm = document.getElementById('auth-reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-reset-email-input')?.value.trim() || state.authVerificationEmail;
      const code = document.getElementById('auth-reset-code-input')?.value.trim();
      const newPassword = document.getElementById('auth-reset-password')?.value;
      const confirm = document.getElementById('auth-reset-confirm-password')?.value;

      if (!code || code.length !== 6) {
        state.authError = 'Please enter the 6-digit reset code.';
        renderApp();
        return;
      }
      if (newPassword !== confirm) {
        state.authError = 'Passwords do not match.';
        renderApp();
        return;
      }
      const strength = checkPasswordStrength(newPassword);
      if (!strength.isValid) {
        state.authError = 'New password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
        renderApp();
        return;
      }
      apiResetPassword(email, code, newPassword);
    });
  }

  // Resend reset code button
  const resendResetBtn = document.getElementById('resend-reset-btn');
  if (resendResetBtn) {
    resendResetBtn.addEventListener('click', () => {
      const email = state.authVerificationEmail || document.getElementById('auth-reset-email-input')?.value.trim();
      if (email) {
        apiForgotPassword(email);
      }
    });
  }

  // User Profile Dropdown in Navbar
  const userMenuBtn = document.getElementById('user-profile-menu-btn');
  if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.isUserMenuOpen = !state.isUserMenuOpen;
      renderApp();
    });
  }

  const logoutBtn = document.getElementById('dropdown-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      apiLogout();
    });
  }

  const dropdownVerifyBtn = document.getElementById('dropdown-verify-btn');
  if (dropdownVerifyBtn) {
    dropdownVerifyBtn.addEventListener('click', () => {
      if (state.currentUser) {
        state.authVerificationEmail = state.currentUser.email;
        state.authMode = 'verify';
        state.isAuthModalOpen = true;
        state.isUserMenuOpen = false;
        state.authError = null;
        state.authSuccess = null;
        renderApp();
      }
    });
  }

  const dropdownHistoryBtn = document.getElementById('dropdown-history-btn');
  if (dropdownHistoryBtn) {
    dropdownHistoryBtn.addEventListener('click', () => {
      state.activeTab = 'history';
      state.isUserMenuOpen = false;
      renderApp();
    });
  }

  const dropdownNewPredBtn = document.getElementById('dropdown-new-pred-btn');
  if (dropdownNewPredBtn) {
    dropdownNewPredBtn.addEventListener('click', () => {
      state.activeTab = 'predict';
      state.predictStep = 1;
      state.isUserMenuOpen = false;
      renderApp();
    });
  }

  // Home CTAs
  const homeStartBtn = document.getElementById('home-start-prediction-btn');
  if (homeStartBtn) {
    homeStartBtn.addEventListener('click', () => {
      if (!state.currentUser) {
        state.isAuthModalOpen = true;
        state.authMode = 'login';
        renderApp();
        return;
      }
      state.activeTab = 'predict';
      state.predictStep = 1;
      renderApp();
    });
  }

  const homeLearnMore = document.getElementById('home-learn-more-btn');
  if (homeLearnMore) {
    homeLearnMore.addEventListener('click', () => {
      const optionsEl = document.getElementById('platform-options');
      if (optionsEl) {
        optionsEl.scrollIntoView({ behavior: 'smooth' });
      } else {
        state.activeTab = 'about';
        renderApp();
      }
    });
  }

  // Home: Available Website Options & Capabilities Card Click Navigation
  document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', () => {
      const navTarget = card.getAttribute('data-nav-target') || 'predict';
      const stepTarget = parseInt(card.getAttribute('data-step-target') || '1', 10);
      
      // Check if route requires authentication
      const protectedRoutes = ['predict', 'quantum', 'history'];
      if (protectedRoutes.includes(navTarget) && !state.currentUser) {
        state.isAuthModalOpen = true;
        state.authMode = 'login';
        renderApp();
        return;
      }
      
      state.activeTab = navTarget;
      if (navTarget === 'predict') {
        state.predictStep = stepTarget;
      }
      renderApp();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Stepper Indicators
  document.querySelectorAll('.step-indicator').forEach(stepEl => {
    stepEl.addEventListener('click', () => {
      const stepNum = parseInt(stepEl.getAttribute('data-step'), 10);
      if (stepNum) {
        state.predictStep = stepNum;
        renderApp();
      }
    });
  });

  // Screen 2: Run Prediction
  const runPredictionBtn = document.getElementById('run-prediction-btn');
  if (runPredictionBtn) {
    runPredictionBtn.addEventListener('click', () => {
      executePredictionPipeline();
    });
  }

  // Screen 2: Upload FASTA trigger
  const triggerFasta = document.getElementById('trigger-fasta-upload');
  const fastaFile = document.getElementById('fasta-file-upload');
  if (triggerFasta && fastaFile) {
    triggerFasta.addEventListener('click', () => fastaFile.click());
    fastaFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const fastaArea = document.getElementById('fasta-input');
          if (fastaArea) fastaArea.value = event.target.result;
        };
        reader.readAsText(file);
      }
    });
  }

  // Screen 2: Upload Ligand trigger
  const triggerLigand = document.getElementById('trigger-ligand-upload');
  const ligandFile = document.getElementById('ligand-file-upload');
  if (triggerLigand && ligandFile) {
    triggerLigand.addEventListener('click', () => ligandFile.click());
    ligandFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const smilesInput = document.getElementById('smiles-input');
          if (smilesInput) smilesInput.value = `UPLOADED: ${file.name}`;
        };
        reader.readAsText(file);
      }
    });
  }

  // Screen 4: Ribbon / Surface / Cartoon Toggle
  const ribbonBtn = document.getElementById('view-mode-ribbon-btn');
  const surfaceBtn = document.getElementById('view-mode-surface-btn');
  const cartoonBtn = document.getElementById('view-mode-cartoon-btn');

  if (ribbonBtn && surfaceBtn) {
    ribbonBtn.addEventListener('click', () => {
      state.structureViewMode = 'ribbon';
      ribbonBtn.classList.add('active');
      surfaceBtn.classList.remove('active');
      if (cartoonBtn) cartoonBtn.classList.remove('active');
      if (state.activeViewerInstance) {
        state.activeViewerInstance.setMode('ribbon');
      }
    });

    surfaceBtn.addEventListener('click', () => {
      state.structureViewMode = 'surface';
      surfaceBtn.classList.add('active');
      ribbonBtn.classList.remove('active');
      if (cartoonBtn) cartoonBtn.classList.remove('active');
      if (state.activeViewerInstance) {
        state.activeViewerInstance.setMode('surface');
      }
    });

    if (cartoonBtn) {
      cartoonBtn.addEventListener('click', () => {
        state.structureViewMode = 'cartoon';
        cartoonBtn.classList.add('active');
        ribbonBtn.classList.remove('active');
        surfaceBtn.classList.remove('active');
        if (state.activeViewerInstance) {
          state.activeViewerInstance.setMode('cartoon');
        }
      });
    }
  }

  // Screen 4: Download PDB
  const downloadPdbBtn = document.getElementById('download-pdb-btn');
  if (downloadPdbBtn) {
    downloadPdbBtn.addEventListener('click', () => {
      downloadSamplePDB();
    });
  }

  // Screen 5: Binding Site Pocket Selection
  document.querySelectorAll('.pocket-site-card').forEach(card => {
    card.addEventListener('click', () => {
      const pocketId = card.getAttribute('data-pocket-id');
      if (pocketId) {
        state.selectedPocketSite = pocketId;
        renderApp();
      }
    });
  });

  // Screen 6: Molecular Docking Pose Selection
  document.querySelectorAll('.pose-card-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const poseId = parseInt(btn.getAttribute('data-pose-id'), 10);
      if (poseId) {
        state.selectedDockingPose = poseId;
        renderApp();
      }
    });
  });

  // Step Navigation: Next to Representation from Input
  const nextToRepBtn = document.getElementById('next-to-representation-btn');
  if (nextToRepBtn) {
    nextToRepBtn.addEventListener('click', () => {
      state.predictStep = 2;
      renderApp();
    });
  }

  // Step Navigation: Generic Previous / Next Buttons
  document.querySelectorAll('.btn-step-prev').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.predictStep > 1) {
        state.predictStep--;
        renderApp();
      }
    });
  });

  document.querySelectorAll('.btn-step-next:not(#next-to-representation-btn):not(#new-prediction-btn)').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.predictStep < 7) {
        state.predictStep++;
        renderApp();
      }
    });
  });

  // Step 9: Start New Prediction
  const newPredictionBtn = document.getElementById('new-prediction-btn');
  if (newPredictionBtn) {
    newPredictionBtn.addEventListener('click', () => {
      state.predictStep = 1;
      renderApp();
    });
  }

  // Screen 9: History View Buttons
  document.querySelectorAll('.action-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!state.currentUser) {
        state.isAuthModalOpen = true;
        state.authMode = 'login';
        renderApp();
        return;
      }
      const id = parseInt(btn.getAttribute('data-history-id'), 10);
      const proteinMap = { 1: 'P00123', 2: 'BRCA1', 3: 'CDK2' };
      state.selectedProteinKey = proteinMap[id] || 'P00123';
      state.activeTab = 'predict';
      state.predictStep = 7; // Final prediction view
      renderApp();
    });
  });

  // Close User Menu on Outside Click
  document.addEventListener('click', (e) => {
    if (state.isUserMenuOpen && !e.target.closest('.user-nav-dropdown-container')) {
      state.isUserMenuOpen = false;
      const menu = document.getElementById('user-dropdown-menu');
      if (menu) menu.classList.remove('open');
    }
  });
}

// Initial Boot
renderApp();

// Verify existing session on initial boot
if (state.sessionToken) {
  apiCheckSession();
}
