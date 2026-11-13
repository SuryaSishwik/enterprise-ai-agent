import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Layers,
  Bot,
  Sparkles,
  Database,
  BookOpen,
  FileText,
  UploadCloud,
  Ticket,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Search,
  Sliders,
  Settings,
  Key,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  Zap,
  AlertTriangle,
  Send,
  User,
  Filter,
  Plus,
  Terminal,
  Activity,
  Server
} from 'lucide-react';
import './index.css';

const API_BASE = "http://localhost:8000";

export default function App() {
  const [activeTab, setActiveTab] = useState('chat'); // dashboard | chat | knowledge | upload | tickets | remote | settings
  const [currentUser, setCurrentUser] = useState({
    email: 'alex.smith@enterprise.ai',
    name: 'Alex Smith',
    role: 'EMPLOYEE',
    department: 'Core Infrastructure'
  });

  // System Stats & Data
  const [stats, setStats] = useState({ total_documents: 3, total_vector_chunks: 13, collection_name: 'enterprise_knowledge' });
  const [documents, setDocuments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [remoteRequests, setRemoteRequests] = useState([]);
  const [providersData, setProvidersData] = useState({ active_provider: 'openai', providers: [] });
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Chat Workspace States
  const [messages, setMessages] = useState([
    {
      id: 'm-init',
      sender: 'ai',
      text: "Hello Alex, I am your **Enterprise AI Knowledge & Automation Agent**.\n\nI am connected to your enterprise knowledge base (HR, IT, Remote policies) via **ChromaDB RAG** and authorized to execute actions via **LangGraph Tool Callers**.",
      intent: 'KNOWLEDGE_QUERY',
      timestamp: 'Just now',
      citations: [
        { source: 'HR_Leave_and_Attendance_Policy_2026.pdf', page: 1, snippet: 'Employees are entitled to 18 paid leaves annually accrued at 1.5 days per month.' }
      ],
      tool_results: []
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeExecutionStep, setActiveExecutionStep] = useState(null);
  const messagesEndRef = useRef(null);

  // Document Upload States
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Ticket Modal States
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({ title: '', description: '', category: 'IT Support', priority: 'Medium' });

  // Settings State
  const [activeProviderSelection, setActiveProviderSelection] = useState('openai');
  const [tempApiKey, setTempApiKey] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchStats(),
      fetchDocuments(),
      fetchTickets(),
      fetchRemoteRequests(),
      fetchProviders()
    ]);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/documents/stats`);
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.warn("API offline or starting:", e);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/documents`);
      if (res.ok) setDocuments(await res.json());
    } catch (e) {
      console.warn("Could not load documents:", e);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tickets`);
      if (res.ok) setTickets(await res.json());
    } catch (e) {
      console.warn("Could not load tickets:", e);
    }
  };

  const fetchRemoteRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/requests/remote`);
      if (res.ok) setRemoteRequests(await res.json());
    } catch (e) {
      console.warn("Could not load remote requests:", e);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ai/providers`);
      if (res.ok) {
        const d = await res.json();
        setProvidersData(d);
        setActiveProviderSelection(d.active_provider);
      }
    } catch (e) {
      console.warn("Could not load providers:", e);
    }
  };

  const toggleUserRole = () => {
    if (currentUser.role === 'EMPLOYEE') {
      setCurrentUser({
        email: 'admin@enterprise.ai',
        name: 'Enterprise Admin',
        role: 'ADMIN',
        department: 'Operations & IT Security'
      });
    } else {
      setCurrentUser({
        email: 'alex.smith@enterprise.ai',
        name: 'Alex Smith',
        role: 'EMPLOYEE',
        department: 'Core Infrastructure'
      });
    }
  };

  const handleSendMessage = async (overridePrompt = null) => {
    const prompt = overridePrompt || inputText;
    if (!prompt.trim() || isLoading) return;

    const userMessageId = `u-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: userMessageId,
        sender: 'user',
        text: prompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    if (!overridePrompt) setInputText('');
    setIsLoading(true);
    setActiveExecutionStep('Routing request through LangGraph StateGraph...');

    try {
      setTimeout(() => setActiveExecutionStep('Querying ChromaDB vector database & evaluating tools...'), 600);

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMessageId = `ai-${Date.now()}`;
        setMessages(prev => [
          ...prev,
          {
            id: aiMessageId,
            sender: 'ai',
            text: data.response,
            intent: data.intent,
            citations: data.citations || [],
            tool_results: data.tool_results || [],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);

        if (data.citations && data.citations.length > 0) {
          setSelectedCitation(data.citations[0]);
        }

        if (data.tool_results && data.tool_results.length > 0) {
          fetchTickets();
          fetchRemoteRequests();
        }
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'ai',
            text: "Service error: The backend API returned an unexpected response code.",
            intent: 'ERROR',
            timestamp: 'Now',
            citations: [],
            tool_results: []
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: `Connection failed: ${err.message}. Please verify FastAPI is running at http://localhost:8000.`,
          intent: 'ERROR',
          timestamp: 'Now',
          citations: [],
          tool_results: []
        }
      ]);
    } finally {
      setIsLoading(false);
      setActiveExecutionStep(null);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsUploading(true);
    setUploadStatus({ type: 'info', message: 'Extracting text with PyMuPDF, generating embeddings & upserting to ChromaDB...' });

    try {
      const res = await fetch(`${API_BASE}/api/documents/upload`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setUploadStatus({
          type: 'success',
          message: `Successfully indexed ${data.chunks_created} vector chunks from '${selectedFile.name}' into ChromaDB!`
        });
        setSelectedFile(null);
        fetchDocuments();
        fetchStats();
      } else {
        const err = await res.json();
        setUploadStatus({ type: 'error', message: err.detail || 'Upload failed' });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', message: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketForm.title.trim() || !ticketForm.description.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ticketForm,
          user_email: currentUser.email
        })
      });

      if (res.ok) {
        setIsTicketModalOpen(false);
        setTicketForm({ title: '', description: '', category: 'IT Support', priority: 'Medium' });
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProviderSwitch = async (providerId) => {
    setActiveProviderSelection(providerId);
    try {
      const res = await fetch(`${API_BASE}/api/ai/select-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          api_key: tempApiKey.trim() || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSettingsMessage(`Active model provider switched to: ${providerId.toUpperCase()}`);
        fetchProviders();
        setTimeout(() => setSettingsMessage(''), 4000);
      }
    } catch (err) {
      setSettingsMessage(`Error updating provider: ${err.message}`);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090a0f] text-slate-100 antialiased font-sans">
      {/* =========================================================================
          LEFT NAVIGATION RAIL & SIDEBAR (21st.dev Style)
         ========================================================================= */}
      <aside className="w-72 flex-shrink-0 bg-[#0d1017] border-r border-zinc-800/80 flex flex-col justify-between select-none">
        <div>
          {/* Organization & Workspace Brand Header */}
          <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
                <div className="h-full w-full bg-[#0d1017] rounded-[11px] flex items-center justify-center">
                  <Bot className="h-5 w-5 text-indigo-400" />
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                  AidenAI Enterprise
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">v2.4</span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">Agent & RAG Ops</div>
              </div>
            </div>
          </div>

          {/* Quick Search / Command Palette Bar */}
          <div className="px-4 py-3">
            <button
              onClick={() => setActiveTab('chat')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 text-xs text-zinc-400 transition-all group"
            >
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-300" />
                Ask or search actions...
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400 border border-zinc-700">⌘K</kbd>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-6 mt-2">
            <div>
              <div className="px-3 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase mb-2">Core Agentic Ops</div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span>Operations Center</span>
                </button>

                <button
                  onClick={() => setActiveTab('chat')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'chat'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <span>Agent Workspace</span>
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </button>
              </div>
            </div>

            <div>
              <div className="px-3 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase mb-2">RAG Knowledge Base</div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('knowledge')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'knowledge'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4" />
                    <span>Policy Repository</span>
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                    {stats.total_documents || documents.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('upload')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'upload'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <UploadCloud className="h-4 w-4" />
                    <span>Document Ingestion</span>
                  </span>
                  {currentUser.role !== 'ADMIN' && (
                    <span className="text-[10px] font-mono text-amber-500">Admin</span>
                  )}
                </button>
              </div>
            </div>

            <div>
              <div className="px-3 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase mb-2">Enterprise Automations</div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'tickets'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Ticket className="h-4 w-4" />
                    <span>IT Service Desk</span>
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                    {tickets.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('remote')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'remote'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4" />
                    <span>Workforce Mobility</span>
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                    {remoteRequests.length}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <div className="px-3 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase mb-2">Configuration</div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'settings'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Key className="h-4 w-4 text-amber-400" />
                  <span>Model & API Gateway</span>
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* User Identity & System Footprint */}
        <div className="p-3 border-t border-zinc-800/80 bg-[#090b10]">
          <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/90 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-400">
                {currentUser.name.charAt(0)}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
                <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${currentUser.role === 'ADMIN' ? 'bg-amber-400' : 'bg-cyan-400'}`}></span>
                  {currentUser.role}
                </div>
              </div>
            </div>
            <button
              onClick={toggleUserRole}
              title="Toggle role between Employee and Admin"
              className="px-2 py-1 text-[10px] font-mono rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              Switch
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN APPLICATION VIEWPORT
         ========================================================================= */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#090a0f]">
        {/* Top Operational Bar */}
        <header className="h-14 border-b border-zinc-800/80 bg-[#0c0e14]/90 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              {activeTab === 'dashboard' && 'Executive Operations & System Health'}
              {activeTab === 'chat' && 'Agentic Workspace (RAG + LangGraph Tool Execution)'}
              {activeTab === 'knowledge' && 'Corporate Knowledge Vault & Vector Registry'}
              {activeTab === 'upload' && 'PyMuPDF Ingestion & Embeddings Pipeline'}
              {activeTab === 'tickets' && 'IT Support Automation & Service Desk'}
              {activeTab === 'remote' && 'Workforce Mobility & Leave Management'}
              {activeTab === 'settings' && 'Universal AI Model Gateway & Environment'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Model Pill */}
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 font-mono transition-all"
            >
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span>Model: <span className="text-white font-semibold">{providersData.active_provider.toUpperCase()}</span></span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            </button>

            {/* Quick Refresh */}
            <button
              onClick={fetchAllData}
              title="Refresh all real-time stats"
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Dynamic Viewport Container */}
        <div className="flex-1 overflow-y-auto">
          {/* =====================================================================
              VIEW 1: EXECUTIVE OPERATIONS CENTER (DASHBOARD)
             ===================================================================== */}
          {activeTab === 'dashboard' && (
            <div className="p-8 max-w-7xl mx-auto space-y-8">
              {/* Metric KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all shadow-sm">
                  <div className="flex items-center justify-between text-zinc-400 mb-3">
                    <span className="text-xs font-medium">Indexed Knowledge</span>
                    <BookOpen className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">{stats.total_documents || documents.length} Policies</div>
                  <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" /> PyMuPDF Parsed
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all shadow-sm">
                  <div className="flex items-center justify-between text-zinc-400 mb-3">
                    <span className="text-xs font-medium">ChromaDB Vectors</span>
                    <Database className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">{stats.total_vector_chunks || 13} Chunks</div>
                  <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span> 1536-dim Cosine Space
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all shadow-sm">
                  <div className="flex items-center justify-between text-zinc-400 mb-3">
                    <span className="text-xs font-medium">Service Desk Tickets</span>
                    <Ticket className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">{tickets.length} Active</div>
                  <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span> Auto-routed via Tools
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all shadow-sm">
                  <div className="flex items-center justify-between text-zinc-400 mb-3">
                    <span className="text-xs font-medium">Workforce Mobility</span>
                    <Briefcase className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">{remoteRequests.length} Requests</div>
                  <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Hybrid Policy Compliant
                  </div>
                </div>
              </div>

              {/* Agentic Pipeline Topology Visualizer */}
              <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/90 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Zap className="h-4 w-4 text-indigo-400" />
                      Live Agentic Topology (LangGraph StateGraph Orchestration)
                    </h2>
                    <p className="text-xs text-zinc-400">Visual mapping of request routing, retrieval augmented generation, and business action execution.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    System Healthy
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                  <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-zinc-400 mb-1">Step 1</div>
                      <div className="text-xs font-semibold text-white">Client Query</div>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-3 font-mono">FastAPI /api/chat</div>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-indigo-400 mb-1">Step 2</div>
                      <div className="text-xs font-semibold text-indigo-300">LangGraph Router</div>
                    </div>
                    <div className="text-[11px] text-indigo-400/80 mt-3 font-mono">Intent Classification</div>
                  </div>

                  <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-cyan-400 mb-1">Step 3A (RAG)</div>
                      <div className="text-xs font-semibold text-cyan-300">ChromaDB Vector Store</div>
                    </div>
                    <div className="text-[11px] text-cyan-400/80 mt-3 font-mono">Cosine Semantic K=4</div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-amber-400 mb-1">Step 3B (Agent)</div>
                      <div className="text-xs font-semibold text-amber-300">LangChain Tools</div>
                    </div>
                    <div className="text-[11px] text-amber-400/80 mt-3 font-mono">PostgreSQL Execution</div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-emerald-400 mb-1">Step 4</div>
                      <div className="text-xs font-semibold text-emerald-300">Response Synthesizer</div>
                    </div>
                    <div className="text-[11px] text-emerald-400/80 mt-3 font-mono">Grounded Citations</div>
                  </div>
                </div>
              </div>

              {/* Quick Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => { setActiveTab('chat'); handleSendMessage("How many paid leaves can I take in a year?"); }}
                  className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-indigo-500/50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between text-indigo-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Test RAG Pipeline</span>
                    <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <div className="text-sm font-semibold text-white">"How many paid leaves can I take in a year?"</div>
                  <p className="text-xs text-zinc-400 mt-2">Demonstrates vector similarity retrieval against HR policy with source citations.</p>
                </div>

                <div
                  onClick={() => { setActiveTab('chat'); handleSendMessage("Create a support ticket because I cannot access my company account."); }}
                  className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-amber-500/50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between text-amber-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Test Agentic Tool</span>
                    <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <div className="text-sm font-semibold text-white">"Create a support ticket: cannot access company account"</div>
                  <p className="text-xs text-zinc-400 mt-2">Tests intent parsing, parameter extraction, and PostgreSQL transaction.</p>
                </div>

                <div
                  onClick={() => { setActiveTab('chat'); handleSendMessage("Summarize the company's work-from-home policy and create a request for working remotely next Monday."); }}
                  className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-cyan-500/50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between text-cyan-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Test Hybrid Workflow</span>
                    <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <div className="text-sm font-semibold text-white">"Summarize WFH policy & submit remote request"</div>
                  <p className="text-xs text-zinc-400 mt-2">Orchestrates knowledge retrieval and business task execution in one multi-node graph.</p>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 2: DUAL-PANE AGENT WORKSPACE (ASK AI)
             ===================================================================== */}
          {activeTab === 'chat' && (
            <div className="h-full flex overflow-hidden">
              {/* Primary Chat Conversation Pane */}
              <div className="flex-1 flex flex-col h-full bg-[#090a0f] border-r border-zinc-800/80">
                {/* Conversation Stream */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex gap-3.5 max-w-3xl ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        m.sender === 'user'
                          ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      }`}>
                        {m.sender === 'user' ? 'U' : <Bot className="h-4 w-4" />}
                      </div>

                      <div className={`space-y-2 max-w-[85%] ${m.sender === 'user' ? 'items-end' : ''}`}>
                        {/* Meta bar */}
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                          <span className="font-semibold text-zinc-300">{m.sender === 'user' ? currentUser.name : 'Enterprise Agent'}</span>
                          <span>•</span>
                          <span>{m.timestamp}</span>

                          {m.intent && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider ${
                              m.intent === 'KNOWLEDGE_QUERY' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                              m.intent === 'BUSINESS_ACTION' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              m.intent === 'HYBRID' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                              'bg-zinc-800 text-zinc-400'
                            }`}>
                              {m.intent.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        {/* Content Card */}
                        <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          m.sender === 'user'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 rounded-tr-none'
                            : 'bg-zinc-900/90 border border-zinc-800/90 text-zinc-200 shadow-sm rounded-tl-none whitespace-pre-line'
                        }`}>
                          {m.text}

                          {/* Citations Chips */}
                          {m.citations && m.citations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-zinc-800/80">
                              <div className="text-[11px] font-mono text-zinc-400 mb-1.5 flex items-center gap-1.5">
                                <FileText className="h-3 w-3 text-indigo-400" />
                                <span>Verified Sources ({m.citations.length}):</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {m.citations.map((c, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setSelectedCitation(c)}
                                    className="px-2 py-1 rounded bg-zinc-800/90 hover:bg-zinc-700/80 border border-zinc-700/60 text-[11px] text-zinc-300 font-mono flex items-center gap-1 transition-colors"
                                  >
                                    <span className="truncate max-w-[180px]">{c.source}</span>
                                    <span className="text-indigo-400 font-semibold">(p.{c.page})</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Copy button */}
                          {m.sender === 'ai' && (
                            <div className="mt-2 flex justify-end">
                              <button
                                onClick={() => copyToClipboard(m.text, m.id)}
                                className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                              >
                                {copiedId === m.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                {copiedId === m.id ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Active Processing Step Card */}
                  {isLoading && (
                    <div className="flex gap-3.5 max-w-3xl">
                      <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 animate-pulse">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="p-3.5 rounded-2xl rounded-tl-none bg-zinc-900/90 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2.5 font-mono shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping"></span>
                        <span>{activeExecutionStep || 'Orchestrating agent workflow...'}</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Command Dock */}
                <div className="p-4 border-t border-zinc-800/80 bg-[#0c0e14] space-y-3">
                  {/* Preset Action Pills */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      onClick={() => handleSendMessage("How many paid leaves can I take in a year?")}
                      className="whitespace-nowrap px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-300 transition-all font-mono"
                    >
                      🏖️ Paid Leaves Allowance
                    </button>
                    <button
                      onClick={() => handleSendMessage("Create a support ticket because I cannot access my company account.")}
                      className="whitespace-nowrap px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-300 transition-all font-mono"
                    >
                      🎫 Account Lockout Ticket
                    </button>
                    <button
                      onClick={() => handleSendMessage("Summarize the company's work-from-home policy and create a request for working remotely next Monday.")}
                      className="whitespace-nowrap px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-300 transition-all font-mono"
                    >
                      🏠 WFH Summary & Request
                    </button>
                    <button
                      onClick={() => handleSendMessage("What is the equipment reimbursement allowance for remote work?")}
                      className="whitespace-nowrap px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-300 transition-all font-mono"
                    >
                      💰 Equipment Reimbursement
                    </button>
                  </div>

                  {/* Input Box */}
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      className="w-full bg-zinc-900/90 text-zinc-100 placeholder-zinc-500 text-xs sm:text-sm rounded-xl pl-4 pr-12 py-3.5 border border-zinc-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans"
                      placeholder="Ask any policy question or ask the agent to execute an action..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={isLoading || !inputText.trim()}
                      className="absolute right-2 h-8 w-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white flex items-center justify-center transition-all shadow-sm shadow-indigo-600/30"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Diagnostic & Citation Inspector Pane (21st.dev Style) */}
              <div className="w-80 flex-shrink-0 bg-[#0d1017] p-5 overflow-y-auto space-y-6 hidden lg:block">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Agent Runtime Telemetry</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Intelligence Node:</span>
                      <span className="text-indigo-400 font-semibold">{providersData.active_provider.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Router State:</span>
                      <span className="text-emerald-400">LangGraph Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Retrieval Vector DB:</span>
                      <span className="text-cyan-400">ChromaDB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Persistence DB:</span>
                      <span className="text-amber-400">PostgreSQL</span>
                    </div>
                  </div>
                </div>

                {/* Selected Citation Inspector */}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Selected Document Citation</span>
                  </div>
                  {selectedCitation ? (
                    <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white truncate max-w-[180px]">{selectedCitation.source}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                          Page {selectedCitation.page}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60 leading-relaxed font-mono">
                        "{selectedCitation.snippet}"
                      </p>
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="h-3 w-3" /> Grounded in official document
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50 text-center text-xs text-zinc-400 font-mono">
                      Click any citation chip in chat to inspect chunk details.
                    </div>
                  )}
                </div>

                {/* Live Model Gateway Switcher Shortcut */}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-amber-400" />
                    <span>Quick Model Switch</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {['openai', 'gemini', 'nvidia', 'grok'].map((p) => (
                      <button
                        key={p}
                        onClick={() => handleProviderSwitch(p)}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          providersData.active_provider === p
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-semibold'
                            : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 3: POLICY REPOSITORY (KNOWLEDGE BASE)
             ===================================================================== */}
          {activeTab === 'knowledge' && (
            <div className="p-8 max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Corporate Knowledge Vault</h2>
                  <p className="text-xs text-zinc-400">Indexed policy documents available for semantic similarity retrieval and agent grounding.</p>
                </div>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-2 transition-all shadow-sm shadow-indigo-600/30"
                >
                  <Plus className="h-4 w-4" /> Upload Document
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 overflow-hidden shadow-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-4">Document Title</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">ChromaDB Chunks</th>
                      <th className="p-4">Uploaded By</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{doc.filename}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">{(doc.file_size_bytes / 1024).toFixed(1)} KB</div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-zinc-300 uppercase">{doc.file_type}</td>
                        <td className="p-4 font-mono">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-400 border border-zinc-700/60 font-semibold">
                            {doc.chunk_count} Chunks
                          </span>
                        </td>
                        <td className="p-4 text-zinc-300">{doc.uploaded_by}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {doc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 4: DOCUMENT INGESTION (ADMIN ONLY)
             ===================================================================== */}
          {activeTab === 'upload' && (
            <div className="p-8 max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Document Ingestion & Vector Indexing</h2>
                <p className="text-xs text-zinc-400">Extracts text with PyMuPDF, chunks with RecursiveCharacterTextSplitter, embeds, and stores in ChromaDB.</p>
              </div>

              {currentUser.role !== 'ADMIN' ? (
                <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Administrator Access Required</h3>
                    <p className="text-xs text-zinc-400 mt-1">Only administrators can upload and reindex enterprise documents.</p>
                  </div>
                  <button
                    onClick={toggleUserRole}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-sm"
                  >
                    Switch to Administrator Role
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFileUpload} className="space-y-6">
                  <div
                    onClick={() => document.getElementById('doc-file-input').click()}
                    className="border-2 border-dashed border-zinc-800 hover:border-indigo-500/70 bg-zinc-900/30 hover:bg-zinc-900/50 p-12 rounded-2xl text-center cursor-pointer transition-all group"
                  >
                    <UploadCloud className="h-12 w-12 text-indigo-400 mx-auto mb-3 group-hover:scale-105 transition-transform" />
                    <div className="text-sm font-semibold text-white">
                      {selectedFile ? selectedFile.name : 'Click to select or drag PDF / Word document'}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 font-mono">Supports .pdf, .docx, .txt, .md</div>
                    <input
                      id="doc-file-input"
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                    />
                  </div>

                  {uploadStatus && (
                    <div className={`p-4 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                      uploadStatus.type === 'success' ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400' :
                      uploadStatus.type === 'error' ? 'bg-red-950/20 border-red-800/40 text-red-400' :
                      'bg-indigo-950/20 border-indigo-800/40 text-indigo-400'
                    }`}>
                      {uploadStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      <span>{uploadStatus.message}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedFile || isUploading}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white transition-all shadow-sm"
                    >
                      {isUploading ? 'Ingesting Document...' : 'Index into ChromaDB'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* =====================================================================
              VIEW 5: IT SERVICE DESK (SUPPORT TICKETS)
             ===================================================================== */}
          {activeTab === 'tickets' && (
            <div className="p-8 max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">IT Service Desk & Support Tickets</h2>
                  <p className="text-xs text-zinc-400">Tickets created autonomously by the AI Agent or directly submitted by employees.</p>
                </div>
                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-2 transition-all shadow-sm"
                >
                  <Plus className="h-4 w-4" /> New Ticket
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 overflow-hidden shadow-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-4">Ticket ID</th>
                      <th className="p-4">Title & Context</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-4 font-mono font-bold text-white">{t.ticket_code}</td>
                        <td className="p-4">
                          <div className="font-semibold text-zinc-200">{t.title}</div>
                          <div className="text-[11px] text-zinc-400 max-w-md truncate">{t.description}</div>
                        </td>
                        <td className="p-4 text-zinc-300">{t.category}</td>
                        <td className="p-4 font-mono">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            t.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            t.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                            'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {t.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-zinc-400">{new Date(t.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 6: WORKFORCE MOBILITY (REMOTE REQUESTS)
             ===================================================================== */}
          {activeTab === 'remote' && (
            <div className="p-8 max-w-7xl mx-auto space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Workforce Mobility & Leave Registry</h2>
                <p className="text-xs text-zinc-400">Remote work (WFH) schedules and leave approvals managed by the AI Agent workflow.</p>
              </div>

              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 overflow-hidden shadow-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-4">Request Code</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Target Date</th>
                      <th className="p-4">Reason</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {remoteRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-4 font-mono font-bold text-white">{r.request_code}</td>
                        <td className="p-4 font-mono text-indigo-400 uppercase">{r.request_type.replace('_', ' ')}</td>
                        <td className="p-4 font-semibold text-white">{r.target_date}</td>
                        <td className="p-4 text-zinc-300 max-w-md truncate">{r.reason}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {r.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-zinc-400">{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 7: UNIVERSAL AI MODEL SETTINGS & ENV FILE CONFIG
             ===================================================================== */}
          {activeTab === 'settings' && (
            <div className="p-8 max-w-4xl mx-auto space-y-8">
              <div>
                <h2 className="text-lg font-bold text-white">Universal AI Intelligence & Model Gateway</h2>
                <p className="text-xs text-zinc-400">Configure your active model provider. Supports OpenAI, Google Gemini, NVIDIA NIM, xAI Grok, ABAKI, or local engines.</p>
              </div>

              {/* ENV File Path Card */}
              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-2">
                    <Key className="h-4 w-4 text-amber-400" />
                    Environment Configuration File (.env)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Auto-Loaded
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 font-mono text-xs text-zinc-300 border border-zinc-800/60 flex items-center justify-between">
                  <span className="truncate">C:\Users\ASUS\Documents\New project\enterprise-ai-agent\.env</span>
                  <button
                    onClick={() => copyToClipboard('C:\\Users\\ASUS\\Documents\\New project\\enterprise-ai-agent\\.env', 'env-path')}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedId === 'env-path' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Update your API keys directly in this file for production persistence, or switch active providers dynamically below.
                </p>
              </div>

              {/* Supported Providers Grid */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">Select Active Provider</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { id: 'openai', name: 'OpenAI', model: 'gpt-4o', badge: 'Production Standard', desc: 'Standard GPT-4o / GPT-4o-mini tool caller' },
                    { id: 'gemini', name: 'Google Gemini', model: 'gemini-1.5-pro', badge: 'High Context', desc: 'Gemini 1.5 Pro / Flash via Google AI' },
                    { id: 'nvidia', name: 'NVIDIA NIM', model: 'meta/llama-3.1-70b', badge: 'Accelerated', desc: 'NVIDIA hosted LLaMA 3.1 & Nemotron' },
                    { id: 'grok', name: 'xAI Grok', model: 'grok-2-latest', badge: 'Reasoning', desc: 'Grok-2 reasoning & automation engine' },
                    { id: 'abaki', name: 'ABAKI / Custom', model: 'llama-3.3-70b', badge: 'OpenAI Compatible', desc: 'Any custom endpoint (Groq, vLLM, Ollama)' },
                    { id: 'local', name: 'Grounded Local', model: 'enterprise-rag-v1', badge: 'Zero Cost / Offline', desc: 'Deterministic grounded engine for offline testing' }
                  ].map((prov) => (
                    <div
                      key={prov.id}
                      onClick={() => handleProviderSwitch(prov.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        providersData.active_provider === prov.id
                          ? 'bg-indigo-950/30 border-indigo-500/60 shadow-md'
                          : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{prov.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          providersData.active_provider === prov.id
                            ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {prov.badge}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-cyan-400 mb-1">{prov.model}</div>
                      <p className="text-[11px] text-zinc-400">{prov.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {settingsMessage && (
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/40 text-xs font-mono text-indigo-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>{settingsMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          MODAL: DIRECT TICKET CREATION
         ========================================================================= */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#0d1017] border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Ticket className="h-4 w-4 text-indigo-400" /> Create Service Desk Ticket
              </h3>
              <button
                onClick={() => setIsTicketModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. VPN Access Disconnected"
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Category</label>
                <select
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                >
                  <option value="IT Support">IT Support</option>
                  <option value="Account Access">Account Access</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Network">Network</option>
                  <option value="HR Inquiry">HR Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Priority</label>
                <select
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                >
                  <option value="Low">Low (48h SLA)</option>
                  <option value="Medium">Medium (24h SLA)</option>
                  <option value="High">High (8h SLA)</option>
                  <option value="Critical">Critical (4h SLA)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Detailed Description</label>
                <textarea
                  rows="3"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Describe your issue or request..."
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
