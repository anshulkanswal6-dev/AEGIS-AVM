import { useState, useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { usePlaygroundStore } from '../../store/playgroundStore';
import { useAlgorand } from '../AlgorandProvider';
import { 
  FolderOpen, Plus, Search, Folder, 
  ChevronRight, X, AlertCircle, Layout
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { Button } from '../ui/UIPack';
import { NewProjectModal } from '../modals/NewProjectModal';
import logoPng from '../../assets/Copy of AEGIS (640 x 640 px) (1).png';

export function WelcomeScreen() {
  const { address } = useAlgorand();
  const { projects, fetchProjects, isLoading } = useProjectStore();
  const { setProjectContext } = usePlaygroundStore();
  
  const [showProjectList, setShowProjectList] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    if (address) {
      fetchProjects(address);
    }
  }, [address, fetchProjects]);

  const handleOpenProject = (project: any) => {
    setProjectContext(project.id, project.name, project.prompt || '');
  };



  return (
    <div className="flex-1 flex flex-col items-center justify-center th-bg p-6 overflow-y-auto">
      <NewProjectModal 
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(project) => {
          setIsModalOpen(false);
          setProjectContext(project.id, project.name, project.description || '');
        }}
      />
      <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-10 animate-in fade-in duration-500">
        
        {/* Branding Cluster */}
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center gap-3 mb-2">
            <div className="w-24 h-24 flex items-center justify-center overflow-hidden rounded-3xl shadow-2xl border-4 border-white/5">
               <img src={logoPng} alt="AEGIS" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight th-text italic leading-tight">
               AEGIS IDE
            </h1>
            <p className="th-text-tertiary font-medium text-sm tracking-tight max-w-lg mx-auto">
              Open an existing project or create a new project.
            </p>
          </div>
        </div>


        {/* Vertical Action Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
           <button 
             onClick={() => setShowProjectList(!showProjectList)}
             className={cn(
               "w-full h-14 bg-blue-950 text-white rounded-2xl flex items-center justify-center gap-3 px-6 border border-blue-900 transition-all font-bold text-sm tracking-widest shadow-sm active:scale-95",
               showProjectList && "ring-2 ring-blue-400 bg-blue-900"
             )}
           >
              <FolderOpen className="w-5 h-5" />
              Open a Project
           </button>

             <button 
               onClick={() => setIsModalOpen(true)}
               className={cn(
                 "w-full h-14 th-surface th-text rounded-2xl flex items-center justify-center gap-3 px-6 border border-[var(--th-border-strong)] transition-all font-bold text-sm tracking-widest shadow-sm",
                 isModalOpen && "th-surface-active"
               )}
             >
               <Plus className="w-5 h-5" />
               New Project
            </button>
        </div>

        {/* Dynamic Panels */}
        <div className="w-full max-w-2xl">
          {showProjectList && (
            <div className="bg-[#1a1b1e] rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-top-4 duration-300 text-left border border-white/5">
               <div className="flex items-center justify-between p-4 bg-[#25262b] border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-zinc-500" />
                    <input 
                      type="text" 
                      placeholder="Search projects..." 
                      className="bg-transparent border-none outline-none text-xs font-medium text-zinc-300 w-full placeholder:text-zinc-600"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                     <span className="text-[10px] font-bold text-zinc-500 tracking-widest flex items-center gap-1.5">
                        <Layout className="w-3 h-3" /> folders
                     </span>
                     <button onClick={() => setShowProjectList(false)}>
                        <X className="w-4 h-4 text-zinc-500 hover:text-white" />
                     </button>
                  </div>
               </div>

               <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-white/5">
                  {isLoading ? (
                    <div className="p-12 flex flex-col items-center gap-3 text-zinc-500">
                       <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="p-12 text-center text-zinc-600 text-xs font-bold tracking-widest">
                       No projects found
                    </div>
                  ) : (
                    projects.map((p) => (
                      <button 
                        key={p.id}
                        onClick={() => handleOpenProject(p)}
                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                      >
                         <div className="flex items-center gap-3 min-w-0">
                            <Folder className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
                            <div className="flex flex-col gap-0.5 truncate">
                               <span className="text-sm font-bold text-zinc-300 group-hover:text-white truncate">{p.name}</span>
                               <span className="text-[10px] text-zinc-500 font-mono truncate opacity-60">/aegis/projects/{p.id.slice(0, 8)}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-4 shrink-0">
                            <span className="text-[10px] font-bold text-zinc-600 uppercase group-hover:text-zinc-400">
                               {new Date(p.lastUpdated).toLocaleDateString()}
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-white" />
                         </div>
                      </button>
                    ))
                  )}
               </div>
            </div>
          )}


        </div>

      </div>
    </div>
  );
}
