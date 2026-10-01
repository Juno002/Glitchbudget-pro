'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAchievements } from '@/hooks/use-achievements';
import { getAchievementDef, TIER_COLORS, type AchievementDef } from '@/lib/achievements';
import { playAchievementUnlock } from '@/lib/sounds';
import { triggerConfetti } from '@/lib/confetti';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { MOTION_SECONDS } from '@/lib/motion';

// --- Achievement Toast (unlocked pop-up, rendered globally) ---
function AchievementToast({
  achievement,
  onDismiss,
}: {
  achievement: AchievementDef;
  onDismiss: () => void;
}) {
  const tier = TIER_COLORS[achievement.tier];
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const initial = reducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 14, scale: 0.985 };
  const exit = reducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 8, scale: 0.99 };

  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={exit}
      transition={reducedMotion
        ? { duration: 0 }
        : { duration: MOTION_SECONDS.dialog, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-achievement-toast="true"
      data-achievement-tier={achievement.tier}
      className="pointer-events-auto w-full min-w-0 max-w-[26rem]"
    >
      <div
        data-achievement-toast-surface="true"
        className="relative max-h-[calc(100dvh-11rem)] overflow-y-auto rounded-[var(--radius-modal)] border border-[var(--border-strong)] bg-[hsl(var(--surface-elevated))] p-4 pr-12 text-popover-foreground shadow-[var(--shadow-modal)] sm:max-h-[calc(100dvh-3rem)] sm:p-5 sm:pr-14"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: tier.text }}
        />

        <div className="flex items-start gap-3 pl-1">
          <div
            data-achievement-toast-icon="true"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-interactive)] border text-2xl"
            style={{
              backgroundColor: tier.bg,
              borderColor: tier.border,
            }}
            aria-hidden="true"
          >
            {achievement.icon}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Logro desbloqueado
            </p>
            <p className="mt-1 break-words font-display text-lg font-normal leading-tight tracking-[-0.025em] text-foreground">
              {achievement.title}
            </p>
            <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
              {achievement.description}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span
                className="inline-flex min-h-8 items-center rounded-full border px-2.5 text-xs font-bold tabular-nums text-foreground"
                style={{
                  backgroundColor: tier.bg,
                  borderColor: tier.border,
                }}
              >
                +{achievement.xp} XP
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                data-achievement-toast-action="dismiss"
                className="h-8 px-2.5 text-xs"
              >
                Listo
              </Button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso de logro"
          data-achievement-toast-close="true"
          className="absolute right-1.5 top-1.5 inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-interactive)] text-muted-foreground transition-colors duration-[var(--motion-control)] hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}

// --- XP Bar ---
function XPBar({
  currentXP,
  nextXP,
  level,
  title,
}: {
  currentXP: number;
  nextXP: number;
  level: number;
  title: string;
}) {
  const pct = Math.min(100, Math.round((currentXP / Math.max(1, nextXP)) * 100));

  return (
    <div className="flex items-center gap-3">
      <div
        className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--secondary) / 0.10))',
          border: '1px solid hsl(var(--primary) / 0.25)',
          color: 'hsl(var(--primary))',
          boxShadow: '0 0 16px hsl(var(--primary) / 0.08)',
        }}
      >
        {level}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs font-semibold text-foreground">{title}</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {currentXP}/{nextXP} XP
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

