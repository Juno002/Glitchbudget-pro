import type { Cents } from "@/domain/money"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toCents(amount: number | string): Cents {
  if (typeof amount === 'string') {
    amount = parseFloat(amount) || 0;
  }
  return Math.round(amount * 100) as Cents;
}

export function formatCurrency(amountInCents: number, currency = 'DOP', locale = 'es-DO') {
  if (typeof amountInCents !== 'number') {
    amountInCents = 0;
  }
  const amount = amountInCents / 100;
  const code = typeof currency === 'string' && /^[A-Z]{3}$/.test(currency.trim().toUpperCase())
    ? currency.trim().toUpperCase()
    : 'DOP';
  const formatted = new Intl.NumberFormat(locale || 'es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  const prefix = code === 'DOP' ? 'RD$' : code;
  return prefix + ' ' + formatted;
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


export function currencyInputLabel(currency = 'DOP'): string {
  const code = typeof currency === 'string' && /^[A-Z]{3}$/.test(currency.trim().toUpperCase())
    ? currency.trim().toUpperCase()
    : 'DOP';
  return code === 'DOP' ? 'RD$' : code;
}
