import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string | undefined) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

export function getStatusColor(status: string) {
  // Premium color palette mapping
  const statusMap: Record<string, string> = {
    // Semantic states
    'success': 'text-[#10b981] bg-[#ecfdf5] border-[#d1fae5] shadow-[#10b98120]',
    'warning': 'text-[#f59e0b] bg-[#fffbeb] border-[#fef3c7] shadow-[#f59e0b20]',
    'error': 'text-[#ef4444] bg-[#fef2f2] border-[#fee2e2] shadow-[#ef444420]',
    'info': 'text-[#6366f1] bg-[#f5f3ff] border-[#ede9fe] shadow-[#6366f120]',

    // Functional states (mapped to premium tokens)
    'Active': 'text-[#10b981] bg-[#ecfdf5] border-[#d1fae5]',
    'Leased': 'text-[#10b981] bg-[#ecfdf5] border-[#d1fae5]',
    'Paid': 'text-[#10b981] bg-[#ecfdf5] border-[#d1fae5]',
    'Completed': 'text-[#10b981] bg-[#ecfdf5] border-[#d1fae5]',

    'Pending': 'text-[#f59e0b] bg-[#fffbeb] border-[#fef3c7]',
    'Maintenance': 'text-[#f59e0b] bg-[#fffbeb] border-[#fef3c7]',
    'Scheduled': 'text-[#6366f1] bg-[#f5f3ff] border-[#ede9fe]',
    'Available': 'text-[#6366f1] bg-[#f5f3ff] border-[#ede9fe]',

    'Overdue': 'text-[#ef4444] bg-[#fef2f2] border-[#fee2e2]',
    'Terminated': 'text-[#ef4444] bg-[#fef2f2] border-[#fee2e2]',
    'Unassigned': 'text-[#ef4444] bg-[#fef2f2] border-[#fee2e2]',
    'Blocked': 'text-[#ef4444] bg-[#fef2f2] border-[#fee2e2]',
    'blocked': 'text-[#ef4444] bg-[#fef2f2] border-[#fee2e2]',

    // User account states
    'approved': 'text-[#10b981] bg-[#ecfdf5] border-[#d1fae5]',
    'pending': 'text-[#f59e0b] bg-[#fffbeb] border-[#fef3c7]',
    'Expired': 'text-[#64748b] bg-[#f8fafc] border-[#f1f5f9]',
    'submitted': 'text-[#6366f1] bg-[#f5f3ff] border-[#ede9fe]',
    'verified': 'text-[#10b981] bg-[#ecfdf5] border-[#d1fae5]',
    'disputed': 'text-[#ef4444] bg-[#fef2f2] border-[#fee2e2]',
  };

  return statusMap[status] || 'text-[#64748b] bg-[#f8fafc] border-[#f1f5f9]';
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
}

// Calculate time difference
export function getDaysDifference(dateStr: string | Date): number {
  const date = new Date(dateStr);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getRelativeDateLabel(dateStr: string | Date): string {
  const days = getDaysDifference(dateStr);

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';

  if (days > 0 && days < 7) return `In ${days} days`;
  if (days < 0 && days > -7) return `${Math.abs(days)} days ago`;

  return formatDate(dateStr);
}
