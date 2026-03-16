import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toCents(amount: number | string): number {
  if (typeof amount === 'string') {
    amount = parseFloat(amount) || 0;
  }
  return Math.round(amount * 100);
}


export function formatCurrency(amountInCents: number, currency = 'DOP') {
  if (typeof amountInCents !== 'number') {
    amountInCents = 0;
  }
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | undefined | null) {
    if(!dateString) return 'N/A';
    // Add time component to avoid timezone issues
    try {
        const date = new Date(`${dateString}T00:00:00`);
        return date.toLocaleDateString('es-DO',{year:'numeric', month:'long', day:'numeric'});
    } catch(e) {
        return 'Fecha inválida';
    }
}
