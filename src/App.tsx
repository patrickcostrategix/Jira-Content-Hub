import React, { useState, useEffect } from 'react';
import { Layout, Settings, MessageSquare, BarChart3, ChevronRight, AlertCircle, Loader2, Send, Terminal, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { JiraConfig, JiraIssue, ProjectStatus, ChatMessage } from './types';
import { fetchProjectIssues, calculateProjectStatus } from './services/jiraService';
import { analyzeProjectContext } from './services/geminiService';

export default function App() {
  const [config, setConfig] = useState<JiraConfig | null>(null);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Load config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('jira_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        handleRefresh(parsed);
      } catch (e) {
        console.error("Failed to parse saved config");
      }
    }
  }, []);

  const handleSetup = async (newConfig: JiraConfig) => {
    setLoading(true);
    setError(null);
    let sanitizedBaseUrl = newConfig.baseUrl.trim();
    if (!sanitizedBaseUrl.startsWith("http://") && !sanitizedBaseUrl.startsWith("https://")) {
      sanitizedBaseUrl = `https://${sanitizedBaseUrl}`;
    }
    sanitizedBaseUrl = sanitizedBaseUrl.replace(/\/$/, "");
    
    const sanitizedConfig = { ...newConfig, baseUrl: sanitizedBaseUrl };
    
    try {
      const fetchedIssues = await fetchProjectIssues(sanitizedConfig);
      setIssues(fetchedIssues);
      setStatus(calculateProjectStatus(fetchedIssues));
      setConfig(sanitizedConfig);
      localStorage.setItem('jira_config', JSON.stringify(sanitizedConfig));
    } catch (err: any) {
      setError(err.message || "Failed to connect to Jira");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (activeConfig: JiraConfig) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedIssues = await fetchProjectIssues(activeConfig);
      setIssues(fetchedIssues);
      setStatus(calculateProjectStatus(fetchedIssues));
    } catch (err: any) {
      setError(err.message || "Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jira_config');
    setConfig(null);
    setIssues([]);
    setStatus(null);
    setChatMessages([]);
  };

  const handleSendMessage = async (message: string) => {
    const newUserMessage: ChatMessage = { role: 'user', content: message, timestamp: Date.now() };
    setChatMessages(prev => [...prev, newUserMessage]);
    
    try {
      const response = await analyzeProjectContext(issues, message, chatMessages);
      const assistantMessage: ChatMessage = { role: 'assistant', content: response || "I couldn't generate a response.", timestamp: Date.now() };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = { role: 'assistant', content: "Error: " + (err.message || "Something went wrong"), timestamp: Date.now() };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  if (!config) {
    return <SetupScreen onSubmit={handleSetup} loading={loading} error={error} />;
  }

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-200 flex flex-col p-6 gap-6 overflow-hidden font-sans">
      {/* Header Section */}
      <header className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">J</div>
          <div>
            <h1 className="text-xl font-bold leading-tight">JiraContext <span className="text-indigo-400">AI</span></h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Space: {config.projectKey}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => handleRefresh(config)}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold px-4 py-2 rounded-full transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Loader2 className="w-3 h-3 opacity-0" />}
            Sync Workspace
          </button>
          <button 
            onClick={handleLogout}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 group transition-all"
          >
            <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-500" />
          </button>
        </div>
      </header>

      {/* Main Bento Grid */}
      <main className="grid grid-cols-12 grid-rows-6 gap-4 flex-1 overflow-hidden">
        
        {/* Project Context Card */}
        <section className="col-span-4 row-span-2 bg-slate-900 rounded-2xl p-5 border border-slate-800 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Project Overview</span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">ACTIVE</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{config.projectKey} Repository</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monitoring real-time updates and contextual dependencies within the {config.projectKey} workspace. 
              {status && ` Tracking ${status.total} work items across multiple swimlanes.`}
            </p>
          </div>
          <div className="flex gap-4 mt-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
            <div className="flex-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Operational</div>
              <div className="text-xl font-mono font-bold text-indigo-400">100%</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-indigo-500 h-full w-full"></div>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Health</div>
              <div className="text-xl font-mono font-bold">Stable</div>
              <div className="text-[9px] text-slate-600 mt-1 uppercase font-bold tracking-tighter">Sync: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
          </div>
        </section>

        {/* Sprint Stats */}
        <section className="col-span-4 row-span-1 bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-around shadow-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{status?.total || 0}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total</div>
          </div>
          <div className="h-8 w-[1px] bg-slate-800"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-400">
              {status?.byStatus['In Progress'] || status?.byStatus['Selected for Development'] || 0}
            </div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">WIP</div>
          </div>
          <div className="h-8 w-[1px] bg-slate-800"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {status?.byStatus['Done'] || status?.byStatus['Complete'] || 0}
            </div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Done</div>
          </div>
        </section>

        {/* Risk Assessment / Status Alerts */}
        <section className="col-span-4 row-span-1 bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Project Insight</h3>
            <p className="text-[11px] text-slate-500">
              {status && status.total > 0 
                ? `Active development across ${Object.keys(status.byStatus).length} states.`
                : "Awaiting sync with Jira workspace."}
            </p>
          </div>
        </section>

        {/* Recent Work Items */}
        <section className="col-span-8 row-span-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Work Items Context</h3>
            </div>
            <div className="flex gap-2">
               <span className="text-[10px] font-mono text-slate-500 italic">Showing last 5 updates</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-800/50 bg-slate-950/30">
                  <th className="p-4 font-bold tracking-wider">Key</th>
                  <th className="p-4 font-bold tracking-wider">Summary</th>
                  <th className="p-4 font-bold tracking-wider">Assignee</th>
                  <th className="p-4 font-bold tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {issues.slice(0, 5).map(issue => (
                  <tr key={issue.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono text-indigo-400 font-bold">{issue.key}</td>
                    <td className="p-4 text-slate-300 font-medium truncate max-w-[300px]">{issue.fields.summary}</td>
                    <td className="p-4 font-medium text-slate-400">
                      <div className="flex items-center gap-2">
                         <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[8px] border border-slate-700">
                           {issue.fields.assignee?.displayName?.charAt(0) || '?'}
                         </div>
                         {issue.fields.assignee?.displayName || 'Unassigned'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                        issue.fields.status.name.toLowerCase().includes('done') 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'bg-slate-800 text-slate-400'
                      }`}>
                        {issue.fields.status.name}
                      </span>
                    </td>
                  </tr>
                ))}
                {issues.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-600 uppercase text-xs font-bold tracking-widest">
                      No matching records found in this space
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* AI Chat Panel */}
        <section className="col-span-4 row-span-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl relative">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Context Assistant</h3>
            </div>
            <MessageSquare className="w-3 h-3 text-slate-600" />
          </div>
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto bg-slate-950/20">
            {chatMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed m-2">
                <Terminal className="w-8 h-8 text-indigo-500/40 mb-3" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Standby for queries</p>
                <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">Ask about task dependencies, project risks, or specific work items.</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${
                  msg.role === 'user' 
                  ? 'bg-indigo-600/10 border border-indigo-600/20 self-end max-w-[85%] rounded-2xl rounded-tr-none' 
                  : 'bg-slate-800/40 border border-slate-700/50 self-start max-w-[85%] rounded-2xl rounded-tl-none'
                } p-4 text-xs leading-relaxed`}
              >
                <p className={`text-[9px] uppercase font-bold mb-1 tracking-widest ${msg.role === 'user' ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {msg.role === 'user' ? 'Direct Input' : 'Context Engine'}
                </p>
                <p className={msg.role === 'user' ? 'text-indigo-100' : 'text-slate-300'}>{msg.content}</p>
              </motion.div>
            ))}
          </div>
          <div className="p-4 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800">
            <form onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as any).message;
              if (input.value.trim()) {
                handleSendMessage(input.value);
                input.value = '';
              }
            }} className="relative">
              <input 
                name="message"
                type="text" 
                placeholder="Query project context..." 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700 text-slate-200"
              />
              <button type="submit" className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </form>
          </div>
        </section>

      </main>

      {/* Footer/Status Line */}
      <footer className="shrink-0 flex justify-between items-center text-[9px] text-slate-600 border-t border-slate-900 pt-4 uppercase tracking-widest font-bold">
        <div className="flex gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Cloud: Jira Enterprise
          </span>
          <span>Workspace ID: {config.baseUrl.split('//')[1].split('.')[0]}</span>
          <span>Sync v4.0.0</span>
        </div>
        <div className="flex gap-6 font-mono text-[10px]">
          <span>STATUS: <span className="text-emerald-500">OPTIMIZED</span></span>
          <span>LATENCY: 24MS</span>
        </div>
      </footer>
    </div>
  );
}

const StatCard = ({ label, value }: { label: string; value: number; key?: any }) => {
  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
};

function SetupScreen({ onSubmit, loading, error }: { onSubmit: (config: JiraConfig) => void, loading: boolean, error: string | null }) {
  const [formData, setFormData] = useState({
    baseUrl: 'https://costrategix.atlassian.net/',
    email: '',
    token: '',
    projectKey: ''
  });

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-800 bg-slate-950/30">
           <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/20">
             <Terminal className="w-6 h-6 text-white" />
           </div>
           <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Configure Workspace</h1>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Strategic Project Intelligence</p>
        </div>

        <form className="p-8 space-y-6" onSubmit={(e) => {
          e.preventDefault();
          onSubmit(formData);
        }}>
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-red-400 leading-relaxed uppercase tracking-tighter">{error}</p>
            </div>
          )}

          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Jira Instance Source</label>
                <input 
                  required
                  placeholder="https://company.atlassian.net"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all font-medium text-slate-300 placeholder:text-slate-700"
                  value={formData.baseUrl}
                  onChange={e => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">System Account</label>
                <input 
                  required
                  type="email"
                  placeholder="mail@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all font-medium text-slate-300 placeholder:text-slate-700"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Secure API Token</label>
                <input 
                  required
                  type="password"
                  placeholder="Atlassian Personal Token"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all font-medium text-slate-300 placeholder:text-slate-700"
                  value={formData.token}
                  onChange={e => setFormData(prev => ({ ...prev, token: e.target.value }))}
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Workspace Key</label>
                <input 
                  required
                  placeholder="e.g., NEX"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all font-medium text-slate-300 placeholder:text-slate-700"
                  value={formData.projectKey}
                  onChange={e => setFormData(prev => ({ ...prev, projectKey: e.target.value }))}
                />
             </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-500/10 hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 tracking-widest uppercase text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating Link...
              </>
            ) : (
              <>
                Initialize System
                <ChevronRight className="w-4 h-4 text-white/50" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
