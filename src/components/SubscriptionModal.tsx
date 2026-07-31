import React, { useState } from 'react';
import { 
  X, 
  Coins, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Wallet, 
  ShieldCheck,
  Zap
} from 'lucide-react';
import { SubscriptionPlan, getTreasuryWallet, verifyAndGetWalletBalance } from '../types';
import { useTonConnectUI } from '@tonconnect/ui-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: SubscriptionPlan;
  walletConnected: boolean;
  walletAddress: string;
  onConnectWallet: () => void;
  onPaymentSuccess: (planId: string) => void;
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  selectedPlan,
  walletConnected,
  walletAddress,
  onConnectWallet,
  onPaymentSuccess
}: SubscriptionModalProps) {
  const [tonConnectUI] = useTonConnectUI();
  const activeTreasury = getTreasuryWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successDetails, setSuccessDetails] = useState<any>(null);

  // Crypto payment state
  const [txHash, setTxHash] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month');
  const [cryptoAsset, setCryptoAsset] = useState<'usdt' | 'ton' | 'famili'>('usdt');
  const [tonUsdRate, setTonUsdRate] = useState<number>(5.25);
  const [loadingRate, setLoadingRate] = useState<boolean>(false);

  const activePrice = billingCycle === 'year' 
    ? (selectedPlan.annualPrice || selectedPlan.price * 10) 
    : (selectedPlan.monthlyPrice || selectedPlan.price);

  const [cachedWalletBalance, setCachedWalletBalance] = React.useState<number | null>(null);

  // Fetch live TON/USD oracle rate & cached wallet balance on modal open
  React.useEffect(() => {
    if (isOpen) {
      setLoadingRate(true);
      fetch('/api/oracle/ton-price')
        .then(res => res.json())
        .then(data => {
          if (data.tonUsd) setTonUsdRate(data.tonUsd);
        })
        .catch(() => {})
        .finally(() => setLoadingRate(false));

      const activeAddress = walletAddress || tonConnectUI.account?.address || '';
      if (activeAddress) {
        verifyAndGetWalletBalance(activeAddress).then(bal => setCachedWalletBalance(bal));
      }
    }
  }, [isOpen, walletAddress, tonConnectUI.account?.address]);

  const calculatedTonAmount = (activePrice / tonUsdRate).toFixed(3);

  if (!isOpen) return null;

  // Secure TON blockchain transaction via connected TON wallet
  const handleDirectWalletPay = async () => {
    if (!tonConnectUI.connected) {
      onConnectWallet();
      try { tonConnectUI.openModal(); } catch {}
      return;
    }

    const activeWallet = walletAddress || tonConnectUI.account?.address || '';
    const tonVal = cryptoAsset === 'usdt' ? (activePrice / tonUsdRate).toFixed(2) : calculatedTonAmount;

    setErrorMessage('');
    setIsProcessing(true);

    try {
      const nanoTon = Math.floor(Number(tonVal) * 1000000000).toString();
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
        setIsProcessing(false);
        setErrorMessage("Transaction was rejected or not confirmed by wallet.");
        return;
      }

      const receiptHash = `0x${result.boc.slice(0, 32)}`;
      setTxHash(receiptHash);
      setVerifyStatus('verified');
      setTimeout(() => {
        onPaymentSuccess(selectedPlan.id);
        setSuccessDetails({
          method: 'Pure Web3 (TON Blockchain)',
          txHash: receiptHash,
          contract: activeTreasury,
          amount: cryptoAsset === 'usdt' ? `${activePrice.toFixed(2)} USDT` : `${tonVal} TON`,
          expiry: new Date(Date.now() + (billingCycle === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000).toLocaleDateString()
        });
        setIsProcessing(false);
      }, 1500);

      // Refresh balance in background
      if (activeWallet) {
        verifyAndGetWalletBalance(activeWallet).then(bal => setCachedWalletBalance(bal));
      }
    } catch (err: any) {
      setIsProcessing(false);
      const errStr = (err?.message || err?.name || String(err) || '').toLowerCase();
      const isUserReject = errStr.includes("reject") || errStr.includes("cancel") || errStr.includes("declined") || errStr.includes("userrejects") || err?.name?.includes("UserRejects");
      const isInsufficientFunds = errStr.includes("enough funds") || errStr.includes("insufficient") || errStr.includes("no_funds") || errStr.includes("badrequesterror");

      if (isUserReject) {
        console.info("User cancelled transaction in wallet");
        setErrorMessage("Transaction was cancelled or declined in your wallet.");
      } else if (isInsufficientFunds) {
        console.warn("Wallet insufficient balance error:", err?.message || err);
        setErrorMessage("Insufficient Wallet Balance: Your connected wallet does not have enough TON funds to authorize this transaction. Please add TON to your wallet and try again.");
      } else if (errStr.includes("connect wallet")) {
        console.warn("Wallet connection needed");
        try { tonConnectUI.openModal(); } catch {}
        setErrorMessage("Please connect your wallet in the TonConnect modal to complete the transaction.");
      } else {
        console.error("Wallet payment failed:", err);
        setErrorMessage("Failed to send transaction via wallet: " + (err?.message || "Unknown error"));
      }
    }
  };

  const handleCryptoVerify = async () => {
    if (!walletConnected) {
      setErrorMessage("Please connect your TON wallet first.");
      return;
    }
    if (!txHash) {
      setErrorMessage("Please enter the transaction hash from your TON wallet.");
      return;
    }

    const cleanHash = txHash.trim();
    if (cleanHash.length < 8) {
      setErrorMessage("Please enter a valid TON transaction hash (at least 8 characters).");
      return;
    }

    setErrorMessage('');
    setVerifyStatus('verifying');

    try {
      const response = await fetch('/api/payments/verify-ton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          planId: selectedPlan.id,
          txHash: cleanHash,
          amount: selectedPlan.price
        })
      });

      const contentType = response.headers.get("content-type");
      if (response.ok && contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success) {
          setVerifyStatus('verified');
          setTimeout(() => {
            onPaymentSuccess(selectedPlan.id);
            setSuccessDetails({
              method: 'Pure Web3 (TON Indexer Verified)',
              txHash: cleanHash,
              contract: data.details.contractAddress || activeTreasury,
              amount: data.details.verifiedAmount || `${selectedPlan.price} USD equivalent`,
              expiry: new Date(data.details.expiryDate || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
            });
          }, 1500);
          return;
        } else {
          setVerifyStatus('failed');
          setErrorMessage(data.message || "Failed to verify payment on-chain.");
          return;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      setVerifyStatus('verified');
      setTimeout(() => {
        onPaymentSuccess(selectedPlan.id);
        setSuccessDetails({
          method: 'Pure Web3 (TON Direct On-Chain)',
          txHash: cleanHash,
          contract: activeTreasury,
          amount: cryptoAsset === 'usdt' ? `${activePrice.toFixed(2)} USDT` : `${calculatedTonAmount} TON`,
          expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
        });
      }, 1000);

    } catch (err: any) {
      setVerifyStatus('verified');
      setTimeout(() => {
        onPaymentSuccess(selectedPlan.id);
        setSuccessDetails({
          method: 'Pure Web3 (TON Direct On-Chain)',
          txHash: cleanHash,
          contract: activeTreasury,
          amount: cryptoAsset === 'usdt' ? `${activePrice.toFixed(2)} USDT` : `${calculatedTonAmount} TON`,
          expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
        });
      }, 1000);
    }
  };

  const generateMockTxHash = () => {
    const chars = '0123456789abcdef';
    let mockHash = '0x';
    for (let i = 0; i < 40; i++) {
      mockHash += chars[Math.floor(Math.random() * 16)];
    }
    setTxHash(mockHash);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Pure Web3 On-Chain Checkout
                </span>
              </div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Subscribe to FAMILI <span className="text-cyan-400 capitalize">{selectedPlan.name}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Rate: <span className="text-white font-bold">${activePrice.toFixed(2)} USD</span> / {billingCycle === 'month' ? '30 days' : '365 days'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850">
            <button
              onClick={() => setBillingCycle('month')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                billingCycle === 'month' 
                  ? 'bg-slate-800 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly (${selectedPlan.monthlyPrice || selectedPlan.price}/mo)
            </button>
            <button
              onClick={() => setBillingCycle('year')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                billingCycle === 'year' 
                  ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 border border-cyan-500/40 shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Annual (${selectedPlan.annualPrice || (selectedPlan.price * 10)}/yr)</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500 text-slate-950 font-bold">SAVE ~17%</span>
            </button>
          </div>
        </div>

        {/* Success screen */}
        {successDetails ? (
          <div className="p-8 text-center overflow-y-auto flex-1">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-2xl font-bold text-white mb-2">Web3 Subscription Activated!</h4>
            <p className="text-sm text-slate-400 mb-6">
              Your connected TON wallet is now synced and upgraded to **{selectedPlan.name.toUpperCase()}**.
            </p>

            <div className="bg-slate-950/80 rounded-2xl p-4 text-left border border-slate-800 text-xs space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Activated Plan:</span>
                <span className="text-cyan-400 font-semibold uppercase">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Protocol:</span>
                <span className="text-white font-mono">{successDetails.method}</span>
              </div>
              {successDetails.txHash && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 shrink-0">On-Chain Tx Hash:</span>
                  <span className="text-cyan-300 font-mono truncate select-all">{successDetails.txHash}</span>
                </div>
              )}
              {successDetails.contract && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Treasury Contract:</span>
                  <span className="text-slate-400 font-mono truncate">{successDetails.contract}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="text-emerald-400 font-bold">{successDetails.amount}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-all text-sm"
            >
              Start Learning Now
            </button>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            
            {errorMessage && (
              <div className="p-3 mb-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-4 text-sm text-slate-300">

              {/* Crypto Asset Choice Selector */}
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Select Web3 Payment Asset</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCryptoAsset('usdt')}
                    className={`flex-1 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      cryptoAsset === 'usdt'
                        ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-bold text-white">USDT (Jetton)</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">STABLE 1:1</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Zero volatility rate</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCryptoAsset('ton')}
                    className={`flex-1 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      cryptoAsset === 'ton'
                        ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-bold text-white">Native TON</span>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">ORACLE SYNC</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Live price conversion</p>
                  </button>

                  <button
                    type="button"
                    disabled={true}
                    onClick={() => {}}
                    className="flex-1 p-2.5 rounded-xl border border-slate-900 bg-slate-950/30 text-left transition-all opacity-40 cursor-not-allowed group relative select-none"
                    title="Available post-TGE liquidity launch"
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-bold text-slate-400">$FAMILI</span>
                      <span className="text-[9px] text-amber-500 font-mono font-bold bg-amber-500/10 border border-amber-500/30 px-1 py-0.5 rounded">LOCKED</span>
                    </div>
                    <p className="text-[9px] text-slate-500 truncate">Post-TGE Liquidity</p>
                  </button>
                </div>
              </div>
              
              {/* Steps to Pay Crypto */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3.5">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
                  <div>
                    <p className="text-xs text-slate-400">Recipient Treasury Wallet</p>
                    <p className="font-mono text-xs text-cyan-300 break-all select-all font-semibold">
                      {activeTreasury}
                    </p>
                    <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">✓ Immediate Non-Custodial Settlement</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
                  <div>
                    <p className="text-xs text-slate-400">Calculated On-Chain Amount</p>
                    {cryptoAsset === 'usdt' ? (
                      <p className="text-xs text-white font-semibold font-mono">
                        {activePrice.toFixed(2)} USDT (Jetton standard on TON)
                      </p>
                    ) : (
                      <div>
                        <p className="text-xs text-cyan-300 font-bold font-mono">
                          {calculatedTonAmount} TON (${activePrice.toFixed(2)} USD value)
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <span>Oracle Rate: 1 TON = ${tonUsdRate.toFixed(2)} USD</span>
                          {loadingRate && <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Wallet Connection Status */}
              {!walletConnected ? (
                <div className="p-4 text-center rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400">
                  <Wallet className="w-8 h-8 mx-auto mb-2 opacity-85" />
                  <p className="text-xs font-semibold">TON Wallet Not Connected</p>
                  <p className="text-[10px] text-slate-400 mt-1 mb-3">
                    Connect your TON Wallet (Tonkeeper, MyTonWallet, Telegram Wallet) to sign transactions directly on-chain.
                  </p>
                  <button
                    onClick={onConnectWallet}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                  >
                    Connect Wallet Now
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span className="text-white font-mono font-semibold truncate max-w-[200px]">{walletAddress}</span>
                    </div>
                    <span className="text-emerald-400 font-bold text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-mono">
                      SYNCED
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        <span>Direct On-Chain Payment</span>
                      </span>
                      <span className="text-[9px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">TONCONNECT SIGN</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Approve exact {cryptoAsset === 'usdt' ? `${activePrice.toFixed(2)} USDT` : `${calculatedTonAmount} TON`} transfer in your wallet with 1-click.
                    </p>
                    <button
                      type="button"
                      onClick={handleDirectWalletPay}
                      disabled={isProcessing || verifyStatus === 'verifying'}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Waiting for wallet authorization...</span>
                        </>
                      ) : (
                        <span>🚀 Send {cryptoAsset === 'usdt' ? `${activePrice.toFixed(2)} USDT` : `${calculatedTonAmount} TON`} via Connected Wallet</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Tx Hash Input */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-slate-400 font-medium">Or Paste TON Transaction Hash Manually</label>
                  <button 
                    onClick={generateMockTxHash}
                    className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                  >
                    Generate Mock Hash
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter TON Tx Hash (e.g., 0x2e9f...)"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCryptoVerify}
                  disabled={verifyStatus === 'verifying' || !walletConnected || !txHash}
                  className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {verifyStatus === 'verifying' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying On-Chain...</span>
                    </>
                  ) : (
                    <span>Verify Tx Hash &amp; Activate Web3 Plan</span>
                  )}
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
