import { useEffect, useState, useMemo } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useAutomationStore } from '../store/automationStore';
import type { DeployedAutomation } from '../store/automationStore';
import { 
  Plus, Clock, Database, ChevronRight, 
  Search, Filter, MoreVertical, LayoutGrid, 
  List, Activity, Zap, Pause, Play, Trash2, Code2, Pencil
} from 'lucide-react';
import { cn } from '../lib/utils/cn';
import { Button, Card, Badge } from '../components/ui/UIPack';
import { useNavigate } from 'react-router-dom';
import { useAlgorand } from '../components/AlgorandProvider';
import { NewProjectModal } from '../components/modals/NewProjectModal';
import { GlobalHeader } from '../components/layout/Header';
import { usePlaygroundStore } from '../store/playgroundStore';

interface ProjectDisplay {
  id: string;
  projectId?: string;
  name: string;
  prompt: string;
  status: 'draft' | 'active' | 'paused' | 'failed' | 'ready_for_deploy' | 'ready' | 'error';
  chain: string;
  lastUpdated: string;
  isDeployed: boolean;
  automation?: DeployedAutomation;
}

const STATUS_VARIANTS = {
  active: "success",
  paused: "warning",
  failed: "error",
  error: "error",
  draft: "neutral",
  ready: "warning",
  ready_for_deploy: "success",
} as const;

const getStatusDisplay = (project: ProjectDisplay) => {
  const status = project.status.toLowerCase();
  
  if (project.isDeployed && status === 'draft') return 'paused';
  if (status === 'ready') return 'paused';
  return status;
};

const ProjectLogo = ({ id, name }: { id: string; name: string }) => {
  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const seed = hashString(id + name);
  const getH = (offset: number) => (seed * offset) % 360;

  const primaryHue = getH(1);
  const secondaryHue = getH(7);

  return (
    <div className="relative w-10 h-10 shrink-0 group-hover:scale-110 transition-all">
      <div 
        className="absolute -inset-1 opacity-20 blur-md rounded-full animate-pulse"
        style={{ backgroundColor: `hsl(${primaryHue}, 80%, 70%)` }}
      />
      
      <div className="relative w-full h-full rounded-full overflow-hidden shadow-2xl border border-white/30">
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, 
              hsl(${primaryHue}, 80%, 60%), 
              hsl(${secondaryHue}, 90%, 40%)
            )`
          }}
        />
        <div 
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(circle at 50% 120%, white 0%, transparent 70%)`
          }}
        />
        <div className="absolute inset-0 shadow-[inner_0_2px_10px_rgba(0,0,0,0.3)] rounded-full" />
      </div>
      <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 bg-white/20 rounded-full blur-[1px]" />
    </div>
  );
};

