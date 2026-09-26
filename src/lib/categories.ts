import { categorySeeds, appliesTo } from '../domain/categories';
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

export const defaultCategories: Category[] = categorySeeds.map(c => ({...c, icon:ICON_MAP[c.iconName] || Landmark}));
export const defaultExpenseCategories = categorySeeds.filter(c=>appliesTo(c,'expense')).map(c=>c.id);
export const defaultIncomeCategories = categorySeeds.filter(c=>appliesTo(c,'income')).map(c=>c.id);

export function resolveCategory(rows: import('../domain/models').Category[], id: string | undefined): Category | undefined {
 const row=rows.find(c=>c.id===id);if(!row)return undefined;
 return {...row,icon:ICON_MAP[row.iconName] || ICON_MAP[row.iconName.replace(/([a-z])([A-Z])/g,'$1-$2').toLowerCase()] || Landmark};
}
