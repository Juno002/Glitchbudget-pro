import type { Category } from '@/lib/types';
import { 
  ShoppingCart, Utensils, Bus, Bolt, Home, Briefcase, Gift, HeartPulse, 
  PiggyBank, CircleDollarSign, Landmark, Shirt, Gamepad, GraduationCap, 
  Coins, Car, Coffee, Music, Plane, Camera, Monitor, Smartphone, 
  Baby, Dog, Dumbbell, Wine, Pizza, Scissors, Key, Shield, HardHat,
  Tv, Waves, Map, Luggage, Wallet, Receipt
} from 'lucide-react';

export const ICON_MAP: { [key: string]: any } = {
  'home': Home,
  'bus': Bus,
  'utensils': Utensils,
  'bolt': Bolt,
  'heart-pulse': HeartPulse,
  'gamepad': Gamepad,
  'shirt': Shirt,
  'graduation-cap': GraduationCap,
  'gift': Gift,
  'briefcase': Briefcase,
  'piggy-bank': PiggyBank,
  'circle-dollar-sign': CircleDollarSign,
  'landmark': Landmark,
  'coins': Coins,
  'shopping-cart': ShoppingCart,
  'car': Car,
  'coffee': Coffee,
  'music': Music,
  'plane': Plane,
  'camera': Camera,
  'monitor': Monitor,
  'smartphone': Smartphone,
  'baby': Baby,
  'dog': Dog,
  'dumbbell': Dumbbell,
  'wine': Wine,
  'pizza': Pizza,
  'scissors': Scissors,
  'key': Key,
  'shield': Shield,
  'hard-hat': HardHat,
  'tv': Tv,
  'waves': Waves,
  'map': Map,
  'luggage': Luggage,
  'wallet': Wallet,
  'receipt': Receipt
};

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

export const getCategoryInfo = (idOrName: string | undefined, customIcons?: { [catId: string]: string }): Category | undefined => {
    if (!idOrName) return defaultCategories.find(c => c.id === 'otros');
    
    // First, try to find by ID
    const foundById = defaultCategories.find(c => c.id === idOrName);
    if (foundById) return foundById;

    // Fallback for string-based category names
    const foundByName = defaultCategories.find(c => c.name.toLowerCase() === idOrName.toLowerCase());
    if (foundByName) return foundByName;
    
    // Spanish mapping
    const mapping: {[key: string]: string} = {
        'base': 'sueldo',
        'ingreso adicional': 'freelance',
        'regalo/otro': 'regalos-ingresos',
        'regalos': 'regalos-gastos',
        'regalo': 'regalos-ingresos'
    }
    const mappedId = mapping[idOrName.toLowerCase()];
    if(mappedId) {
        return defaultCategories.find(c => c.id === mappedId);
    }
    
    // Custom category resolution
    const customIconName = customIcons?.[idOrName];
    const CustomIcon = customIconName ? ICON_MAP[customIconName] : Landmark;

    if (!foundById && !foundByName) {
        return {
            id: idOrName,
            name: idOrName.charAt(0).toUpperCase() + idOrName.slice(1).replace(/-/g, ' '),
            icon: CustomIcon || Landmark,
            type: 'expense'
        };
    }
    
    return defaultCategories.find(c => c.id === 'otros');
}
