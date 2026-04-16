import React, { useState, useEffect } from 'react';
import { useAlgorand } from '../AlgorandProvider';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, XCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import teleLogo from '../../assets/tele.png';

const API_BASE = import.meta.env.VITE_API_URL || '';

/* --- Custom Confirmation Modal Component --- */
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-outline bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-text-primary">{title}</h3>
          <p className="mb-8 text-sm text-text-secondary leading-relaxed">{message}</p>

          <div className="flex w-full gap-3 mt-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-outline bg-surface px-4 py-2.5 text-sm font-bold text-text-secondary hover:bg-surface-hover transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 rounded-xl bg-[#1a1a4a] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Processing...' : 'Yes, Unlink'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- Main Telegram Card Component --- */
const TelegramCard: React.FC = () => {
  const { address } = useAlgorand();
  const [isExpanded, setIsExpanded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Custom Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (address) {
      fetchStatus();
    }
  }, [address]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExpanded && !connected && address) {
      interval = setInterval(fetchStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [isExpanded, connected, address]);

  const fetchStatus = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/telegram/status?wallet_address=${address}`);
      const data = await resp.json();
      if (data.connected) {
        setConnected(true);
      } else {
        setConnected(false);
      }
    } catch (err) {
      console.error('Status check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (nextState && !connected && !token) {
      generateToken();
    }
  };

  const generateToken = async () => {
    setActionLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/telegram/link/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address })
      });
      const data = await resp.json();
      if (data.success) {
        setToken(data.token);
        setDeepLink(data.deep_link);
      }
    } catch (err) {
      console.error('Link init failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmUnlink = async () => {
    setActionLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/telegram/unlink`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address })
      });
      const data = await resp.json();
      if (data.success) {
        setConnected(false);
        setToken(null);
        setDeepLink(null);
        setIsExpanded(false);
        setIsConfirmOpen(false); // Close modal
      }
    } catch (err) {
      console.error('Unlink failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="w-full h-14 rounded-lg border border-outline bg-surface animate-pulse max-w-2xl mx-auto" />
  );

  return (
    <>
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-outline bg-surface transition-all shadow-sm">
        {/* Header Row */}
        <div
          onClick={handleToggle}
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-surface-hover transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full shadow-sm">
              <img
                src={teleLogo}
                alt="Telegram"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-sm font-bold text-text-primary">Telegram</span>
          </div>

          <div className="flex items-center gap-3">
            {connected ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#1a1a4a] text-white text-[11px] font-bold uppercase tracking-wider">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </div>
            ) : (
              <div className="px-3 py-1 rounded-md bg-[#1a1a4a] text-white text-[11px] font-bold uppercase tracking-wider">
                Connect
              </div>
            )}
            <div className="text-text-tertiary">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-outline bg-surface p-5 animate-in slide-in-from-bottom-1 duration-200">
            {!connected && actionLoading && !token ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <p className="text-text-tertiary text-xs font-medium">Initializing Connection...</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-8 justify-between max-w-lg mx-auto">
                {/* Left Side: Token & Steps */}
                <div className="flex-1 space-y-6 w-full">
                  <div className="space-y-2 text-center md:text-left">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-text-tertiary">Your Token:</label>
                    <div className="w-full bg-surface-low rounded border border-outline p-2 font-mono text-xs text-text-secondary truncate shadow-inner">
                      {connected ? 'LINKED_SECURELY' : (token || 'Generating...')}
                    </div>
                  </div>

                  <div className="space-y-2 text-center md:text-left">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs mb-1 font-bold text-text-primary">1. Scan QR or click link</p>
                      <a
                        href={deepLink || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 font-bold flex flex-row items-center justify-center md:justify-start gap-1 hover:underline px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 w-fit mx-auto md:mx-0"
                      >
                        Open Telegram <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <p className="text-xs font-bold text-text-primary">2. Press "START" in the bot</p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsConfirmOpen(true); }}
                      disabled={actionLoading}
                      className="flex items-center gap-2 rounded bg-rose-500/10 px-4 py-2 text-[11px] font-bold text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-colors w-full justify-center"
                    >
                      {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                      {connected ? "DISCONNECT ACCOUNT" : "CANCEL LINKING"}
                    </button>
                  </div>
                </div>

                {/* Right Side: Clickable QR Code */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <a
                    href={deepLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`h-24 w-24 bg-white border border-outline rounded p-1 shadow-sm transition-transform hover:scale-105 active:scale-95 ${!deepLink ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    {deepLink && !connected ? (
                      <div className="p-1 bg-white h-full w-full">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(deepLink)}`}
                          alt="Click to Open Telegram"
                          className="h-full w-full"
                        />
                      </div>
                    ) : connected ? (
                      <div className="h-full w-full bg-green-500/10 flex items-center justify-center rounded">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      </div>
                    ) : (
                      <div className="h-full w-full bg-surface-low flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
                      </div>
                    )}
                  </a>
                  <p className="text-[10px] text-text-tertiary font-medium">
                    {connected ? "Linked" : "Tap QR to Open Bot"}
                  </p>
                  {!connected && (
                    <div className="flex items-center gap-1.5 text-[9px] text-text-tertiary">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Waiting for bot activation...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmUnlink}
        title="Disconnect Telegram?"
        message="Are you sure you want to disconnect AEGIS from your Telegram account? You will stop receiving automation notifications."
        isLoading={actionLoading}
      />
    </>
  );
};

export default TelegramCard;
