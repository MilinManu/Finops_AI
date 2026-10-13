import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = '₹'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return `${currency}0`;
  
  // Format with localized grouping
  return `${currency}${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatUSD(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return num.toLocaleString();
}

export function formatPercent(pct: number): string {
  if (pct === undefined || pct === null || isNaN(pct)) return '0%';
  return `${Math.round(pct)}%`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}
