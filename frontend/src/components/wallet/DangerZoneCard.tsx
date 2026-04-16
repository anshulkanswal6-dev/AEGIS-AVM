import { useAgentWallet } from '../../hooks/useAgentWallet';
import { Trash2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '../ui/UIPack';
import { useState } from 'react';
import { ConfirmationModal } from '../ui/ConfirmationModal';

export function DangerZoneCard() {
  const { deleteWallet, isWithdrawing, forceUnlink } = useAgentWallet();
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async () => {
    await deleteWallet();
    setShowModal(false);
  };

  return (
    <div className="p-8 bg-rose-50/30 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-2xl shadow-sm space-y-8 relative overflow-hidden group">
      <div className="flex items-center gap-4 pb-6 border-b border-rose-100/50 dark:border-rose-500/10">
        <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-md transition-transform">
          <Trash2 className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Danger Zone</h2>
          <p className="text-[10px] font-bold text-rose-400 dark:text-rose-500 uppercase tracking-widest leading-none">Cannot be undone</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-start gap-4 p-4 rounded-xl th-surface border border-rose-100 dark:border-rose-500/20 shadow-sm">
           <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500">
              <AlertTriangle className="w-4 h-4" />
           </div>
           <p className="text-[10px] text-rose-600/70 dark:text-rose-400/70 font-bold leading-relaxed uppercase tracking-wider">
              If you delete this agent, its wallet and files will be removed. Funds will stay on-chain.
           </p>
        </div>

        <Button
          variant="danger"
          onClick={() => setShowModal(true)}
          className="w-full h-12 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 group/btn"
        >
          <span>Delete Agent</span>
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </Button>

        <Button
          variant="outline"
          onClick={forceUnlink}
          className="w-full h-10 rounded-xl font-bold text-[10px] uppercase border-rose-200 dark:border-rose-500/20 text-rose-500/60 hover:text-rose-500 transition-all"
        >
          Forget Agent (Unstick Dashboard)
        </Button>
      </div>

      <ConfirmationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleDelete}
        title="Delete Agent?"
        message="This will delete the agent's files and wallet. This cannot be undone."
        confirmText="Yes, Delete Agent"
        variant="danger"
      />

      {/* Subtle Background Accent */}
      {/* <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
         <Trash2 className="w-32 h-32 text-rose-900" />
      </div> */}
    </div>
  );
}
