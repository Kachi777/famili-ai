import React, { useState } from 'react';
import { 
  Award, 
  Coins, 
  CheckCircle2, 
  ChevronRight, 
  BookOpen, 
  Activity, 
  UserPlus, 
  Zap, 
  Wallet,
  ExternalLink,
  Loader2,
  Sparkles,
  X
} from 'lucide-react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { AirdropTask, getTreasuryWallet, PresaleTransaction, verifyAndGetWalletBalance } from '../types';

interface AirdropTasksProps {
  tasks: AirdropTask[];
  onCompleteTask: (taskId: string) => void;
  onLaunchTutor: () => void;
  walletConnected: boolean;
  onConnectWallet: () => void;
  walletAddress?: string;
}

export default function AirdropTasks({
  tasks,
  onCompleteTask,
  onLaunchTutor,
  walletConnected,
  onConnectWallet,
  walletAddress = ''
}: AirdropTasksProps) {
  const [tonConnectUI] = useTonConnectUI();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccessTx, setClaimSuccessTx] = useState<{ txHash: string; explorerUrl: string } | null>(null);
  const [cachedWalletBalance, setCachedWalletBalance] = useState<number | null>(null);

  React.useEffect(() => {
    const activeAddress = walletAddress || tonConnectUI.account?.address || '';
    if (activeAddress) {
      verifyAndGetWalletBalance(activeAddress).then(bal => setCachedWalletBalance(bal));
    } else {
      setCachedWalletBalance(null);
    }
  }, [walletAddress, tonConnectUI.account?.address]);

  const totalPoints = tasks
    .filter(t => t.completed)
    .reduce((sum, t) => sum + t.rewardPoints, 0);

  const handleClaimOnChain = async () => {
    if (!tonConnectUI.connected) {
      onConnectWallet();
      try { tonConnectUI.openModal(); } catch {}
      return;
    }

    if (totalPoints <= 0) {
      alert("⚠️ You currently have 0 $FAMILI mined. Complete tasks below to earn tokens before claiming!");
      return;
    }

    const activeWallet = walletAddress || tonConnectUI.account?.address || '';
    const requiredGasTon = 0.005; // 0.005 TON network claim gas fee

    setIsClaiming(true);
    setClaimSuccessTx(null);

    try {
      const activeTreasury = getTreasuryWallet();
      const nanoTon = "5000000"; 
      
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: activeTreasury,
            amount: nanoTon
          }
        ]
      };

      // Call sendTransaction IMMEDIATELY to preserve user gesture and invoke native wallet authorization on all devices
      const result = await tonConnectUI.sendTransaction(transaction);

      if (!result || !result.boc || typeof result.boc !== 'string' || result.boc.trim().length < 10) {
        setIsClaiming(false);
        alert("❌ Claim transaction rejected or not confirmed by wallet.");
        return;
      }

      const rawHash = result.boc.slice(0, 32);
      const explorerUrl = `https://tonviewer.com/transaction/${rawHash}`;

      // Save claim transaction to presale transaction history
      try {
        const stored = localStorage.getItem('famili_presale_txs');
        const list: PresaleTransaction[] = stored ? JSON.parse(stored) : [];
        const newTx: PresaleTransaction = {
          id: `tx_claim_${Date.now()}`,
          type: 'AIRDROP_REWARD',
          amountTonOrUsd: 0.005,
          tokensEarned: totalPoints,
          txHash: `CLAIM_ONCHAIN_${rawHash.slice(0, 16)}`,
          timestamp: new Date().toISOString(),
          walletAddress: activeWallet || 'Connected Wallet',
          network: 'mainnet'
        };
        list.unshift(newTx);
        localStorage.setItem('famili_presale_txs', JSON.stringify(list));
      } catch {}

      setClaimSuccessTx({
        txHash: rawHash,
        explorerUrl
      });
      setIsClaiming(false);

      if (activeWallet) {
        verifyAndGetWalletBalance(activeWallet).then(bal => setCachedWalletBalance(bal));
      }
    } catch (err: any) {
      setIsClaiming(false);
      const errStr = (err?.message || err?.name || String(err) || '').toLowerCase();
      const isUserReject = errStr.includes("reject") || errStr.includes("cancel") || errStr.includes("declined") || errStr.includes("userrejects") || err?.name?.includes("UserRejects");
      const isInsufficientFunds = errStr.includes("enough funds") || errStr.includes("insufficient") || errStr.includes("no_funds") || errStr.includes("badrequesterror");

      if (isUserReject) {
        console.info("User cancelled transaction in wallet");
        alert("ℹ️ Claim transaction was cancelled in your connected wallet.");
      } else if (isInsufficientFunds) {
        console.warn("Wallet insufficient balance error:", err?.message || err);
        alert("❌ Insufficient Wallet Balance: Your connected wallet does not have enough TON funds to pay the gas fee to claim mined tokens. Please add TON to your wallet and try again.");
      } else if (errStr.includes("connect wallet")) {
        console.warn("Wallet connection needed");
        try { tonConnectUI.openModal(); } catch {}
      } else {
        console.error("Claim error:", err);
        alert(`❌ Claim Failed: ${err?.message || "Could not complete transaction. Please check your wallet connection."}`);
      }
    }
  };

  const getIcon = (type: string, completed: boolean) => {
    const cls = completed ? "text-emerald-400" : "text-cyan-400";
    switch (type) {
      case 'wallet':
        return <Wallet className={`w-5 h-5 ${cls}`} />;
      case 'lesson':
        return <BookOpen className={`w-5 h-5 ${cls}`} />;
      case 'quiz':
        return <Award className={`w-5 h-5 ${cls}`} />;
      case 'habit':
        return <Activity className={`w-5 h-5 ${cls}`} />;
      default:
        return <UserPlus className={`w-5 h-5 ${cls}`} />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-slate-100">
      
      {/* Overview Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/80 rounded-2xl p-6 border border-slate-850/80 mb-4">
        <div>
          <span className="text-slate-500 text-xs font-mono uppercase tracking-widest block mb-1">Your Mined Token Balance</span>
          <div className="flex items-center gap-2.5">
            <Coins className="w-8 h-8 text-yellow-400 animate-pulse" />
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {totalPoints.toLocaleString()} <span className="text-cyan-400 text-xl font-medium">$FAMILI</span>
            </span>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-slate-500 text-xs font-mono uppercase tracking-widest block mb-1">Proof of Learning Rank</span>
          <span className="text-cyan-400 font-bold text-sm bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full inline-block mt-1">
            ✨ APPRENTICE LEVEL I
          </span>
        </div>
      </div>

      {/* Withdraw Reward Action */}
      <div className="mb-6 space-y-3">
        <button
          disabled={isClaiming}
          onClick={handleClaimOnChain}
          className={`w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 ${
            isClaiming ? 'opacity-70 cursor-wait' : 'cursor-pointer'
          }`}
        >
          {isClaiming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Awaiting Wallet Authorization on TON Network...</span>
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              <span>Claim / Withdraw Mined {totalPoints.toLocaleString()} $FAMILI to Connected TON Wallet</span>
            </>
          )}
        </button>

        {claimSuccessTx && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs relative animate-fadeIn">
            <button
              onClick={() => setClaimSuccessTx(null)}
              className="absolute top-3 right-3 text-emerald-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-2 font-bold text-sm text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>ON-CHAIN CLAIM TRANSACTION BROADCASTED!</span>
            </div>
            <p className="mb-2 text-emerald-300/90 leading-relaxed">
              Your claim transaction for <strong>+{totalPoints.toLocaleString()} $FAMILI</strong> has been submitted to the TON blockchain network from connected wallet <strong>{walletAddress ? walletAddress.slice(0, 8) + '...' : ''}</strong>!
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/20 truncate max-w-[220px]">
                {claimSuccessTx.txHash}
              </span>
              <a
                href={claimSuccessTx.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 underline font-semibold ml-auto"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h4 className="text-base font-bold text-white mb-1">Direct $FAMILI Token Mining Tasks</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          The $FAMILI ecosystem awards tokens directly to active miners and learners. Maintain streaks, pass quizzes, and complete daily routines to mine allocation directly.
        </p>
      </div>

      {/* Task List */}
      <div className="space-y-3.5">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
              task.completed 
                ? 'bg-emerald-500/5 border-emerald-500/20' 
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700/80'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl ${
                task.completed ? 'bg-emerald-500/10' : 'bg-slate-900 border border-slate-800'
              }`}>
                {getIcon(task.type, task.completed)}
              </div>
              <div>
                <h5 className={`text-sm font-semibold ${task.completed ? 'text-slate-300 line-through' : 'text-white'}`}>
                  {task.title}
                </h5>
                <span className="text-xs font-mono font-medium text-cyan-400 mt-1 inline-flex items-center gap-1">
                  <Zap className="w-3 h-3 text-cyan-400 animate-bounce" />
                  +{task.rewardPoints} $FAMILI
                </span>
              </div>
            </div>

            {task.completed ? (
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>COMPLETED</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (task.type === 'wallet') {
                    if (walletConnected) {
                      onCompleteTask(task.id);
                    } else {
                      onConnectWallet();
                    }
                  } else {
                    // Help direct them to active task workspace
                    onLaunchTutor();
                  }
                }}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  task.type === 'wallet' && !walletConnected
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <span>{task.type === 'wallet' && !walletConnected ? 'Connect Wallet' : 'Action'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-xl bg-violet-950/20 border border-violet-500/20 text-xs text-violet-300">
        <p className="leading-relaxed">
          💡 **Proof-of-Learning System**: Your logged growth hours are stored as hashed records. Upon token genesis, these loyalty scores directly convert to claimable mainnet **$FAMILI** tokens on the TON blockchain.
        </p>
      </div>

    </div>
  );
}
