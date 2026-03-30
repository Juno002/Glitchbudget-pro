'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAchievements } from '@/hooks/use-achievements';
import { getAchievementDef, TIER_COLORS, type AchievementDef } from '@/lib/achievements';
import { playAchievementUnlock } from '@/lib/sounds';
import { triggerConfetti } from '@/lib/confetti';
import { Card, CardContent } from '@/components/ui/card';

// --- Achievement Toast (unlocked pop-up) ---
function AchievementToast({
  achievement,
  onDismiss,
}: {
  achievement: AchievementDef;
  onDismiss: () => void;
}) {
  const tier = TIER_COLORS[achievement.tier];
  
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.8, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(4px)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[999] max-w-xs w-full px-4"
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl"
        style={{
          background: `linear-gradient(135deg, ${tier.bg}, rgba(0,0,0,0.7))`,
          borderColor: tier.border,
          boxShadow: `0 8px 40px ${tier.glow}, 0 0 0 1px ${tier.border}`,
        }}
      >
        <motion.div
          initial={{ rotateY: 180, scale: 0 }}
          animate={{ rotateY: 0, scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 15 }}
          className="text-3xl shrink-0"
        >
          {achievement.icon}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: tier.text }}>
            ¡Logro Desbloqueado!
          </div>
          <div className="text-sm font-semibold text-white truncate">{achievement.title}</div>
          <div className="text-[11px] text-white/50 leading-tight">{achievement.description}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs font-bold" style={{ color: tier.text }}>
            +{achievement.xp} XP
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- XP Bar ---
function XPBar({ currentXP, nextXP, level, title }: { currentXP: number; nextXP: number; level: number; title: string }) {
  const pct = Math.min(100, Math.round((currentXP / Math.max(1, nextXP)) * 100));

  return (
    <div className="flex items-center gap-3">
      {/* Level badge */}
      <div className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold"
        style={{
          background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,229,255,0.10))',
          border: '1px solid rgba(0,255,136,0.25)',
          color: '#00ff88',
          boxShadow: '0 0 16px rgba(0,255,136,0.08)',
        }}
      >
        {level}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs font-semibold text-white/80">{title}</span>
          <span className="text-[10px] text-white/40 tabular-nums">{currentXP}/{nextXP} XP</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #00ff88, #00e5ff)' }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

// --- Badge Grid ---
function BadgeCard({ def, isUnlocked }: { def: AchievementDef; isUnlocked: boolean }) {
  const tier = TIER_COLORS[def.tier];

  return (
    <motion.div
      whileHover={isUnlocked ? { scale: 1.05, y: -2 } : {}}
      className="relative flex flex-col items-center text-center gap-1 p-2.5 rounded-xl border transition-all duration-300"
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
      <span className="text-[10px] font-semibold text-white/70 leading-tight line-clamp-1">
        {def.title}
      </span>
      {isUnlocked && (
        <span className="text-[9px] font-bold" style={{ color: tier.text }}>
          +{def.xp} XP
        </span>
      )}
    </motion.div>
  );
}

// --- Main Panel ---
export default function AchievementsPanel() {
  const { unlocked, newlyUnlocked, dismissNew, levelInfo, totalXP, allAchievements } = useAchievements();
  const playedRef = useRef(new Set<string>());

  // Play sound + confetti on new unlock
  useEffect(() => {
    newlyUnlocked.forEach((id) => {
      if (!playedRef.current.has(id)) {
        playedRef.current.add(id);
        playAchievementUnlock();
        // Small confetti burst for gold/diamond
        const def = getAchievementDef(id);
        if (def && (def.tier === 'gold' || def.tier === 'diamond')) {
          triggerConfetti();
        }
      }
    });
  }, [newlyUnlocked]);

  const unlockedCount = unlocked.length;
  const totalCount = allAchievements.length;

  // Group by tier
  const tiers: AchievementDef['tier'][] = ['bronze', 'silver', 'gold', 'diamond'];
  const tierLabels: Record<string, string> = {
    bronze: '🥉 Bronce',
    silver: '🥈 Plata',
    gold: '🥇 Oro',
    diamond: '💠 Diamante',
  };

  return (
    <>
      {/* Floating toast for newly unlocked */}
      <AnimatePresence>
        {newlyUnlocked.length > 0 && (() => {
          const def = getAchievementDef(newlyUnlocked[0]);
          return def ? (
            <AchievementToast
              key={def.id}
              achievement={def}
              onDismiss={() => dismissNew(def.id)}
            />
          ) : null;
        })()}
      </AnimatePresence>

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 20 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white/90 flex items-center gap-2">
                🏆 Logros
              </h3>
              <span className="text-xs text-white/40 tabular-nums">
                {unlockedCount}/{totalCount}
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
            {unlocked.some(u => u.id === 'saver_streak_3') && (
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
                  <div className="text-[11px] font-semibold text-white/40 mb-2 uppercase tracking-wider">
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
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
