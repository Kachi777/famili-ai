import { Address } from '@ton/core';

export interface UserProfile {
  id: string;
  name: string;
  role: 'Parent' | 'Student' | 'Child' | 'Professional';
  avatarUrl: string;
}

export interface Habit {
  id: string;
  name: string;
  frequency: string;
  streak: number;
  completedToday: boolean;
}

export interface Goal {
  id: string;
  title: string;
  category: 'Learning' | 'Mindset' | 'Focus' | 'Health';
  targetDate: string;
  progress: number; // 0 to 100
}

export interface StudyMaterial {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'image' | 'text';
  size: string;
  uploadedAt: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface SubscriptionPlan {
  id: 'free' | 'premium' | 'pro' | 'family';
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  price: number;
  period: 'month' | 'year';
  features: string[];
}

export interface PaymentTransaction {
  id: string;
  method: 'card' | 'crypto';
  amount: number;
  planId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  txHash?: string;
  timestamp: string;
}

export interface AirdropTask {
  id: string;
  title: string;
  rewardPoints: number;
  completed: boolean;
  type: 'wallet' | 'lesson' | 'quiz' | 'habit' | 'invite';
}

export interface PresaleTransaction {
  id: string;
  type: 'TON_DEPOSIT' | 'SUBSCRIPTION_BONUS' | 'AIRDROP_REWARD' | 'USDT_DEPOSIT';
  amountTonOrUsd: number;
  tokensEarned: number;
  txHash: string;
  timestamp: string;
  walletAddress: string;
  network?: 'mainnet' | 'testnet';
}

export const DEFAULT_TREASURY_WALLET = "0QAg88Eqg02AYdYJyCZ7urdN_lblgOKmdOHxoxfdxu0znZXq";

export function getTreasuryWallet(): string {
  try {
    return localStorage.getItem('famili_custom_treasury_wallet') || DEFAULT_TREASURY_WALLET;
  } catch {
    return DEFAULT_TREASURY_WALLET;
  }
}

export function setTreasuryWallet(address: string): void {
  try {
    if (!address || address.trim() === '') {
      localStorage.removeItem('famili_custom_treasury_wallet');
    } else {
      localStorage.setItem('famili_custom_treasury_wallet', address.trim());
    }
  } catch {}
}

export const TREASURY_ADMIN_WALLET = DEFAULT_TREASURY_WALLET;

export interface WaitlistRecord {
  id: string;
  email: string;
  timestamp: string;
  status: 'VIP Testnet Access' | 'Early Airdrop Miner' | 'Genesis Pioneer' | 'Ambassador';
  wallet?: string;
  country?: string;
}

export function getWaitlistRecords(): WaitlistRecord[] {
  try {
    const stored = localStorage.getItem('famili_waitlist_records');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  // Default seeded VIPs
  return [
    { id: 'wl-101', email: 'jokach522@gmail.com', timestamp: '2026-07-28 07:12 AM', status: 'Genesis Pioneer', country: 'Nigeria 🇳🇬', wallet: '0QAg88Eqg02A...nZXq' },
    { id: 'wl-102', email: 'chinedu.o@familynexus.com', timestamp: '2026-07-27 14:30 PM', status: 'VIP Testnet Access', country: 'Nigeria 🇳🇬' },
    { id: 'wl-103', email: 'alex.v@tonfoundation.org', timestamp: '2026-07-27 11:15 AM', status: 'Early Airdrop Miner', country: 'United Kingdom 🇬🇧', wallet: 'EQD4FPq-PR...z8L9' },
    { id: 'wl-104', email: 'samantha.williams@techvc.io', timestamp: '2026-07-26 19:45 PM', status: 'Genesis Pioneer', country: 'United States 🇺🇸' },
    { id: 'wl-105', email: 'kwame.asante@accrafintech.gh', timestamp: '2026-07-26 09:20 AM', status: 'Ambassador', country: 'Ghana 🇬🇭' },
    { id: 'wl-106', email: 'emeka.nwachukwu@lagosdev.ng', timestamp: '2026-07-25 16:10 PM', status: 'VIP Testnet Access', country: 'Nigeria 🇳🇬' }
  ];
}

export function saveWaitlistRecord(email: string, walletAddress?: string): WaitlistRecord[] {
  const current = getWaitlistRecords();
  if (current.some(r => r.email.toLowerCase() === email.toLowerCase())) {
    return current;
  }
  const newRecord: WaitlistRecord = {
    id: `wl-${Date.now().toString(36)}`,
    email,
    timestamp: new Date().toLocaleString(),
    status: 'VIP Testnet Access',
    wallet: walletAddress && walletAddress !== '' ? walletAddress : undefined,
    country: 'Global / Web3 🌐'
  };
  const updated = [newRecord, ...current];
  try {
    localStorage.setItem('famili_waitlist_records', JSON.stringify(updated));
  } catch {}
  return updated;
}

export function formatTonAddress(rawOrUserFriendly: string, bounceable: boolean = false): string {
  if (!rawOrUserFriendly || typeof rawOrUserFriendly !== 'string') return '';
  const trimmed = rawOrUserFriendly.trim();
  try {
    const parsed = Address.parse(trimmed);
    return parsed.toString({ bounceable, urlSafe: true });
  } catch (e) {
    console.warn("[TON Address Format] Failed to parse address with @ton/core:", rawOrUserFriendly, e);
    return trimmed;
  }
}

export async function verifyAndGetWalletBalance(address: string): Promise<number | null> {
  if (!address || address.trim() === '') return null;

  const rawAddress = address.trim();
  const userFriendlyNonBounceable = formatTonAddress(rawAddress, false); // UQ... format
  const userFriendlyBounceable = formatTonAddress(rawAddress, true); // EQ... format

  const targetAddresses = Array.from(new Set([userFriendlyNonBounceable, userFriendlyBounceable, rawAddress])).filter(Boolean);

  // 1. Try Tonhub V4 API (Fastest public mainnet API)
  for (const addr of targetAddresses) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://mainnet-v4.tonhubapi.com/account/${encodeURIComponent(addr)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.status === 404) return 0; // Uninitialized wallet balance is 0
      if (res.ok) {
        const data = await res.json();
        const coinsStr = data?.account?.state?.balance?.coins ?? data?.account?.last?.coins;
        if (coinsStr !== undefined && coinsStr !== null) {
          const nano = Number(coinsStr);
          return isNaN(nano) ? 0 : nano / 1000000000;
        }
      }
    } catch (e) {
      console.warn("[verifyAndGetWalletBalance] Tonhub V4 balance fetch failed for address:", addr, e);
    }
  }

