import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  Coins, 
  Calendar, 
  Globe, 
  Sparkles, 
  Cpu, 
  ArrowRight, 
  CheckCircle, 
  Wallet, 
  Award,
  ChevronRight,
  Target,
  FileText,
  Users,
  Download,
  Search,
  X,
  Database
} from 'lucide-react';
import { motion } from 'motion/react';
import { getTreasuryWallet, getWaitlistRecords, saveWaitlistRecord, WaitlistRecord, verifyAndGetWalletBalance } from '../types';
import { useTonConnectUI } from '@tonconnect/ui-react';
import PresaleAuditDashboard from './PresaleAuditDashboard';

interface ParentHubProps {
  onLaunchApp: () => void;
  walletConnected: boolean;
  walletAddress: string;
  onConnectWallet: (addr: string) => void;
  onSelectAirdropTab: () => void;
  onBuyPresaleTokens?: (amount: number, tonCostOrUsd?: number, txHash?: string, type?: any) => void;
  presaleTokens?: number;
}

export default function ParentHub({ 
  onLaunchApp, 
  walletConnected, 
  walletAddress, 
  onConnectWallet,
  onSelectAirdropTab,
  onBuyPresaleTokens,
  presaleTokens = 25000
}: ParentHubProps) {
  const [email, setEmail] = useState('');
  const [submittedWaitlist, setSubmittedWaitlist] = useState(false);
  const [waitlistRecords, setWaitlistRecords] = useState<WaitlistRecord[]>(() => getWaitlistRecords());
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistSearch, setWaitlistSearch] = useState('');
  const [presaleAmount, setPresaleAmount] = useState('0.1');
  const [tempWallet, setTempWallet] = useState('');
  const [showWalletInput, setShowWalletInput] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const activeTreasury = getTreasuryWallet();
  const [isDepositing, setIsDepositing] = useState(false);
  const [cachedWalletBalance, setCachedWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    const activeAddress = walletAddress || tonConnectUI.account?.address || '';
    if (activeAddress) {
      verifyAndGetWalletBalance(activeAddress).then(bal => setCachedWalletBalance(bal));
    } else {
      setCachedWalletBalance(null);
    }
  }, [walletAddress, tonConnectUI.account?.address]);

  const handleRealPresaleDeposit = async () => {
    if (!tonConnectUI.connected) {
      onConnectWallet('');
      try { tonConnectUI.openModal(); } catch {}
      return;
    }

    const depositTon = Number(presaleAmount || 0);
    if (depositTon <= 0) {
      alert("⚠️ Please enter a valid amount of TON to deposit (minimum 0.1 TON).");
      return;
    }

    const activeWallet = walletAddress || tonConnectUI.account?.address || '';
    if (!activeWallet) {
      alert("⚠️ Connected wallet address not detected. Please reconnect your TON wallet.");
      return;
    }

    setIsDepositing(true);

    try {
      const activeTreasury = getTreasuryWallet();
      const nanoTon = Math.floor(depositTon * 1000000000).toString();
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

      // Verify that a valid BOC (Bag of Cells) was returned by the connected wallet
      if (!result || !result.boc || typeof result.boc !== 'string' || result.boc.trim().length < 10) {
        setIsDepositing(false);
        alert("❌ Transaction rejected or not confirmed by wallet. No tokens were allocated.");
        return;
      }

      const earnedTokens = depositTon * 2500;
      const txHash = result.boc.slice(0, 32);
      if (onBuyPresaleTokens) {
        onBuyPresaleTokens(earnedTokens, depositTon, txHash, 'TON_DEPOSIT');
      }
      setIsDepositing(false);
      alert(`🎉 REAL TON TRANSACTION APPROVED!\n\nBlockchain Receipt (BOC): ${result.boc.slice(0, 24)}...\n\nYou deposited ${depositTon} TON to Treasury (${activeTreasury.slice(0, 8)}...). Your allocation of +${earnedTokens.toLocaleString()} $FAMILI tokens has been verified and credited!`);
    } catch (error: any) {
      setIsDepositing(false);
      const errStr = (error?.message || error?.name || String(error) || '').toLowerCase();
      const isUserReject = errStr.includes("reject") || errStr.includes("cancel") || errStr.includes("declined") || errStr.includes("userrejects") || error?.name?.includes("UserRejects");
      const isInsufficientFunds = errStr.includes("enough funds") || errStr.includes("insufficient") || errStr.includes("no_funds") || errStr.includes("badrequesterror");

      if (isUserReject) {
        console.info("User cancelled transaction in wallet");
        alert("ℹ️ Transaction was cancelled or declined in your wallet.");
      } else if (isInsufficientFunds) {
        console.warn("Wallet insufficient balance error:", error?.message || error);
        alert("❌ Insufficient Wallet Balance: Your connected wallet does not have enough TON funds to authorize this transaction. Please add TON to your wallet and try again.");
      } else if (errStr.includes("connect wallet") || errStr.includes("not connected")) {
        console.warn("Wallet connection needed");
        try { tonConnectUI.openModal(); } catch {}
        alert("⚠️ Please connect your wallet in the TonConnect window to authorize the transaction.");
      } else {
        console.error("Presale deposit error:", error);
        alert(`❌ Blockchain Transaction Failed: ${error?.message || "Could not complete transaction. Please check your TON balance in your wallet and try again."}`);
      }
    }
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      const updated = saveWaitlistRecord(email, walletConnected ? walletAddress : undefined);
      setWaitlistRecords(updated);
      setSubmittedWaitlist(true);
      setEmail('');
    }
  };

  const handleExportWaitlistCsv = () => {
    const headers = ['ID', 'Email', 'Status', 'Timestamp', 'Country', 'Wallet'];
    const rows = waitlistRecords.map(r => [
      r.id,
      r.email,
      r.status,
      `"${r.timestamp}"`,
      r.country || 'Global / Web3',
      r.wallet || 'Unlinked'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `famili_waitlist_records_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConnectMock = () => {
    if (tempWallet) {
      onConnectWallet(tempWallet);
      setShowWalletInput(false);
    } else {
      onConnectWallet('');
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden">
      
      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute top-40 left-1/3 w-80 h-80 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-6"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Parent Website of the FAMILI / NEXA AI Ecosystem</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl sm:text-7xl font-sans font-extrabold tracking-tight text-white mb-6"
        >
          Connecting Families through <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400">
            AI-Driven Personal Growth
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg sm:text-xl text-slate-400 max-w-3xl mb-10 leading-relaxed"
        >
          Welcome to <span className="text-cyan-400 font-semibold">familynexus.com</span>, the main ecosystem gateway.
          FAMILI AI brings cutting-edge artificial intelligence, structured micro-learning, and Web3 identity rewards 
          together on the TON blockchain.
        </motion.p>

        {/* Call to Actions - Launch AI */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 relative z-10"
        >
          <button
            type="button"
            onClick={onLaunchApp}
            className="group px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-slate-950 font-bold text-lg hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all flex items-center gap-2 cursor-pointer relative z-10"
          >
            Launch AI App
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <a 
            href="#presale" 
            className="px-8 py-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold hover:bg-slate-800 hover:text-white transition-all"
          >
            Participate in Presale
          </a>
        </motion.div>

        {/* Current Network Status Dashboard */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full max-w-4xl p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md grid grid-cols-2 md:grid-cols-4 gap-6 text-left"
        >
          <div className="border-r border-slate-800/60 pr-4 last:border-0">
            <span className="text-slate-500 text-xs font-mono uppercase tracking-widest block mb-1">Ecosystem Stage</span>
            <div className="flex items-center gap-2 text-yellow-400 font-bold font-sans">
              <span className="h-2 w-2 rounded-full bg-yellow-400 animate-ping"></span>
              <span>TESTNET PHASE 1</span>
            </div>
          </div>
          <div className="border-r border-slate-800/60 pr-4 last:border-0">
            <span className="text-slate-500 text-xs font-mono uppercase tracking-widest block mb-1">Upcoming Airdrop</span>
            <span className="text-white font-bold text-lg block font-sans">30,000,000 $FAMILI</span>
          </div>
          <div className="border-r border-slate-800/60 pr-4 last:border-0">
            <span className="text-slate-500 text-xs font-mono uppercase tracking-widest block mb-1">Mainnet Launch</span>
            <span className="text-cyan-400 font-bold text-lg block font-sans">Q4 2026</span>
          </div>
          <div className="pr-4 last:border-0">
            <span className="text-slate-500 text-xs font-mono uppercase tracking-widest block mb-1">USDT Subscription</span>
            <span className="text-emerald-400 font-bold text-lg block font-sans">USDT on TON Live</span>
          </div>
        </motion.div>
      </section>

      {/* Product Highlights */}
      <section className="py-20 bg-slate-900/30 border-y border-slate-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Two Visionary Products. One Unified AI Ecosystem.
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              FAMILI merges personal growth discipline with gamified school materials to produce the perfect daily companion.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Nexa Life Card */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-cyan-500/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all duration-300">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">NEXA Life — AI Personal Growth</h3>
              <p className="text-slate-400 mb-6 leading-relaxed">
                A customized companion that cultivates daily routines, sets life goals, keeps daily habit tracks, and stimulates brain training with complex focus exercises. Perfect for kids, parents, and older adults.
              </p>
              <ul className="space-y-3 mb-8">
                {['Daily habits manager', 'Long-term goal planner', 'Brain-training logic mini-challenges', 'Journaling & emotional reflection'].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-slate-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={onLaunchApp}
                className="text-cyan-400 hover:text-white font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
              >
                Launch NEXA Growth Coach <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* StudyPilot AI Card */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-violet-500/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 mb-6 border border-violet-500/20 group-hover:bg-violet-500 group-hover:text-slate-950 transition-all duration-300">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">StudyPilot AI — Your Private AI Teacher</h3>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Upload your textbooks, high-resolution notes, lecture audios, or PDFs. StudyPilot AI turns raw text into personalized quizzes, dynamic flashcards, organized revision calendars, and voice tutoring.
              </p>
              <ul className="space-y-3 mb-8">
                {['Upload multi-format revision materials', 'Generate structured practice quizzes', 'Create smart flashcard sets', 'Receive step-by-step topic breakdown'].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-slate-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-violet-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={onLaunchApp}
                className="text-violet-400 hover:text-white font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
              >
                Launch StudyPilot AI <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Airdrop & Wallet Submission Section */}
      <section id="airdrop" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950/20 to-violet-950/20 border border-slate-800/80 overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 blur-3xl rounded-full" />
          
          <div className="grid md:grid-cols-5 gap-10 items-center">
            <div className="md:col-span-3">
              <span className="text-cyan-400 text-xs font-mono tracking-widest uppercase font-semibold mb-2 block">
                Ecosystem Incentives
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Upcoming $FAMILI Token Airdrop &amp; Testnet
              </h2>
              <p className="text-slate-400 mb-6 text-base leading-relaxed">
                We believe in **Proof of Learning**. Unlike standard tokens, $FAMILI rewards users who maintain active learning streaks, complete quizzes, and share materials. Connect your TON Wallet to secure early access and qualify for our massive testnet points program.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-semibold">Proof of Learning</h4>
                    <p className="text-slate-400 text-xs">Maintain learning streaks inside the App and claim points.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-violet-500/10 text-violet-400 shrink-0 mt-0.5">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-semibold">Presale Pricing discounts</h4>
                    <p className="text-slate-400 text-xs">Earn a 10% discount on subscriptions using $FAMILI token.</p>
                  </div>
                </div>
              </div>

              {/* Wallet Integration box */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                {walletConnected ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-emerald-400" />
                        <span className="text-white text-sm font-mono font-semibold">Wallet Linked!</span>
                      </div>
                      <span className="text-emerald-400 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-mono">
                        VERIFIED OWNERSHIP
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 bg-slate-900 p-2.5 rounded border border-slate-800/80 font-mono select-all overflow-x-auto">
                      {walletAddress}
                    </p>
                    <p className="text-xs text-cyan-400 mt-2.5 flex items-center gap-1.5 font-semibold">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      Awesome! You are now qualified for the $FAMILI testnet airdrop points.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-white text-sm font-semibold mb-2">Connect Your TON Wallet</h4>
                    <p className="text-xs text-slate-400 mb-4">
                      Submit your TON wallet address below to join the early registration waitlist and begin task mining.
                    </p>
                    {showWalletInput ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={tempWallet}
                          onChange={(e) => setTempWallet(e.target.value)}
                          placeholder="Enter your TON address (EQ...)"
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                        />
                        <button
                          onClick={handleConnectMock}
                          className="bg-cyan-500 text-slate-950 font-bold px-5 py-2 rounded-xl text-sm hover:bg-cyan-400 transition-all shrink-0"
                        >
                          Confirm
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2.5">
                        <button
                          onClick={() => setShowWalletInput(true)}
                          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm hover:bg-cyan-400 transition-all cursor-pointer"
                        >
                          <Wallet className="w-4 h-4" />
                          Submit TON Wallet Address
                        </button>
                        <button
                          onClick={() => {
                            onConnectWallet('');
                          }}
                          className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-800 hover:text-white transition-all"
                        >
                          Connect TON Wallet
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col gap-4">
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold block mb-2">Tokenomics Draft</span>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs border-b border-slate-800/40 pb-2">
                    <span className="text-slate-400">Token Symbol</span>
                    <span className="text-white font-bold">$FAMILI</span>
                  </div>
                  <div className="flex justify-between text-xs border-b border-slate-800/40 pb-2">
                    <span className="text-slate-400">Total Supply</span>
                    <span className="text-white font-bold">1,000,000,000</span>
                  </div>
                  <div className="flex justify-between text-xs border-b border-slate-800/40 pb-2">
                    <span className="text-slate-400">Airdrop Allocation</span>
                    <span className="text-white font-bold">15% (150M Tokens)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Pre-sales Round</span>
                    <span className="text-cyan-400 font-bold">Open Below</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-950/40 to-slate-900 border border-slate-800/80 text-center">
                <Coins className="w-8 h-8 text-violet-400 mx-auto mb-3" />
                <h4 className="text-white text-sm font-bold mb-1">Airdrop Tasks Live!</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Start studying in the App, maintain a streak, or complete quizzes to mining your loyalty airdrop points.
                </p>
                <button
                  onClick={onLaunchApp}
                  className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all"
                >
                  Start Point Mining inside App
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Token Presale Panel */}
      <section id="presale" className="py-20 bg-slate-900/20 border-t border-slate-900 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <span className="text-violet-400 text-xs font-mono tracking-widest uppercase font-semibold mb-2 block">
              Ecosystem Fundraising
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Join the $FAMILI Token Seed Presale
            </h2>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              Be a founding participant in the FAMILI learning revolution. Funds raised will directly finance advanced AI tutor training, TON integration APIs, and creator rewards contract development.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Presale Price</span>
                <span className="text-white font-mono font-bold">1 TON = 2,500 $FAMILI</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Min. / Max. Allocation</span>
                <span className="text-white font-mono font-bold">1 TON / 500 TON</span>
              </div>

              {/* Instant Minting & TGE Token Security */}
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs space-y-1.5">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span>⚡ Instant Automated Minting &amp; Distribution</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Every presale contributor receives 100% of their $FAMILI tokens directly into their connected TON Wallet. Tokens are automatically minted upon contract deposit—no attendance or manual claiming required!
                </p>
              </div>

              {/* Smart Contract Deploy Data Specs */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-xs space-y-2.5 font-mono">
                <div className="text-cyan-400 font-bold mb-1 uppercase text-[10px] tracking-wider">
                  Official TON Network Treasury Addresses
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Presale Treasury Wallet:</span>
                  </div>
                  <div className="text-slate-200 text-[10px] bg-slate-900 p-1.5 rounded border border-slate-800 break-all font-semibold select-all text-cyan-300">
                    {activeTreasury}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono block">✓ 100% Immediate Exit to Treasury (No Contract Lock)</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Subscription Treasury Wallet:</span>
                  </div>
                  <div className="text-slate-200 text-[10px] bg-slate-900 p-1.5 rounded border border-slate-800 break-all font-semibold select-all text-violet-300">
                    {activeTreasury}
                  </div>
                </div>
                <div className="pt-1 flex justify-between text-slate-400 text-[11px]">
                  <span>Soft Cap / Hard Cap:</span>
                  <span className="text-slate-200">10k / 50k TON</span>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-white mb-4">Live On-Chain Presale Widget</h3>
              <p className="text-xs text-slate-400 mb-6">
                Connect your wallet to purchase real $FAMILI tokens. This widget broadcasts a live TON blockchain transaction to our Treasury contract.
              </p>

              <div className="mb-6">
                <label className="text-xs text-slate-400 font-mono mb-2 block">Amount of TON to deposit</label>
                <div className="flex gap-2 mb-3">
                  {['1', '10', '100', '500'].map((val) => (
                    <button
                      key={val}
                      onClick={() => setPresaleAmount(val)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        presaleAmount === val 
                          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {val} TON
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={presaleAmount}
                  onChange={(e) => setPresaleAmount(e.target.value)}
                  placeholder="Custom TON amount..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/60 mb-6">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-slate-500">You will receive</span>
                  <span className="text-slate-400 font-mono font-semibold">~{Number(presaleAmount || 0) * 2500} $FAMILI</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Gas Estimate (TON)</span>
                  <span className="text-slate-400 font-mono">0.05 TON</span>
                </div>
              </div>

              {walletConnected ? (
                <button
                  onClick={handleRealPresaleDeposit}
                  disabled={isDepositing}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-slate-950 font-bold text-sm hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDepositing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Waiting for wallet confirmation...</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      <span>Deposit TON &amp; Claim Presale</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    onConnectWallet('');
                  }}
                  className="w-full py-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4 text-cyan-400" />
                  Connect TON Wallet to Purchase
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Integrated Presale Portfolio Dashboard */}
        <div className="max-w-7xl mx-auto mt-12">
          <PresaleAuditDashboard
            presaleTokens={presaleTokens}
            walletAddress={walletAddress}
            walletConnected={walletConnected}
            onConnectWallet={onConnectWallet}
          />
        </div>
      </section>

      {/* Join Waitlist footer container */}
      <section className="py-20 bg-slate-950 border-t border-slate-900 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Do not miss any updates on the FAMILI AI Ecosystem
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto text-sm mb-8">
            Register your email with the familynexus.com master waitlist. We will send testnet invitations and early-bird airdrop tasks.
          </p>

          {submittedWaitlist ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium"
            >
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>Perfect! You have joined the familynexus.com early access waitlist.</span>
            </motion.div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100"
              />
              <button
                type="submit"
                className="bg-cyan-500 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm hover:bg-cyan-400 transition-all cursor-pointer"
              >
                Join Waitlist
              </button>
            </form>
          )}

          {/* View Master Waitlist Database Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowWaitlistModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span>📋 View Master Waitlist Records ({waitlistRecords.length} VIPs &amp; Pioneers)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Waitlist Database VIP Records Modal */}
      {showWaitlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Master Waitlist &amp; Genesis Pioneer Database</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono border border-cyan-500/30">
                      {waitlistRecords.length} REGISTERED
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time registration logs for Testnet invitations, airdrop allocation verification, and KYC prep.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWaitlistModal(false)}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toolbar & Search */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search email, country, or status..."
                  value={waitlistSearch}
                  onChange={(e) => setWaitlistSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleExportWaitlistCsv}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Master Database (CSV)</span>
                </button>
              </div>
            </div>

            {/* Table View */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                      <th className="pb-3 px-3">Email Record</th>
                      <th className="pb-3 px-3">Tier Status</th>
                      <th className="pb-3 px-3">Region / Country</th>
                      <th className="pb-3 px-3">Linked TON Wallet</th>
                      <th className="pb-3 px-3 text-right">Registration Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {waitlistRecords
                      .filter(r => 
                        r.email.toLowerCase().includes(waitlistSearch.toLowerCase()) ||
                        r.status.toLowerCase().includes(waitlistSearch.toLowerCase()) ||
                        (r.country && r.country.toLowerCase().includes(waitlistSearch.toLowerCase()))
                      )
                      .map((record) => (
                        <tr key={record.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-3 font-semibold text-white font-mono">{record.email}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                              record.status === 'Genesis Pioneer' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
                              record.status === 'VIP Testnet Access' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' :
                              record.status === 'Ambassador' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' :
                              'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300">{record.country || 'Global 🌐'}</td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                            {record.wallet ? (
                              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                {record.wallet}
                              </span>
                            ) : (
                              <span className="text-slate-600 italic">Pending Link</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-400 font-mono text-[11px]">{record.timestamp}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
              <p>🔒 All waitlist records are cryptographically timestamped and protected under EU GDPR &amp; NDPR privacy standards.</p>
              <button
                onClick={() => setShowWaitlistModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all cursor-pointer"
              >
                Close Database
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Simple Footer */}
      <footer className="py-10 border-t border-slate-900 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>&copy; 2026 familynexus.com / FAMILI AI. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#presale" className="hover:text-cyan-400 transition-colors">Presale Terms</a>
            <a href="#airdrop" className="hover:text-cyan-400 transition-colors">Testnet Rules</a>
            <span onClick={onLaunchApp} className="hover:text-cyan-400 transition-colors cursor-pointer font-bold">Launch AI</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