// --- Badge Card with Popover ---
function BadgeCard({ def, isUnlocked }: { def: AchievementDef; isUnlocked: boolean }) {
  const tier = TIER_COLORS[def.tier];
  const tierName = { bronze: 'Bronce', silver: 'Plata', gold: 'Oro', diamond: 'Diamante' }[def.tier];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.button
          type="button"
          whileHover={isUnlocked ? { scale: 1.05, y: -2 } : {}}
          className="relative flex w-full flex-col items-center gap-1 rounded-[var(--radius-interactive)] border p-2.5 text-center transition-all duration-[var(--motion-control)] focus:outline-none"
          style={{
            background: isUnlocked ? tier.bg : 'rgba(255,255,255,0.02)',
            borderColor: isUnlocked ? tier.border : 'rgba(255,255,255,0.04)',
            boxShadow: isUnlocked ? `0 4px 20px ${tier.glow}` : 'none',
            opacity: isUnlocked ? 1 : 0.35,
            filter: isUnlocked ? 'none' : 'grayscale(1)',
          }}
        >
          <span className="text-2xl" role="img" aria-label={def.title}>
            {isUnlocked ? def.icon : '🔒'}
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground leading-tight line-clamp-1">
            {def.title}
          </span>
          {isUnlocked && (
            <span className="text-[9px] font-bold" style={{ color: tier.text }}>
              +{def.xp} XP
            </span>
          )}
        </motion.button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-56 space-y-1.5 p-3 pr-12"
        showCloseButton
        closeLabel={'Cerrar detalles de '+def.title}
        data-achievement-popover={def.id}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{def.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{def.title}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tier.text }}>
              {tierName} · {def.xp} XP
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{def.description}</p>
        {isUnlocked ? (
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-semibold text-emerald-400">Desbloqueado</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-border" />
            <span className="text-[10px] font-semibold text-muted-foreground">Bloqueado</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// --- Dialog Content (rendered inside the Dialog in header.tsx) ---
export function AchievementsDialogContent() {
  const { unlocked, levelInfo, totalXP, allAchievements } = useAchievements();

  const unlockedCount = unlocked.length;
  const totalCount = allAchievements.length;

  const tiers: AchievementDef['tier'][] = ['bronze', 'silver', 'gold', 'diamond'];
  const tierLabels: Record<string, string> = {
    bronze: '🥉 Bronce',
    silver: '🥈 Plata',
    gold: '🥇 Oro',
    diamond: '💠 Diamante',
  };

  return (
    <div className="space-y-4" data-achievements-prisma="true">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Progreso</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {unlockedCount}/{totalCount} desbloqueados
        </span>
      </div>

      {/* XP / Level */}
      <XPBar
        currentXP={totalXP}
        nextXP={levelInfo.nextXP}
        level={levelInfo.level}
        title={levelInfo.title}
      />

      {/* Streak indicator */}
      {unlocked.some((u) => u.id === 'saver_streak_3') && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <span className="text-sm">🔥</span>
          <span className="text-xs font-semibold text-orange-400">Racha activa</span>
        </div>
      )}

      {/* Tier Rows */}
      {tiers.map((tier) => {
        const tierAchievements = allAchievements.filter((a) => a.tier === tier);
        if (tierAchievements.length === 0) return null;
        return (
          <div key={tier}>
            <div className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              {tierLabels[tier]}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {tierAchievements.map((def) => (
                <BadgeCard
                  key={def.id}
                  def={def}
                  isUnlocked={unlocked.some((u) => u.id === def.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Global Toast Layer (mount once at layout level or header) ---
export function AchievementToastLayer() {
  const { newlyUnlocked, dismissNew } = useAchievements();
  const playedRef = useRef(new Set<string>());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const currentId = newlyUnlocked[0];
  const dismissCurrent = useCallback(() => { if (currentId) dismissNew(currentId); }, [currentId, dismissNew]);

  useEffect(() => {
    newlyUnlocked.forEach((id) => {
      if (!playedRef.current.has(id)) {
        playedRef.current.add(id);
        playAchievementUnlock();
        const def = getAchievementDef(id);
        if (def && (def.tier === 'gold' || def.tier === 'diamond')) {
          triggerConfetti();
        }
      }
    });
  }, [newlyUnlocked]);

  if (!mounted) return null;
  // Keep viewport positioning separate from Framer Motion transforms.
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(10rem+env(safe-area-inset-bottom))] z-[100] flex justify-center px-3 sm:bottom-6 sm:px-6">
    <AnimatePresence initial={false} mode="wait">
      {newlyUnlocked.length > 0 &&
        (() => {
          const def = getAchievementDef(newlyUnlocked[0]);
          return def ? (
            <AchievementToast
              key={def.id}
              achievement={def}
              onDismiss={dismissCurrent}
            />
          ) : null;
        })()}
    </AnimatePresence>
    </div>,
    document.body
  );
}

// --- Header Badge (compact level indicator for the button) ---
export function AchievementHeaderBadge() {
  const { levelInfo, unlocked, allAchievements } = useAchievements();
  const pct = Math.round((unlocked.length / Math.max(1, allAchievements.length)) * 100);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">🏆</span>
      <span className="text-[10px] font-bold tabular-nums" style={{ color: 'hsl(var(--primary))' }}>
        {levelInfo.level}
      </span>
    </div>
  );
}
