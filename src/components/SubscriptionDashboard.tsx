import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  Coins, 
  Calendar, 
  Sparkles, 
  XCircle, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { getTreasuryWallet, verifyAndGetWalletBalance } from '../types';
import PresaleAuditDashboard from './PresaleAuditDashboard';

interface SubscriptionDashboardProps {
  subscriptionPlan: string; // 'free', 'pro', 'family_premium'
  onOpenUpgrade: () => void;
  onCancelSubscription: () => void;
  autoRenew: boolean;
  expiryTimestamp: number; // epoch ms
  presaleTokens: number;
  onBuyPresaleTokens: (amount: number, tonCostOrUsd?: number, txHash?: string, type?: any) => void;
}

export default function SubscriptionDashboard({
  subscriptionPlan,
  onOpenUpgrade,
  onCancelSubscription,
  autoRenew,
  expiryTimestamp,
  presaleTokens,
  onBuyPresaleTokens
}: SubscriptionDashboardProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const [buyAmountUsd, setBuyAmountUsd] = useState<number>(50);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const [isBuying, setIsBuying] = useState(false);
  const [cachedWalletBalance, setCachedWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    const activeAddress = tonWallet?.account?.address || '';
    if (activeAddress) {
      verifyAndGetWalletBalance(activeAddress).then(bal => setCachedWalletBalance(bal));
    } else {
      setCachedWalletBalance(null);
    }
  }, [tonWallet?.account?.address]);

  const handleDashboardPresaleBuy = async () => {
    if (!tonWallet) {
      alert("⚠️ Please connect your TON wallet first from the main navigation header to participate in the real on-chain $FAMILI presale!");
      try { tonConnectUI.openModal(); } catch {}
      return;
    }
    
    const activeWallet = tonWallet.account.address || '';
    const tonAmount = Math.max(0.1, buyAmountUsd / 5);

    setIsBuying(true);

    try {
      const activeTreasury = getTreasuryWallet();
      const nanoTon = Math.floor(tonAmount * 1000000000).toString();
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
        setIsBuying(false);
        alert("❌ Presale transaction rejected or not confirmed by wallet.");
        return;
      }

      const txHash = result.boc.slice(0, 32);
      onBuyPresaleTokens(tokensForPurchase, tonAmount, txHash, 'TON_DEPOSIT');
      setIsBuying(false);
      alert(`🎉 ON-CHAIN PRESALE PURCHASE CONFIRMED!\n\nReceipt BOC: ${result.boc.slice(0, 24)}...\n\nYou successfully contributed ~${tonAmount.toFixed(2)} TON to Treasury (${activeTreasury.slice(0, 8)}...) and received +${tokensForPurchase.toLocaleString()} $FAMILI tokens!`);

      if (activeWallet) {
        verifyAndGetWalletBalance(activeWallet).then(bal => setCachedWalletBalance(bal));
      }
    } catch (error: any) {
      setIsBuying(false);
      const errStr = (error?.message || error?.name || String(error) || '').toLowerCase();
      const isUserReject = errStr.includes("reject") || errStr.includes("cancel") || errStr.includes("declined") || errStr.includes("userrejects") || error?.name?.includes("UserRejects");
      const isInsufficientFunds = errStr.includes("enough funds") || errStr.includes("insufficient") || errStr.includes("no_funds") || errStr.includes("badrequesterror");

      if (isUserReject) {
        console.info("User cancelled transaction in wallet");
        alert("ℹ️ Transaction was cancelled or declined in your wallet.");
      } else if (isInsufficientFunds) {
        console.warn("Wallet insufficient balance error:", error?.message || error);
        alert("❌ Insufficient Wallet Balance: Your connected wallet does not have enough TON funds to authorize this transaction. Please add TON to your wallet and try again.");
      } else {
        console.error("Presale buy error:", error);
        alert(`❌ Blockchain Transaction Failed: ${error?.message || "Could not complete transaction. Please check your TON balance and network status."}`);
      }
    }
  };

  // Token Presale economics
  const PRESALE_RATE_USD = 0.005; // $0.005 USD per 1 $FAMILI token
  const PRESALE_HARD_CAP = 100000000; // 100 Million tokens (10% of 1B supply)
  const currentPresaleRaised = 24500000; // 24.5M tokens sold so far across community

  // Calculate remaining time until subscription expiry
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, expiryTimestamp - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiryTimestamp]);

  const planName = subscriptionPlan === 'family_premium' 
    ? 'Family Premium Tier' 
    : subscriptionPlan === 'pro' 
      ? 'Pro Learner Tier' 
      : 'Free Tier';

  const planPrice = subscriptionPlan === 'family_premium' 
    ? '$19.99 USD / month' 
    : subscriptionPlan === 'pro' 
      ? '$7.99 USD / month' 
      : '$0.00 USD';

  const tokensForPurchase = Math.floor(buyAmountUsd / PRESALE_RATE_USD);

  const expiryDateFormatted = new Date(expiryTimestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* SECTION 1: SUBSCRIPTION STATUS & EXPIRATION CLOCK */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Current Active Membership</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                subscriptionPlan !== 'free' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {subscriptionPlan !== 'free' ? 'SUBSCRIBED' : 'FREE TIER'}
              </span>
            </div>
            <h3 className="text-2xl font-black text-white flex items-center gap-2">
              {planName}
              {subscriptionPlan !== 'free' && <ShieldCheck className="w-6 h-6 text-cyan-400" />}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Rate: {planPrice}</p>
          </div>

          <div className="flex items-center gap-3">
            {subscriptionPlan === 'free' ? (
              <button
                type="button"
                onClick={onOpenUpgrade}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-slate-950 font-bold text-xs hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade to Premium
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenUpgrade}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                Change Plan
              </button>
            )}
          </div>
        </div>

        {/* Expiration Clock & Auto-Renew info */}
        {subscriptionPlan !== 'free' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            
            {/* Live Countdown Clock */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
                  Subscription Expiration Countdown
                </span>
                <span className="text-[11px] font-mono text-slate-400">Expires: {expiryDateFormatted}</span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-2xl font-black text-white font-mono">{timeLeft.days}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">Days</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-2xl font-black text-cyan-400 font-mono">{String(timeLeft.hours).padStart(2, '0')}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">Hours</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-2xl font-black text-cyan-400 font-mono">{String(timeLeft.minutes).padStart(2, '0')}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">Mins</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-2xl font-black text-violet-400 font-mono">{String(timeLeft.seconds).padStart(2, '0')}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">Secs</div>
                </div>
              </div>
            </div>

            {/* Cancel Subscription without refund Action Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Renewal Settings</span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                  autoRenew 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {autoRenew ? 'Auto-Renew Active' : 'Cancelled (Expires Soon)'}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {autoRenew 
                  ? 'Your subscription will automatically renew at the end of the 30-day billing cycle unless cancelled beforehand.' 
                  : `Subscription renewal has been cancelled. Full access remains active without refund until ${expiryDateFormatted}.`}
              </p>

              {autoRenew ? (
                <div>
                  {!showCancelConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(true)}
                      className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel Subscription (No Refund)
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 space-y-2">
                      <p className="text-[11px] text-red-300 font-medium">
                        Are you sure you want to cancel auto-renewal? You will retain full access until {expiryDateFormatted} without refund.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onCancelSubscription();
                            setShowCancelConfirm(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Confirm Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCancelConfirm(false)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          Keep Subscription
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-400 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Cancelled: Service active until {expiryDateFormatted}</span>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* SECTION 2: PRESALE TOKEN ALLOCATION & RESERVATION SPACE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 block mb-1">
              Strict 10% Community Presale Pool
            </span>
            <h4 className="text-xl font-bold text-white flex items-center gap-2">
              $FAMILI Presale &amp; Token Allocation Dashboard
              <Coins className="w-5 h-5 text-yellow-400" />
            </h4>
          </div>
          
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Presale Fixed Rate</span>
            <span className="text-sm font-extrabold text-emerald-400 font-mono">$0.005 USD / 1 $FAMILI</span>
          </div>
        </div>

        {/* Presale Cap Progress Bar */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Presale Pool Allocation Raised</span>
            <span className="text-cyan-400 font-mono font-bold">
              {(currentPresaleRaised + presaleTokens).toLocaleString()} / {PRESALE_HARD_CAP.toLocaleString()} $FAMILI (10% Cap)
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800 p-0.5">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-400 transition-all duration-500"
              style={{ width: `${Math.min(100, ((currentPresaleRaised + presaleTokens) / PRESALE_HARD_CAP) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>0 $FAMILI (0%)</span>
            <span>Hard Cap: 100,000,000 $FAMILI (10% Total Token Supply)</span>
          </div>
        </div>

        {/* Subscriber Presale Amount Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* User Presale Allocation Card */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/20 flex flex-col justify-between">
            <div>
              <span className="text-slate-400 text-xs font-mono uppercase block mb-1">Your Presale Token Balance</span>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  <Zap className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="text-3xl font-black text-white tracking-tight">
                    {presaleTokens.toLocaleString()} <span className="text-cyan-400 text-lg font-bold">$FAMILI</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Estimated Value: ${(presaleTokens * PRESALE_RATE_USD).toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 mt-4 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reserved for Mainnet TGE Claims</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Tokens allocated during presale &amp; subscription bonus tiers will be claimable directly to your connected TON Wallet upon Token Generation Event (TGE).
              </p>
            </div>
          </div>

          {/* Additional Presale Purchase Widget */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-slate-400 text-xs font-mono uppercase block mb-2">Reserve Additional Presale Tokens</span>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Purchase Amount in USD ($)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs font-bold">$</span>
                    <input
                      type="number"
                      min="10"
                      max="2000"
                      value={buyAmountUsd}
                      onChange={(e) => setBuyAmountUsd(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">You Receive:</span>
                  <span className="text-amber-400 font-extrabold text-sm">
                    +{tokensForPurchase.toLocaleString()} $FAMILI
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDashboardPresaleBuy}
              disabled={isBuying}
              className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 disabled:opacity-50"
            >
              {isBuying ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Waiting for wallet confirmation...</span>
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4 text-slate-950" />
                  <span>Buy {tokensForPurchase.toLocaleString()} $FAMILI Presale</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Integrated Presale Audit Log & TGE Dashboard */}
      <div className="mt-8 pt-8 border-t border-slate-800">
        <PresaleAuditDashboard
          presaleTokens={presaleTokens}
          walletAddress={tonWallet?.account?.address || 'Connected Wallet'}
          walletConnected={!!tonWallet}
        />
      </div>

    </div>
  );
}
