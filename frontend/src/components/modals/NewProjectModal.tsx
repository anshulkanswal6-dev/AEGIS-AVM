import { useState } from 'react';
import { X, FolderPlus, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { useProjectStore } from '../../store/projectStore';
import { useAlgorand } from '../AlgorandProvider';

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: any) => void;
}

export function NewProjectModal({ open, onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { createProject } = useProjectStore();
  const { address } = useAlgorand();

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim() || !address) return;
    setIsCreating(true);
    try {
      const project = await createProject(name, description, address);
      if (project) {
        onCreated(project);
        setName('');
        setDescription('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg th-surface-elevated border border-zinc-400 dark:border-zinc-600 rounded-3xl shadow-2xl animate-in zoom-in-95 fade-in duration-200">
         
         <div className="p-10 space-y-8">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-950 text-white flex items-center justify-center shadow-lg">
                     <FolderPlus className="w-5 h-5" />
                  </div>
                  <div>
                     <h2 className="text-lg font-bold th-text tracking-tight">New Project</h2>
                     <p className="text-[10px] th-text-tertiary font-medium uppercase tracking-widest">Initialize Automation</p>
                  </div>
               </div>
               <button onClick={onClose} className="p-2 th-text-tertiary hover:th-text transition-colors rounded-lg hover:th-surface-hover">
                  <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase th-text-tertiary tracking-wider ml-1">Project Name</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Daily Treasury Rebalancer"
                    className="w-full h-12 th-surface-input border border-[var(--th-border-strong)] rounded-xl px-5 text-sm th-text font-bold placeholder:th-text-tertiary outline-none focus:border-blue-500 focus:th-surface transition-all"
                    autoFocus
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase th-text-tertiary tracking-wider ml-1">Description  <span className="th-text-tertiary">(Optional)</span></label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your automation..."
                    rows={3}
                    className="w-full th-surface-input border border-[var(--th-border-strong)] rounded-xl p-5 text-sm th-text font-medium placeholder:th-text-tertiary outline-none focus:border-blue-500 focus:th-surface transition-all resize-none"
                  />
               </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={isCreating || !name.trim()}
              className="w-full h-12 bg-blue-950 hover:bg-blue-900 disabled:opacity-40 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-950/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isCreating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Project
                </>
              )}
            </button>
         </div>
      </div>
    </div>
  );
}
