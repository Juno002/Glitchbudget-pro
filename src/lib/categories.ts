import type { Category } from '@/lib/types';
import { ShoppingCart, Utensils, Bus, Bolt, Home, Briefcase, Gift, HeartPulse, PiggyBank, CircleDollarSign, Landmark, Shirt, Gamepad, GraduationCap, Coins } from 'lucide-react';

export const defaultCategories: Category[] = [
  // Expenses
  { id: 'vivienda', name: 'Vivienda', icon: Home, type: 'expense' },
  { id: 'transporte', name: 'Transporte', icon: Bus, type: 'expense' },
  { id: 'alimentacion', name: 'Alimentación', icon: Utensils, type: 'expense' },
  { id: 'servicios', name: 'Servicios', icon: Bolt, type: 'expense' },
  { id: 'salud', name: 'Salud', icon: HeartPulse, type: 'expense' },
  { id: 'entretenimiento', name: 'Entretenimiento', icon: Gamepad, type: 'expense' },
  { id: 'ropa', name: 'Ropa', icon: Shirt, type: 'expense' },
  { id: 'educacion', name: 'Educación', icon: GraduationCap, type: 'expense' },
  { id: 'regalos-gastos', name: 'Regalos', icon: Gift, type: 'expense' },
  { id: 'ahorro', name: 'Ahorro para Metas', icon: Coins, type: 'expense' },

  // Incomes
  { id: 'sueldo', name: 'Sueldo', icon: CircleDollarSign, type: 'income' },
  { id: 'freelance', name: 'Freelance', icon: Briefcase, type: 'income' },
  { id: 'intereses', name: 'Intereses', icon: PiggyBank, type: 'income' },
  { id: 'regalos-ingresos', name: 'Regalos', icon: Gift, type: 'income' },
  
  // Both
  { id: 'otros', name: 'Otros', icon: Landmark, type: 'both' },
];

export const defaultExpenseCategories = ['vivienda','transporte','alimentacion','servicios','salud','entretenimiento','ropa','educacion','regalos-gastos', 'ahorro','otros'];
export const defaultIncomeCategories = ['sueldo','freelance','intereses','regalos-ingresos','otros'];

export const getCategoryInfo = (idOrName: string | undefined): Category | undefined => {
    if (!idOrName) return defaultCategories.find(c => c.id === 'otros');
    
    // First, try to find by ID, which is the preferred method
    const foundById = defaultCategories.find(c => c.id === idOrName);
    if (foundById) return foundById;

    // Fallback for string-based category names (old system or user input)
    const foundByName = defaultCategories.find(c => c.name.toLowerCase() === idOrName.toLowerCase());
    if (foundByName) return foundByName;
    
    // If a direct match isn't found, try to map old spanish strings to new ids.
    const mapping: {[key: string]: string} = {
        'base': 'sueldo',
        'ingreso adicional': 'freelance',
        'regalo/otro': 'regalos-ingresos',
        'regalos': 'regalos-gastos', // Ambiguous, map to expense gift by default
        'regalo': 'regalos-ingresos'
    }
    const mappedId = mapping[idOrName.toLowerCase()];
    if(mappedId) {
        return defaultCategories.find(c => c.id === mappedId);
    }
    
    // If it's a user-created category, it won't be in the defaults. Create a temporary one.
    if (!foundById && !foundByName) {
        return {
            id: idOrName,
            name: idOrName.charAt(0).toUpperCase() + idOrName.slice(1).replace(/-/g, ' '),
            icon: Landmark, // Default icon for custom categories
            type: 'expense' // Assume expense for unknown categories
        };
    }
    
    // Final fallback to 'Otros' if no match is found
    return defaultCategories.find(c => c.id === 'otros');
}
