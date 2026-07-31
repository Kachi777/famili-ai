import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Loader2, CheckCircle2, Globe, ArrowRight } from 'lucide-react';

interface FlutterwaveButtonProps {
  amountUsd: number;
  planName: string;
  planId: string;
  userEmail?: string;
  userName?: string;
  onSuccess: (paymentDetails: any) => void;
  onError: (error: string) => void;
}

export default function FlutterwaveButton({
  amountUsd,
  planName,
  planId,
  userEmail = '',
  userName = '',
  onSuccess,
  onError
}: FlutterwaveButtonProps) {
  const [email, setEmail] = useState(userEmail || '');
  const [name, setName] = useState(userName || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentOption, setPaymentOption] = useState<'card' | 'bank_transfer' | 'ussd'>('card');
  const [isProcessing, setIsProcessing] = useState(false);

  // Live conversion rate estimate: 1 USD = ~1,520 NGN (Naira)
  const ngnRate = 1520;
  const amountNgn = Math.round(amountUsd * ngnRate);

  const handleFlutterwaveCheckout = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !name) {
      onError('Please enter your email and full name for Flutterwave receipt issuing.');
      return;
    }

    setIsProcessing(true);

    // Simulate Flutterwave Inline Modal transaction completion
    setTimeout(() => {
      setIsProcessing(false);
      const flwTransaction = {
        status: 'successful',
        transaction_id: 'FLW-TX-' + Math.floor(Math.random() * 899999 + 100000),
        tx_ref: 'FAMILI-SUB-' + Date.now(),
        flw_ref: 'FLW/' + Math.floor(Math.random() * 1000000),
        amount_usd: amountUsd,
        amount_ngn: amountNgn,
        currency: 'NGN',
        plan_id: planId,
        customer: {
          email,
          name,
          phone_number: phoneNumber
        }
      };

      onSuccess(flwTransaction);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      {/* Flutterwave Badge & Information */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/20 text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="font-extrabold text-amber-400 flex items-center gap-1.5 text-xs">
            <Globe className="w-4 h-4 text-orange-400" />
            Flutterwave Gateway (Nigeria, Ghana, Kenya &amp; Worldwide)
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold">
            NGN / USD
          </span>
        </div>
        <p className="text-slate-300 text-[11px] leading-relaxed">
          Pay seamlessly using Nigerian Cards, Direct Bank Transfer, USSD (*737#, *894#), or Mobile Money.
        </p>
      </div>

      {/* Payment Channel Options */}
      <div className="grid grid-cols-3 gap-2 text-xs font-medium">
        <button
          type="button"
          onClick={() => setPaymentOption('card')}
          className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
            paymentOption === 'card'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          💳 Card (V/MC/Verve)
        </button>
        <button
          type="button"
          onClick={() => setPaymentOption('bank_transfer')}
          className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
            paymentOption === 'bank_transfer'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          🏦 Bank Transfer
        </button>
        <button
          type="button"
          onClick={() => setPaymentOption('ussd')}
          className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
            paymentOption === 'ussd'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          📱 USSD (*737#)
        </button>
      </div>

      <form onSubmit={handleFlutterwaveCheckout} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Chidi Okafor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="chidi@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Phone Number (Optional for USSD/SMS receipt)</label>
          <input
            type="tel"
            placeholder="+234 801 234 5678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Currency summary card */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
          <div>
            <p className="text-slate-400 text-[10px]">Total Amount (USD)</p>
            <p className="text-white font-bold text-sm">${amountUsd.toFixed(2)} USD</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-[10px]">Estimated Local NGN Equivalent</p>
            <p className="text-amber-400 font-bold text-sm">₦{amountNgn.toLocaleString()} NGN</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Connecting to Flutterwave Inline...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>Pay ₦{amountNgn.toLocaleString()} NGN via Flutterwave</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-slate-500">
          Protected by Flutterwave PCI-DSS Level 1 Security Certification.
        </p>
      </form>
    </div>
  );
}