  // 2. Try Toncenter API V2 GET
  for (const addr of targetAddresses) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://toncenter.com/api/v2/getAddressInformation?address=${encodeURIComponent(addr)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.status === 404) return 0;
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data?.result?.balance !== undefined) {
          const nano = Number(data.result.balance);
          return isNaN(nano) ? 0 : nano / 1000000000;
        }
      }
    } catch (e) {
      console.warn("[verifyAndGetWalletBalance] Toncenter balance fetch failed for address:", addr, e);
    }
  }

  // 3. Try Toncenter V2 JSON-RPC POST
  for (const addr of targetAddresses) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://toncenter.com/api/v2/jsonRPC`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAddressBalance',
          params: { address: addr }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data?.result !== undefined) {
          const nano = Number(data.result);
          return isNaN(nano) ? 0 : nano / 1000000000;
        }
      }
    } catch (e) {
      console.warn("[verifyAndGetWalletBalance] Toncenter jsonRPC balance fetch failed for address:", addr, e);
    }
  }

  // 4. Try TonAPI V2
  for (const addr of targetAddresses) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://tonapi.io/v2/accounts/${encodeURIComponent(addr)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.status === 404) return 0;
      if (res.ok) {
        const data = await res.json();
        if (data?.balance !== undefined) {
          const nano = Number(data.balance);
          return isNaN(nano) ? 0 : nano / 1000000000;
        }
      }
    } catch (e) {
      console.warn("[verifyAndGetWalletBalance] TonAPI balance fetch failed for address:", addr, e);
    }
  }

  return null;
}


