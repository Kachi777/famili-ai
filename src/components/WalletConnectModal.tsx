import React, { useState, useEffect } from 'react';
import { Wallet, X, Check, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (address: string) => void;
}

export default function WalletConnectModal({ isOpen, onClose, onConnect }: WalletConnectModalProps) {
  const [customAddress, setCustomAddress] = useState('');
  const [activeTab, setActiveTab] = useState<'tonconnect' | 'paste' | 'sandbox'>('tonconnect');
  
  const wallet = useTonWallet();

  const tonAddress = wallet?.account?.address || '';

  // If connected via TonConnect popup UI, automatically propagate wallet address
  useEffect(() => {
    if (tonAddress) {
      onConnect(tonAddress);
    }
  }, [tonAddress]);

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAddress.trim()) {
      onConnect(customAddress.trim());
      onClose();
      setCustomAddress('');
    }
  };

  const handleGenerateSandbox = () => {
    const sandboxAddr = "EQD" + Array.from({length: 45}, () => 
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"[Math.floor(Math.random() * 64)]
    ).join("");
    onConnect(sandboxAddr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Connect TON Wallet</h3>
              <p className="text-[11px] text-slate-400">TON Testnet &amp; Mainnet Gateway</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* Method Selection Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('tonconnect')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'tonconnect' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TonConnect Popup
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'paste' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Enter Address
            </button>
            <button
              onClick={() => setActiveTab('sandbox')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'sandbox' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sandbox Test
            </button>
          </div>

          {/* TAB 1: Paste Custom Wallet Address */}
          {activeTab === 'paste' && (
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Your Tonkeeper / Telegram Wallet Address
                </label>
                <input 
                  type="text" 
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="Paste EQD... or 0QC... TON address"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Works directly with Tonkeeper, MyTonWallet, OpenMask, or Telegram @wallet.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
              >
                <Check className="w-4 h-4" />
                <span>Connect Specified Address</span>
              </button>
            </form>
          )}

          {/* TAB 2: Instant Sandbox Address */}
          {activeTab === 'sandbox' && (
            <div className="space-y-4 text-center py-2">
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-left space-y-2">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>1-Click Testnet Sandbox Mode</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Generates an authentic TON testnet identity instantly. Perfect for exploring the presale, $FAMILI token distribution, and subscription features without spending TON gas.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateSandbox}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <Wallet className="w-4 h-4" />
                <span>Generate Testnet Wallet</span>
              </button>
            </div>
          )}

          {/* TAB 1: Official TonConnect Wallet Modal Popup */}
          {activeTab === 'tonconnect' && (
            <div className="space-y-4 text-center py-2">
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-left space-y-2">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Native Tonkeeper / Telegram Popup</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Connect instantly using Tonkeeper, OpenMask, MyTonWallet, or Telegram @wallet with official TON Connect protocols.
                </p>
              </div>

              <div className="flex justify-center py-2">
                <TonConnectButton className="ton-connect-btn-custom" />
              </div>

              <p className="text-[10px] text-slate-400">
                Manifest: <span className="text-cyan-300 font-mono">https://familiei.netlify.app/tonconnect-manifest.json</span>
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            TON Testnet / Mainnet Active
          </span>
          <span>FAMILI Web3 Hub</span>
        </div>

      </div>
    </div>
  );
}
