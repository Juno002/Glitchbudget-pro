// src/lib/achievements.ts
// Achievement definitions and evaluation logic for GlitchBudget Pro

export type AchievementId =
  | 'first_expense'
  | 'first_income'
  | 'first_goal'
  | 'goal_complete'
  | 'budget_master'
  | 'saver_streak_3'
  | 'saver_streak_7'
  | 'big_saver'
  | 'five_transactions'
  | 'twenty_transactions'
  | 'budget_under_control'
  | 'diversified_income'
  | 'zero_waste'
  | 'consistent_tracker';

export interface AchievementDef {
  id: AchievementId;
  title: string;
  description: string;
  icon: string; // Emoji icon
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  xp: number;
}

export interface UnlockedAchievement {
  id: AchievementId;
  unlockedAt: string; // ISO datetime
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- Bronze Tier (Getting Started) ---
  {
    id: 'first_expense',
    title: 'Primer Gasto',
    description: 'Registraste tu primer gasto.',
    icon: '🧾',
    tier: 'bronze',
    xp: 10,
  },
  {
    id: 'first_income',
    title: 'Primer Ingreso',
    description: 'Registraste tu primer ingreso extra.',
    icon: '💵',
    tier: 'bronze',
    xp: 10,
  },
  {
    id: 'first_goal',
    title: 'Soñador',
    description: 'Creaste tu primera meta de ahorro.',
    icon: '🎯',
    tier: 'bronze',
    xp: 15,
  },
  {
    id: 'five_transactions',
    title: 'En Marcha',
    description: 'Registraste 5 movimientos en total.',
    icon: '📝',
    tier: 'bronze',
    xp: 20,
  },

  // --- Silver Tier (Building Habits) ---
  {
    id: 'twenty_transactions',
    title: 'Hábito Formado',
    description: 'Registraste 20 movimientos en total.',
    icon: '📊',
    tier: 'silver',
    xp: 50,
  },
  {
    id: 'budget_under_control',
    title: 'Presupuesto Controlado',
    description: 'Todos tus presupuestos del mes están bajo el límite.',
    icon: '✅',
    tier: 'silver',
    xp: 40,
  },
  {
    id: 'diversified_income',
    title: 'Diversificado',
    description: 'Tienes ingresos en 3+ categorías diferentes.',
    icon: '🌐',
    tier: 'silver',
    xp: 35,
  },
  {
    id: 'saver_streak_3',
    title: 'Racha de 3',
    description: 'Aportaste a tus metas 3 veces consecutivas sin fallar.',
    icon: '🔥',
    tier: 'silver',
    xp: 45,
  },

  // --- Gold Tier (Mastery) ---
  {
    id: 'goal_complete',
    title: '¡Meta Cumplida!',
    description: 'Completaste una meta de ahorro al 100%.',
    icon: '🏆',
    tier: 'gold',
    xp: 100,
  },
  {
    id: 'budget_master',
    title: 'Maestro del Plan',
    description: 'Configuraste presupuestos en 5+ categorías.',
    icon: '🗂️',
    tier: 'gold',
    xp: 60,
  },
  {
    id: 'big_saver',
    title: 'Gran Ahorrador',
    description: 'Ahorraste más de RD$10,000 en total para tus metas.',
    icon: '💎',
    tier: 'gold',
    xp: 80,
  },
  {
    id: 'saver_streak_7',
    title: 'Racha Imparable',
    description: 'Aportaste a tus metas 7 veces consecutivas.',
    icon: '⚡',
    tier: 'gold',
    xp: 75,
  },

  // --- Diamond Tier (Elite) ---
  {
    id: 'zero_waste',
    title: 'Cero Desperdicio',
    description: 'Terminaste el mes con 0 presupuestos excedidos y ≤10% sobrante.',
    icon: '💠',
    tier: 'diamond',
    xp: 150,
  },
  {
    id: 'consistent_tracker',
    title: 'Consistencia Total',
    description: 'Registraste datos financieros en 3 meses consecutivos.',
    icon: '🌟',
    tier: 'diamond',
    xp: 200,
  },
];

const STORAGE_KEY = 'glitchbudget_achievements';
const STREAK_KEY = 'glitchbudget_contribution_streak';

// --- Persistence ---

export function loadUnlocked(): UnlockedAchievement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUnlocked(unlocked: UnlockedAchievement[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
}

export function getStreak(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

export function setStreak(val: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STREAK_KEY, String(val));
}

// --- Tier Utils ---

export const TIER_COLORS: Record<AchievementDef['tier'], { bg: string; border: string; glow: string; text: string }> = {
  bronze: {
    bg: 'rgba(205,127,50,0.10)',
    border: 'rgba(205,127,50,0.30)',
    glow: 'rgba(205,127,50,0.15)',
    text: '#cd7f32',
  },
  silver: {
    bg: 'rgba(192,192,192,0.10)',
    border: 'rgba(192,192,192,0.30)',
    glow: 'rgba(192,192,192,0.15)',
    text: '#c0c0c0',
  },
  gold: {
    bg: 'rgba(255,215,0,0.10)',
    border: 'rgba(255,215,0,0.30)',
    glow: 'rgba(255,215,0,0.15)',
    text: '#ffd700',
  },
  diamond: {
    bg: 'rgba(185,242,255,0.10)',
    border: 'rgba(185,242,255,0.35)',
    glow: 'rgba(185,242,255,0.20)',
    text: '#b9f2ff',
  },
};

export function getAchievementDef(id: AchievementId): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

export function getTotalXP(unlocked: UnlockedAchievement[]): number {
  return unlocked.reduce((sum, u) => {
    const def = getAchievementDef(u.id);
    return sum + (def?.xp ?? 0);
  }, 0);
}

export function getLevel(xp: number): { level: number; title: string; nextXP: number; currentXP: number } {
  const levels = [
    { xp: 0, title: 'Novato' },
    { xp: 30, title: 'Aprendiz' },
    { xp: 80, title: 'Planificador' },
    { xp: 150, title: 'Estratega' },
    { xp: 300, title: 'Financiero' },
    { xp: 500, title: 'Maestro' },
    { xp: 800, title: 'Leyenda' },
  ];

  let level = 0;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xp) {
      level = i;
      break;
    }
  }

  const nextLevel = levels[level + 1] || { xp: levels[level].xp + 500, title: '???' };

  return {
    level: level + 1,
    title: levels[level].title,
    nextXP: nextLevel.xp,
    currentXP: xp,
  };
}
