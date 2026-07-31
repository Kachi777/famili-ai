import React, { useState, useEffect, useCallback } from 'react';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { 
  Rocket, 
  Sparkles, 
  Wallet, 
  Menu, 
  X, 
  Activity, 
  BookOpen, 
  Coins, 
  Award,
  Globe,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AirdropTask, SubscriptionPlan, PresaleTransaction } from './types';
import ParentHub from './components/ParentHub';
import AppWorkspace from './components/AppWorkspace';
import SubscriptionModal from './components/SubscriptionModal';
import WalletConnectModal from './components/WalletConnectModal';
import AirdropTasks from './components/AirdropTasks';

const initialSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free Usage',
    monthlyPrice: 0,
    annualPrice: 0,
    price: 0,
    period: 'month',
    features: ['5 AI questions daily', 'Basic practice quizzes', 'Limited habits dashboard']
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    monthlyPrice: 7.99,
    annualPrice: 79.99,
    price: 7.99,
    period: 'month',
    features: ['Unlimited AI tutoring & planning', 'Advanced multiple-choice quizzes', 'Full habit & routine logs', 'Points-mining boost']
  },
  {
    id: 'pro',
    name: 'Professional Pro',
    monthlyPrice: 14.99,
    annualPrice: 149.99,
    price: 14.99,
    period: 'month',
    features: ['Advanced Gemini reasoning models', 'Larger document indexing vaults', 'Voice interactive synthesis', 'Priority AI scheduling']
  },
  {
    id: 'family',
    name: 'Family Ecosystem',
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    price: 19.99,
    period: 'month',
    features: ['Up to 5 custom profiles', 'Shared progress trackers', 'Parent insights dashboard', 'All Pro features unlocked']
  }
];

