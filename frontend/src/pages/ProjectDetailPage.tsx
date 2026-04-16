import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { 
  ArrowLeft, Clock, Database, ExternalLink, 
  ShieldCheck, Zap, Activity, 
  Copy, Check, Sparkles, Pencil
} from 'lucide-react';
import { cn } from '../lib/utils/cn';
import { Button, Badge } from '../components/ui/UIPack';

import { useState } from 'react';
import { DangerZoneCard } from '../components/wallet/DangerZoneCard';
import { GlobalHeader } from '../components/layout/Header';
import { usePlaygroundStore } from '../store/playgroundStore';

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, updateProject } = useProjectStore();
  const [activeTab, setActiveTab] = useState<'spec' | 'code'>('spec');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");

  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-20 th-bg animate-in fade-in duration-1000">
        <Activity className="w-16 h-16 mb-8 th-text-tertiary" />
        <h2 className="text-2xl font-bold th-text-tertiary">Project Not Found</h2>
        <Button onClick={() => navigate('/projects')} variant="secondary" className="mt-8 rounded-xl h-12 px-8 font-bold">
           Back to Projects
        </Button>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTab === 'spec' ? project.spec : project.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen th-bg th-text">

      
      <main className="flex-1 p-8 md:p-12 max-w-7xl mx-auto w-full space-y-12 transition-all animate-in fade-in duration-700 relative z-10">
        <GlobalHeader />
        
        {/* Project Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-[var(--th-border-strong)]">
           <div className="space-y-8">
              <button 
                onClick={() => navigate('/projects')}
                className="flex items-center gap-2 text-[10px] font-bold tracking-wider th-text-tertiary hover:th-text transition-all group active:scale-95"
              >
                 <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                 Back to Projects
              </button>
              
              <div className="space-y-4">
                 <div className="flex items-center gap-4">
                    {isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            setIsEditing(false);
                            if (editedName && editedName !== project.name) {
                              await updateProject(project.id, { name: editedName });
                            }
                          } else if (e.key === 'Escape') {
                            setIsEditing(false);
                          }
                        }}
                        onBlur={async () => {
                          setIsEditing(false);
                          if (editedName && editedName !== project.name) {
                            await updateProject(project.id, { name: editedName });
                          }
                        }}
                        className="text-5xl font-bold tracking-tight th-text leading-tight border-b-2 border-[var(--th-text-tertiary)] outline-none bg-transparent w-full pb-1"
                      />
                    ) : (
                      <div 
                        className="group flex items-center gap-3 cursor-text"
                        onClick={() => {
                          setEditedName(project.name);
                          setIsEditing(true);
                        }}
                      >
                        <h1 
                          className="text-5xl font-bold tracking-tight th-text leading-tight border-b-2 border-transparent hover:border-[var(--th-text-tertiary)] transition-colors pb-1"
                          title="Click to rename"
                        >
                          {project.name}
                        </h1>
                        <Pencil className="w-6 h-6 th-text-tertiary group-hover:th-text transition-colors" />
                      </div>
                    )}
                    <Badge variant={project.status === 'active' ? 'success' : 'neutral'} className="h-7 px-4 shadow-sm">
                      {project.status === 'active' ? 'Running' : project.status}
                    </Badge>
                 </div>

                 
                 <div className="flex flex-wrap items-center gap-8 text-[11px] font-bold tracking-wider th-text-tertiary">
                    <div className="flex items-center gap-2 px-3 py-1 th-surface rounded-lg border border-[var(--th-border-strong)] th-text shadow-sm">
                       <Database className="w-3.5 h-3.5" />
                       {project.chain} Network
                    </div>
                    <div className="flex items-center gap-2">
                       <Clock className="w-3.5 h-3.5" />
                       Updated {project.lastUpdated}
                    </div>
                    <button className="flex items-center gap-2 hover:th-text transition-colors group">
                       <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                       View on Explorer
                    </button>
                 </div>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <Button 
                onClick={() => {
                  usePlaygroundStore.getState().setProjectContext(project.id, project.name, project.prompt);
                  navigate('/playground');
                }}
                className="h-12 rounded-xl bg-blue-950 text-white px-8 font-bold text-xs shadow-lg hover:translate-y-[-1px] active:translate-y-0 transition-all flex items-center gap-2"
              >
                <Zap className="w-4 h-4" /> Open Editor
              </Button>
           </div>
        </section>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
           
           {/* Left Column: Goal & Metadata */}
           <div className="lg:col-span-4 space-y-10">
              <section className="space-y-4">
                 <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider th-text-tertiary">
                    <ShieldCheck className="w-4 h-4 opacity-40" />
                    Project Goal
                 </div>
                 <div className="p-8 rounded-2xl th-surface border border-[var(--th-border-strong)] shadow-sm relative overflow-hidden group">
                    <p className="text-md font-bold th-text leading-relaxed tracking-tight">
                      {project.prompt}
                    </p>
                 </div>
              </section>

              <section className="space-y-4">
                 <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider th-text-tertiary">
                    <Activity className="w-4 h-4 opacity-40" />
                    Setup & Settings
                 </div>
                 <div className="space-y-3">
                    <div className="p-5 rounded-xl th-surface border border-[var(--th-border-strong)] shadow-sm flex items-center justify-between group hover:border-blue-500/30 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg th-surface-elevated border border-[var(--th-border)] flex items-center justify-center th-text group-hover:scale-110 transition-transform">
                             <Zap className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                             <span className="text-sm font-bold th-text">Active Automation</span>
                             <span className="text-[10px] font-bold text-emerald-500 tracking-widest mt-0.5">Running</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </section>

              <DangerZoneCard />
           </div>

           {/* Right Column: Files */}
           <div className="lg:col-span-8 space-y-8">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-950 flex items-center justify-center text-white shadow-md">
                       <Sparkles className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold th-text tracking-wider">Project Files</h2>
                 </div>

                 <div className="flex p-1 th-surface-elevated border border-[var(--th-border-strong)] rounded-xl shadow-sm">
                    <button 
                      onClick={() => setActiveTab('spec')}
                      className={cn(
                        "px-6 py-2 rounded-lg text-[10px] font-bold tracking-wider transition-all",
                        activeTab === 'spec' ? "th-surface th-text border border-[var(--th-border-strong)] shadow-sm" : "th-text-tertiary hover:th-text"
                      )}
                    >Spec</button>
                    <button 
                      onClick={() => setActiveTab('code')}
                      className={cn(
                        "px-6 py-2 rounded-lg text-[10px] font-bold tracking-wider transition-all",
                        activeTab === 'code' ? "th-surface th-text border border-[var(--th-border-strong)] shadow-sm" : "th-text-tertiary hover:th-text"
                      )}
                    >Code</button>
                 </div>
              </div>

              <div className="relative group/artifact rounded-2xl border border-[var(--th-border-strong)] th-surface shadow-sm overflow-hidden min-h-[500px]">
                 <div className="absolute top-6 right-6 flex items-center gap-2 z-10 opacity-0 group-hover/artifact:opacity-100 transition-all duration-300">
                    <button 
                      onClick={handleCopy}
                      className="p-3 rounded-lg th-surface border border-[var(--th-border-strong)] th-text-tertiary hover:th-text hover:border-blue-500/30 transition-all shadow-md active:scale-95"
                    >
                       {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                 </div>
                 
                 <div className="h-[500px] overflow-y-auto p-10 custom-scrollbar font-mono text-xs leading-relaxed th-surface-low">
                    {activeTab === 'spec' ? (
                       <pre className="text-indigo-500 dark:text-indigo-400 font-bold opacity-80">{project.spec}</pre>
                    ) : (
                       <pre className="text-emerald-600 dark:text-emerald-400 font-bold opacity-80">{project.code}</pre>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