export default function ProjectsPage() {
  const { projects, searchQuery, setSearchQuery, selectedFilter, setSelectedFilter, fetchProjects, updateProject } = useProjectStore();
  const { automations, fetchAutomations, pauseAutomation, resumeAutomation, updateAutomation } = useAutomationStore();
  const navigate = useNavigate();
  const { address } = useAlgorand();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editedProjectName, setEditedProjectName] = useState("");

  useEffect(() => {
    if (address) {
      fetchAutomations(address);
      fetchProjects(address);
    }
  }, [fetchAutomations, fetchProjects, address]);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openMenuId]);

  const combinedProjects = useMemo(() => {
    const deployedItems: ProjectDisplay[] = automations.map(a => ({
      id: a.id,
      name: a.name,
      prompt: a.description || (a.spec_json?.prompt) || "No prompt provided",
      status: a.status as any,
      chain: a.spec_json?.chain?.name || 'Unknown',
      lastUpdated: a.updated_at,
      isDeployed: true,
      automation: a
    }));

    const localItems: ProjectDisplay[] = projects.map(p => ({
      ...p,
      isDeployed: false
    }));

    const projectMap = new Map<string, ProjectDisplay>();
    
    // First pass: add all local projects
    localItems.forEach(item => {
      projectMap.set(item.name.toLowerCase(), item);
    });
    
    // Second pass: add/merge deployed automations
    deployedItems.forEach(item => {
      const existing = projectMap.get(item.name.toLowerCase());
      
      // Merge logic: prefer project description if automation description is generic
      const finalPrompt = (item.prompt === "No prompt provided" && existing?.prompt) 
          ? existing.prompt 
          : item.prompt;

      projectMap.set(item.name.toLowerCase(), {
        ...item,
        prompt: finalPrompt,
        // Preserve the project ID if we have it, for name editing later
        projectId: (existing as any)?.id || item.id 
      });
    });

    return Array.from(projectMap.values()).sort((a, b) => 
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
  }, [automations, projects]);

  const filteredProjects = combinedProjects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  ).filter(p => 
    selectedFilter === 'all' || p.status.toLowerCase() === selectedFilter.toLowerCase()
  );

  return (
    <div className="flex flex-col min-h-screen th-bg th-text">
      

      <main className="flex-1 p-8 md:p-12 max-w-7xl mx-auto w-full space-y-12 transition-all animate-in fade-in duration-700 relative z-10">
        <GlobalHeader />
        
        {/* Strategic Header Cluster */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
             <div className="flex items-center gap-2 px-3 py-1 th-surface border border-[var(--th-border-strong)] th-text-tertiary text-[10px] font-bold tracking-wider w-fit rounded-lg shadow-sm">
                Built with AEGIS
             </div>
             <h1 className="text-5xl font-bold tracking-tight th-text leading-tight">My Automations</h1>
             <p className="th-text-secondary font-medium text-sm max-w-md">Orchestrate and monitor your cross-chain automation clusters with precision.</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1 p-1 th-surface border border-[var(--th-border-strong)] rounded-xl shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn("p-2 rounded-lg transition-all active:scale-95", viewMode === 'grid' ? "bg-blue-950 text-white shadow-md" : "th-text-tertiary hover:th-text")}
                >
                   <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn("p-2 rounded-lg transition-all active:scale-95", viewMode === 'list' ? "bg-blue-950 text-white shadow-md" : "th-text-tertiary hover:th-text")}
                >
                   <List className="w-4 h-4" />
                </button>
             </div>
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="h-11 rounded-xl bg-blue-950 text-white px-6 font-bold text-xs shadow-lg hover:translate-y-[-1px] active:translate-y-0 transition-all flex items-center gap-2"
              >
               <Plus className="w-4 h-4" /> New Automation
             </Button>
          </div>
        </section>

        {/* Search & Filter */}
        <section className="flex flex-col md:flex-row items-center gap-4 p-2 th-surface rounded-2xl border border-[var(--th-border-strong)] shadow-sm">
           <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 th-text-tertiary group-focus-within:th-text transition-colors" />
              <input 
                type="text" 
                placeholder="Search projects or parameters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 bg-transparent rounded-xl pl-11 pr-4 text-sm font-medium th-text outline-none placeholder:th-text-tertiary transition-all"
              />
           </div>
           
           <div className="flex items-center gap-2 px-4 h-12 overflow-x-auto no-scrollbar lg:border-l lg:border-[var(--th-border)]">
              <Filter className="w-4 h-4 th-text-tertiary shrink-0" />
              {['all', 'active', 'ready', 'draft', 'failed'].map(f => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 active:scale-95",
                    selectedFilter === f ? "th-surface-elevated th-text border border-[var(--th-border-strong)]" : "th-text-tertiary hover:th-text"
                  )}
                >
                  {f}
                </button>
              ))}
           </div>
        </section>

        {/* Project Grid */}
        {filteredProjects.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-6">
             <div className="w-24 h-24 rounded-3xl th-surface-elevated border border-[var(--th-border-strong)] flex items-center justify-center shadow-inner group">
                <Database className="w-10 h-10 th-text-tertiary group-hover:scale-110 transition-transform" />
             </div>
             <div className="space-y-2">
                <h3 className="text-sm font-bold th-text uppercase tracking-wider opacity-60">No projects found</h3>
                <p className="text-xs th-text-tertiary font-medium max-w-[240px]">Initialize your first automation sequence in the playground.</p>
             </div>
          </div>
        ) : (
          <section className={cn(
            "grid gap-6 animate-in fade-in duration-700",
            viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
          )}>
            {filteredProjects.map((project) => (
              <Card 
                key={project.id}
                className="group relative cursor-pointer hover:border-[var(--th-text-tertiary)] hover:shadow-xl hover:translate-y-[-4px] transition-all p-8 flex flex-col h-full"
              >
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-3">
                      <ProjectLogo id={project.id} name={project.name} />
                      <div className="flex flex-col">
                         {editingProjectId === project.id ? (
                           <input 
                             autoFocus
                             type="text"
                             value={editedProjectName}
                             onChange={(e) => setEditedProjectName(e.target.value)}
                             onClick={(e) => e.stopPropagation()}
                             onKeyDown={async (e) => {
                               if (e.key === 'Enter') {
                                 e.stopPropagation();
                                 setEditingProjectId(null);
                                 if (editedProjectName && editedProjectName !== project.name) {
                                   if (project.isDeployed) {
                                     await updateAutomation(project.id, { name: editedProjectName });
                                     if (project.projectId) {
                                       await updateProject(project.projectId, { name: editedProjectName });
                                     }
                                   } else {
                                     await updateProject(project.id, { name: editedProjectName });
                                   }
                                 }
                               } else if (e.key === 'Escape') {
                                 e.stopPropagation();
                                 setEditingProjectId(null);
                               }
                             }}
                             onBlur={async () => {
                               setEditingProjectId(null);
                               if (editedProjectName && editedProjectName !== project.name) {
                                 if (project.isDeployed) {
                                   await updateAutomation(project.id, { name: editedProjectName });
                                   if (project.projectId) {
                                     await updateProject(project.projectId, { name: editedProjectName });
                                   }
                                 } else {
                                   await updateProject(project.id, { name: editedProjectName });
                                 }
                               }
                             }}
                             className="text-sm font-bold th-text tracking-tight border-b border-[var(--th-text-tertiary)] outline-none bg-transparent pb-0.5 max-w-[150px]"
                           />
                         ) : (
                           <div 
                             className="group/title flex items-center gap-1.5"
                             onClick={(e) => {
                               e.stopPropagation();
                               setEditedProjectName(project.name);
                               setEditingProjectId(project.id);
                             }}
                           >
                             <h3 className="text-sm font-bold th-text tracking-tight group-hover/title:th-text-secondary transition-colors cursor-text border-b border-transparent hover:border-[var(--th-text-tertiary)] pb-0.5" title="Click to rename">
                               {project.name}
                             </h3>
                             <Pencil className="w-2.5 h-2.5 ml-1 th-text-tertiary group-hover/title:th-text transition-colors" />
                           </div>
                         )}
                         <div className="flex items-center gap-1.5 mt-0.5 th-text-tertiary">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-medium">Updated {new Date(project.lastUpdated).toLocaleDateString()}</span>
                         </div>
                      </div>
                   </div>
                    <Badge 
                     variant={STATUS_VARIANTS[getStatusDisplay(project) as keyof typeof STATUS_VARIANTS] || 'neutral'}
                     className="rounded-full px-4 py-1 font-black shadow-sm uppercase tracking-widest text-[9px]"
                    >
                      {getStatusDisplay(project)}
                    </Badge>
                    
                </div>

                <div className="flex-1 space-y-6">
                   <div className="p-4 rounded-xl th-surface-elevated border border-[var(--th-border-strong)] min-h-[80px]">
                      <p className="text-xs th-text-secondary font-medium leading-relaxed line-clamp-3">
                        {project.prompt}
                      </p>
                   </div>
                   
                   <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg th-surface border border-[var(--th-border-strong)]">
                         <div className="w-2 h-2 rounded-full th-text-tertiary opacity-30" />
                         <span className="text-[10px] font-bold th-text uppercase tracking-wider">{project.chain}</span>
                      </div>
                      {project.isDeployed && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 shadow-sm dark:bg-emerald-500/10 dark:border-emerald-500/20">
                           <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{'> _ '}Deployed</span>
                        </div>
                      )}
                   </div>
                </div>

                 <div className="mt-8 pt-6 border-t border-[var(--th-border)] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {project.isDeployed && (
                        project.status.toLowerCase() === 'active' ? (
                          <Button 
                            onClick={(e) => { e.stopPropagation(); pauseAutomation(project.id); }}
                            variant="ghost" 
                            className="h-9 w-9 p-0 rounded-xl text-emerald-500"
                            title="Pause Execution"
                          >
                            <Pause className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button 
                            onClick={(e) => { e.stopPropagation(); resumeAutomation(project.id); }}
                            variant="ghost" 
                            className="h-9 w-9 p-0 rounded-xl text-emerald-600"
                            title="Resume Execution"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )
                      )}
                      
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (project.isDeployed) {
                            navigate('/playground', { state: { automation: project.automation } }); 
                          } else {
                            usePlaygroundStore.getState().setProjectContext(project.id, project.name, project.prompt);
                            navigate('/playground');
                          }
                        }}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest transition-colors"
                      >
                        <Code2 className="w-4 h-4" />
                        View in Playground
                      </button>
                   </div>

                   <div className="relative">
                      <button 
                        className="p-2 rounded-lg hover:th-surface-hover th-text-tertiary hover:th-text transition-all" 
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === project.id ? null : project.id); }}
                      >
                         <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === project.id && (
                        <div className="absolute top-full right-0 mt-2 w-28 th-surface-elevated border border-[var(--th-border-strong)] rounded-xl shadow-2xl p-1.5 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                             <button 
                               onClick={async (e) => { 
                                 e.stopPropagation(); 
                                 setOpenMenuId(null); 
                                 
                                 const projStore = useProjectStore.getState();
                                 const autoStore = useAutomationStore.getState();
                                 
                                 try {
                                   if (project.isDeployed) {
                                      await autoStore.deleteAutomation(project.id);
                                   }
                                   await projStore.deleteProject(project.id);
                                 } catch (err) {
                                   console.error("Failed to delete project fully:", err);
                                 }
                               }}
                               className="w-full text-left px-3 py-2 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg flex items-center justify-between transition-colors"
                             >
                                Delete Project
                                <Trash2 className="w-3.5 h-3.5" />
                             </button>
                        </div>
                      )}
                   </div>
                </div>
              </Card>
            ))}
          </section>
        )}
      </main>

      <NewProjectModal 
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(project) => {
          setIsModalOpen(false);
          usePlaygroundStore.getState().setProjectContext(project.id, project.name, project.description);
          navigate('/playground');
        }}
      />
    </div>
  );
}