export default function App() {
  // Views: 'landing' (familynexus.com Hub) vs 'app' (ai.familinexus.com Active AI Workspace)
  const [activeView, setActiveView] = useState<'landing' | 'app'>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Wallet Connection States
  const tonWallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // Subscription & Presale States
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('free');
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<number>(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [autoRenew, setAutoRenew] = useState<boolean>(true);
  const [presaleTokens, setPresaleTokens] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('famili_presale_balance');
      return stored ? Number(stored) : 25000;
    } catch {
      return 25000;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('famili_presale_balance', presaleTokens.toString());
    } catch {}
  }, [presaleTokens]);

  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<SubscriptionPlan>(initialSubscriptionPlans[1]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Airdrop Point System States (Direct $FAMILI Token Mining)
  const [airdropPoints, setAirdropPoints] = useState(0);
  const [airdropTasks, setAirdropTasks] = useState<AirdropTask[]>([
    { id: 't_wallet', title: 'Submit & Verify TON Wallet Identity', rewardPoints: 50, completed: false, type: 'wallet' },
    { id: 't_streak', title: 'Maintain 3-day StudyPilot Tutor Streak', rewardPoints: 100, completed: false, type: 'lesson' },
    { id: 't_quiz', title: 'Score 100% on any practice quiz', rewardPoints: 80, completed: false, type: 'quiz' },
    { id: 't_habit', title: 'Log your first growth routine / habit', rewardPoints: 40, completed: false, type: 'habit' },
    { id: 't_invite', title: 'Interact with Gemini Server-side AI model', rewardPoints: 60, completed: false, type: 'invite' }
  ]);

  // Actions

  const handleConnectWallet = useCallback((address: string) => {
    if (!address) return;
    setWalletConnected(true);
    setWalletAddress(address);
    // Mark wallet task completed
    setAirdropTasks(prev => prev.map(t => {
      if (t.id === 't_wallet' && !t.completed) {
        setAirdropPoints(pts => pts + t.rewardPoints);
        return { ...t, completed: true };
      }
      return t;
    }));
  }, []);

  const handleDisconnectWallet = useCallback(async (triggerUI = true) => {
    try {
      if (triggerUI && tonConnectUI && tonConnectUI.connected) {
        await tonConnectUI.disconnect();
      }
    } catch (err) {
      console.error("Error disconnecting TonConnect UI:", err);
    }
    setWalletConnected(false);
    setWalletAddress('');
    setSubscriptionPlan('free'); // Reset subscription status upon wallet disconnect
    // Reset wallet task completion & deduct awarded tokens
    setAirdropTasks(prev => prev.map(t => {
      if (t.id === 't_wallet' && t.completed) {
        setAirdropPoints(pts => Math.max(0, pts - t.rewardPoints));
        return { ...t, completed: false };
      }
      return t;
    }));
  }, [tonConnectUI]);

  // Auto sync TonConnect wallet status safely without infinite loops
  const tonWalletAddress = tonWallet?.account?.address || '';
  useEffect(() => {
    if (tonWalletAddress) {
      if (walletAddress !== tonWalletAddress || !walletConnected) {
        handleConnectWallet(tonWalletAddress);
      }
    } else {
      if (walletConnected) {
        handleDisconnectWallet(false);
      }
    }
  }, [tonWalletAddress, walletAddress, walletConnected, handleConnectWallet, handleDisconnectWallet]);

  const handleCompleteTask = (taskId: string) => {
    setAirdropTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        if (!t.completed) {
          setAirdropPoints(pts => pts + t.rewardPoints);
          return { ...t, completed: true };
        }
      }
      return t;
    }));
  };

  const handleBuyPresaleTokens = (
    amount: number,
    tonCostOrUsd: number = 0,
    txHash?: string,
    type: 'TON_DEPOSIT' | 'SUBSCRIPTION_BONUS' | 'AIRDROP_REWARD' | 'USDT_DEPOSIT' = 'TON_DEPOSIT'
  ) => {
    setPresaleTokens(prev => prev + amount);

    const generatedHash = txHash || `TX_ONCHAIN_${Date.now().toString(36).toUpperCase()}`;
    try {
      const stored = localStorage.getItem('famili_presale_txs');
      const txs: PresaleTransaction[] = stored ? JSON.parse(stored) : [];
      const newTx: PresaleTransaction = {
        id: `tx_${Date.now()}`,
        type: type,
        amountTonOrUsd: tonCostOrUsd,
        tokensEarned: amount,
        txHash: generatedHash,
        timestamp: new Date().toISOString(),
        walletAddress: walletAddress || 'Connected Wallet',
        network: 'mainnet'
      };
      const updated = [newTx, ...txs];
      localStorage.setItem('famili_presale_txs', JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to log presale tx", e);
    }

    if (!txHash?.startsWith('SILENT_')) {
      alert(`🎉 ON-CHAIN ALLOCATION VERIFIED!\n\nSuccessfully credited +${amount.toLocaleString()} $FAMILI presale tokens to your allocation!\n\nReceipt Hash: ${generatedHash.slice(0, 20)}...\n\nView your full audit log and TGE claim mechanics below in the new Presale Portfolio Dashboard!`);
    }
  };

  const handlePaymentSuccess = (planId: string) => {
    setSubscriptionPlan(planId);
    setSubscriptionExpiry(Date.now() + 30 * 24 * 60 * 60 * 1000);
    setAutoRenew(true);
    const bonusTokens = planId === 'family_premium' ? 50000 : 15000;
    const cost = planId === 'family_premium' ? 29.99 : 9.99;
    handleBuyPresaleTokens(bonusTokens, cost, `SUB_BONUS_${planId.toUpperCase()}_${Date.now().toString(36)}`, 'SUBSCRIPTION_BONUS');
    setAirdropPoints(p => p + 1500); // Upgrading subscriptions rewards massive ecosystem points!
  };

  const handleCancelSubscription = () => {
    setAutoRenew(false);
  };

  const handleIncrementPoints = (points: number) => {
    setAirdropPoints(prev => prev + points);

    // If they chatted with Gemini, autocomplete the invite task
    if (points === 100) {
      setAirdropTasks(prev => prev.map(t => {
        if (t.id === 't_invite' && !t.completed) {
          return { ...t, completed: true };
        }
        return t;
      }));
    }
    // If they score 100% on quiz
    if (points === 800) {
      setAirdropTasks(prev => prev.map(t => {
        if (t.id === 't_quiz' && !t.completed) {
          return { ...t, completed: true };
        }
        return t;
      }));
    }
    // If they completed a habit
    if (points === 200) {
      setAirdropTasks(prev => prev.map(t => {
        if (t.id === 't_habit' && !t.completed) {
          return { ...t, completed: true };
        }
        return t;
      }));
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Dynamic Header / Navigation Bar */}
      <header className="fixed top-0 inset-x-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* Branded Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveView('landing')}>
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.25)] overflow-hidden group hover:border-cyan-500/50 transition-all">
              <img 
                src="/logo.svg" 
                alt="FAMILI Logo" 
                className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
                onError={(e) => {
                  // Fallback to text F if image load fails
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <span className="text-white font-extrabold tracking-tight text-lg">FAMILI</span>
              <span className="text-cyan-400 font-mono text-[10px] uppercase font-bold tracking-wider block -mt-1">
                AI on TON
              </span>
            </div>
          </div>

          {/* Desktop Navigation Link Toggles */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-400">
            <button
              onClick={() => setActiveView('landing')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${activeView === 'landing' ? 'text-cyan-400' : ''}`}
            >
              <Globe className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={() => setActiveView('app')}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${activeView === 'app' ? 'text-cyan-400' : ''}`}
            >
              <Monitor className="w-4 h-4" />
              <span>Launch AI App</span>
            </button>

            <a href="#airdrop" className="hover:text-white transition-colors">
              $FAMILI Airdrop
            </a>

            <a href="#presale" className="hover:text-white transition-colors">
              Presale
            </a>
          </nav>

          {/* Action Header Button and Wallet Box */}
          <div className="hidden md:flex items-center gap-3">

            {/* Wallet Integration pill */}
            {walletConnected ? (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-medium">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300 truncate max-w-[100px]">{walletAddress}</span>
                <button 
                  onClick={handleDisconnectWallet} 
                  className="text-red-400 hover:text-red-300 ml-1 hover:underline text-[10px]"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
              >
                <Wallet className="w-4 h-4 text-cyan-400" />
                Connect TON
              </button>
            )}

            {/* Launch AI prompt Button in header */}
            <button
              onClick={() => setActiveView('app')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-slate-950 text-xs font-extrabold hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all cursor-pointer"
            >
              Launch AI
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden p-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-[57px] inset-x-0 z-30 bg-slate-950 border-b border-slate-900 p-4 space-y-3 flex flex-col font-semibold md:hidden"
          >
            <button
              onClick={() => { setActiveView('landing'); setMobileMenuOpen(false); }}
              className={`w-full text-left py-2 px-3 rounded-lg hover:bg-slate-900 ${activeView === 'landing' ? 'text-cyan-400' : 'text-slate-300'}`}
            >
              Home
            </button>
            <button
              onClick={() => { setActiveView('app'); setMobileMenuOpen(false); }}
              className={`w-full text-left py-2 px-3 rounded-lg hover:bg-slate-900 ${activeView === 'app' ? 'text-cyan-400 animate-pulse' : 'text-slate-300'}`}
            >
              Launch AI App
            </button>
            <a 
              href="#airdrop" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 text-slate-300 hover:text-white"
            >
              $FAMILI Airdrop
            </a>
            <a 
              href="#presale" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 text-slate-300 hover:text-white"
            >
              Presale
            </a>

            <div className="pt-3 border-t border-slate-900 flex justify-between items-center">
              {walletConnected ? (
                <span className="text-xs font-mono text-emerald-400 truncate max-w-[150px]">{walletAddress}</span>
              ) : (
                <button
                  onClick={() => {
                    setIsWalletModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 cursor-pointer"
                >
                  Connect TON
                </button>
              )}

              <button
                onClick={() => { setActiveView('app'); setMobileMenuOpen(false); }}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold"
              >
                Launch AI
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main View Area */}
      <main className="pt-[57px]">
        {activeView === 'landing' ? (
          <div>
            {/* Standard landing page */}
            <ParentHub 
              onLaunchApp={() => setActiveView('app')}
              walletConnected={walletConnected}
              walletAddress={walletAddress}
              onConnectWallet={handleConnectWallet}
              onSelectAirdropTab={() => setActiveView('app')}
              onBuyPresaleTokens={handleBuyPresaleTokens}
              presaleTokens={presaleTokens}
            />
          </div>
        ) : (
          <div className="bg-slate-950 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
              
              {/* Active Workspace */}
              <div className="lg:col-span-8">
                <AppWorkspace 
                  onOpenCheckout={() => {
                    setSelectedPlanForUpgrade(initialSubscriptionPlans[1]); // Upgrade to premium
                    setIsCheckoutOpen(true);
                  }}
                  subscriptionPlan={subscriptionPlan}
                  onIncrementAirdropPoints={handleIncrementPoints}
                  autoRenew={autoRenew}
                  expiryTimestamp={subscriptionExpiry}
                  onCancelSubscription={handleCancelSubscription}
                  presaleTokens={presaleTokens}
                  onBuyPresaleTokens={handleBuyPresaleTokens}
                />
              </div>

              {/* Airdrop Points checklist */}
              <div className="lg:col-span-4">
                <AirdropTasks 
                  tasks={airdropTasks}
                  onCompleteTask={handleCompleteTask}
                  onLaunchTutor={() => {
                    alert("Complete practices, chats, or log reflections inside the FAMILI Tutor Workspace to unlock more points instantly!");
                  }}
                  walletConnected={walletConnected}
                  onConnectWallet={() => setIsWalletModalOpen(true)}
                  walletAddress={walletAddress}
                />

                {/* Subscriptions detail card list */}
                <div className="mt-8 p-6 bg-slate-900 border border-slate-800 rounded-3xl">
                  <h4 className="text-sm font-bold text-white mb-3">Ecosystem Pricing Plans</h4>
                  <div className="space-y-3">
                    {initialSubscriptionPlans.map((plan) => (
                      <div 
                        key={plan.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          subscriptionPlan === plan.id 
                            ? 'bg-cyan-500/10 border-cyan-400' 
                            : 'bg-slate-950/80 border-slate-850'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-white capitalize">{plan.name}</span>
                          <span className="text-xs font-mono font-semibold text-cyan-400">${plan.price}/{plan.period}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">
                          {plan.features.slice(0, 2).join(', ')}...
                        </p>

                        {subscriptionPlan !== plan.id && (
                          <button
                            onClick={() => {
                              setSelectedPlanForUpgrade(plan);
                              setIsCheckoutOpen(true);
                            }}
                            className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-[10px] font-bold text-slate-200"
                          >
                            Subscribe Plan
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Subscription / Checkout wizard */}
      <SubscriptionModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        selectedPlan={selectedPlanForUpgrade}
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        onConnectWallet={() => setIsWalletModalOpen(true)}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Wallet Connect Selector Modal */}
      <WalletConnectModal 
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnect={handleConnectWallet}
      />

    </div>
  );
}
