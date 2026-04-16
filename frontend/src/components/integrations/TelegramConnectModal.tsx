import React, { useState, useEffect } from 'react';
import { X, ExternalLink, QrCode, CheckCircle2, Loader2, Send } from 'lucide-react';
import { useAlgorand } from '../AlgorandProvider';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface TelegramConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TelegramConnectModal: React.FC<TelegramConnectModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { address } = useAlgorand();
  const [token, setToken] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [tgLink, setTgLink] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Link Token
  useEffect(() => {
    if (isOpen && address) {
      initLink();
    }
  }, [isOpen, address]);

  const initLink = async () => {
    if (!address) {
      setError("Please connect your wallet first.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/api/telegram/link/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address })
      });
      
      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}`);
      }
      
      const data = await resp.json();
      if (data.success) {
        setToken(data.token);
        setDeepLink(data.deep_link);
        setTgLink(data.tg_link || data.deep_link);
        setBotUsername(data.bot_username);
        setPolling(true);
      } else {
        setError(data.detail || "Failed to generate link.");
      }
    } catch (err) {
      console.error('Failed to init link:', err);
      setError("Backend unreachable. Ensure your Python server is running on port 8002.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Poll for connection status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (polling && address && !connected) {
      interval = setInterval(async () => {
        try {
          const resp = await fetch(`${API_BASE}/api/telegram/status?wallet_address=${address}`);
          const data = await resp.json();
          if (data.connected) {
            setConnected(true);
            setPolling(false);
            setTimeout(() => {
              onSuccess();
              onClose();
            }, 2000);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [polling, address, connected]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 p-4 bg-gradient-to-r from-blue-600/10 to-transparent">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Send className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Connect AEGIS</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 text-center pt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <p className="text-zinc-400">Generating secure link...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="rounded-full bg-rose-500/10 p-3 text-rose-500">
                <X className="h-8 w-8" />
              </div>
              <p className="text-zinc-300 font-medium">{error}</p>
              <button 
                onClick={initLink}
                className="mt-2 text-sm text-blue-500 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : connected ? (
            <div className="flex flex-col items-center justify-center py-6 gap-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h4 className="text-xl font-bold text-white">AEGIS Linked!</h4>
              <p className="text-zinc-400">Your account is now connected. Closing modal...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-xl bg-white p-2 shadow-lg ring-4 ring-blue-500/20">
                {tgLink && (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tgLink)}`} 
                    alt="Telegram Bot QR Code" 
                    className="h-full w-full"
                  />
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-zinc-300">1. Scan or Click to Open</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Connects to @{botUsername}</p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <a 
                    href={deepLink || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 active:scale-95 transition-all"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Telegram
                  </a>
                  
                  <div className="relative flex flex-col items-center gap-2 rounded-xl bg-zinc-800/50 p-3 border border-white/5">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">Manual Activation Token</p>
                    <code className="text-lg font-mono font-bold text-blue-400 tracking-[0.2em]">{token}</code>
                    <p className="text-[10px] text-zinc-500">Type <b>/start {token}</b> in the bot if scanner fails</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-4 text-xs text-zinc-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Waiting for Telegram activation...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!connected && (
          <div className="bg-zinc-800/50 p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Secure One-Time Link • Expires in 10m</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelegramConnectModal;
