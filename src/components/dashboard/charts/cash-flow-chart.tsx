'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFinances } from '@/contexts/finance-context';
import { getCategoryInfo } from '@/lib/categories';
import { formatCurrency } from '@/lib/utils';

interface FlowNode {
  id: string;
  label: string;
  value: number;
  color: string;
  icon?: string;
  type: 'source' | 'destination';
}

interface FlowLink {
  sourceId: string;
  targetId: string;
  value: number;
  color: string;
}

const SOURCE_COLORS = [
  '#10b981', '#3b82f6', '#06b6d4', '#8b5cf6', '#14b8a6', '#22c55e',
];
const DEST_COLORS = [
  '#f43f5e', '#fb923c', '#fbbf24', '#a78bfa', '#f472b6', '#ef4444', '#f97316', '#e879f9', '#64748b',
];

function getNodeEmoji(id: string): string {
  const map: Record<string, string> = {
    sueldo: '💼', freelance: '💻', intereses: '🏦', 'regalos-ingresos': '🎁',
    vivienda: '🏠', transporte: '🚗', alimentacion: '🍽️', servicios: '⚡',
    salud: '💊', entretenimiento: '🎮', ropa: '👕', educacion: '📚',
    'regalos-gastos': '🎁', ahorro: '🐷', otros: '📦',
    savings: '🎯', available: '💰',
  };
  return map[id] || '•';
}

// ─── Mobile List View ───────────────────────────────────────
function MobileFlowView({
  sources,
  destinations,
  totalIncome,
}: {
  sources: FlowNode[];
  destinations: FlowNode[];
  totalIncome: number;
}) {
  const destTotal = destinations.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4">
      {/* Ingresos */}
      <div>
        <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
          Ingresos
        </div>
        <div className="space-y-1.5">
          {sources.map((s, i) => {
            const pct = Math.round((s.value / Math.max(1, totalIncome)) * 100);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
                className="flex items-center gap-2.5 p-2 rounded-lg border border-white/5 bg-white/[0.02]"
              >
                <span className="text-lg shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-medium text-white/70 truncate">{s.label}</span>
                    <span className="text-xs font-semibold tabular-nums ml-2" style={{ color: s.color }}>
                      {formatCurrency(s.value)}
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/5 mt-1 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: s.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.15 + i * 0.05 }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Divider arrow */}
      <div className="flex items-center justify-center gap-2 py-1">
        <div className="h-px flex-1 bg-white/5" />
        <span className="text-white/20 text-sm">↓ se distribuye en ↓</span>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      {/* Gastos / Destinos */}
      <div>
        <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
          Destinos
        </div>
        <div className="space-y-1.5">
          {destinations.map((d, i) => {
            const pct = Math.round((d.value / Math.max(1, destTotal)) * 100);
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
                className="flex items-center gap-2.5 p-2 rounded-lg border border-white/5 bg-white/[0.02]"
              >
                <span className="text-lg shrink-0">{d.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-medium text-white/70 truncate">{d.label}</span>
                    <span className="text-xs font-semibold tabular-nums ml-2" style={{ color: d.color }}>
                      {formatCurrency(d.value)}
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/5 mt-1 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: d.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.35 + i * 0.05 }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Desktop SVG Sankey ─────────────────────────────────────
function DesktopSankeyView({
  sources,
  destinations,
  links,
  totalIncome,
}: {
  sources: FlowNode[];
  destinations: FlowNode[];
  links: FlowLink[];
  totalIncome: number;
}) {
  const SVG_W = 680;
  const SVG_H = Math.max(320, Math.max(sources.length, destinations.length) * 56 + 40);
  const NODE_W = 14;
  const LEFT_X = 50;
  const RIGHT_X = SVG_W - 50 - NODE_W;
  const GAP = 8;

  const totalSrcHeight = SVG_H - 40;
  let srcY = 20;
  const srcPositions = sources.map((s) => {
    const h = Math.max(18, (s.value / totalIncome) * totalSrcHeight);
    const pos = { ...s, x: LEFT_X, y: srcY, h };
    srcY += h + GAP;
    return pos;
  });

  const destTotal = destinations.reduce((s, d) => s + d.value, 0);
  const totalDstHeight = SVG_H - 40;
  let dstY = 20;
  const dstPositions = destinations.map((d) => {
    const h = Math.max(18, (d.value / Math.max(1, destTotal)) * totalDstHeight);
    const pos = { ...d, x: RIGHT_X, y: dstY, h };
    dstY += h + GAP;
    return pos;
  });

  const srcOffsets: Record<string, number> = {};
  srcPositions.forEach((s) => { srcOffsets[s.id] = 0; });
  const dstOffsets: Record<string, number> = {};
  dstPositions.forEach((d) => { dstOffsets[d.id] = 0; });

  const linkPaths = links.map((link, i) => {
    const src = srcPositions.find((s) => s.id === link.sourceId)!;
    const dst = dstPositions.find((d) => d.id === link.targetId)!;
    if (!src || !dst) return null;

    const srcH = (link.value / Math.max(1, src.value)) * src.h;
    const dstH = (link.value / Math.max(1, dst.value)) * dst.h;
    const thickness = Math.max(2, Math.min(srcH, dstH));

    const y1 = src.y + srcOffsets[src.id] + thickness / 2;
    const y2 = dst.y + dstOffsets[dst.id] + thickness / 2;

    srcOffsets[src.id] += srcH;
    dstOffsets[dst.id] += dstH;

    const x1 = src.x + NODE_W;
    const x2 = dst.x;
    const midX = (x1 + x2) / 2;

    const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
    return { path, thickness, color: link.color, key: i };
  }).filter(Boolean);

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      height={SVG_H}
      className="font-sans"
      preserveAspectRatio="xMidYMid meet"
    >
      {linkPaths.map((lp) =>
        lp ? (
          <motion.path
            key={lp.key}
            d={lp.path}
            fill="none"
            stroke={lp.color}
            strokeWidth={lp.thickness}
            strokeOpacity={0.18}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1, delay: 0.1 + lp.key * 0.04, ease: 'easeOut' }}
          />
        ) : null
      )}

      {srcPositions.map((s, i) => (
        <g key={s.id}>
          <motion.rect
            x={s.x} y={s.y} width={NODE_W} height={s.h} rx={4} fill={s.color}
            stroke="hsl(var(--background))" strokeWidth={2}
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 200, damping: 20 }}
            style={{ transformOrigin: `${s.x + NODE_W / 2}px ${s.y + s.h / 2}px` }}
          />
          <text x={s.x - 6} y={s.y + s.h / 2} textAnchor="end" dominantBaseline="central" className="text-[11px] fill-white/60">
            {s.icon} {s.label}
          </text>
          <text x={s.x - 6} y={s.y + s.h / 2 + 13} textAnchor="end" dominantBaseline="central" className="text-[9px] fill-white/30 tabular-nums">
            {formatCurrency(s.value)}
          </text>
        </g>
      ))}

      {dstPositions.map((d, i) => (
        <g key={d.id}>
          <motion.rect
            x={d.x} y={d.y} width={NODE_W} height={d.h} rx={4} fill={d.color}
            stroke="hsl(var(--background))" strokeWidth={2}
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
            transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 200, damping: 20 }}
            style={{ transformOrigin: `${d.x + NODE_W / 2}px ${d.y + d.h / 2}px` }}
          />
          <text x={d.x + NODE_W + 6} y={d.y + d.h / 2} textAnchor="start" dominantBaseline="central" className="text-[11px] fill-white/60">
            {d.icon} {d.label}
          </text>
          <text x={d.x + NODE_W + 6} y={d.y + d.h / 2 + 13} textAnchor="start" dominantBaseline="central" className="text-[9px] fill-white/30 tabular-nums">
            {formatCurrency(d.value)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function CashFlowChart() {
  const {
    getIncomesByCategory,
    getExpensesByCategory,
    getTotals,
    currentMonth,
    goals,
    goalContributions,
  } = useFinances();

  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const { sources, destinations, links, totalIncome } = useMemo(() => {
    const incomeData = getIncomesByCategory(currentMonth);
    const expenseData = getExpensesByCategory(currentMonth);

    const monthContribs = (goalContributions || [])
      .filter((c) => c.date.slice(0, 7) === currentMonth)
      .reduce((sum, c) => sum + c.amount, 0);

    const totalIncome = incomeData.reduce((s, d) => s + d.value, 0);
    if (totalIncome <= 0) return { sources: [], destinations: [], links: [], totalIncome: 0 };

    const sources: FlowNode[] = incomeData.map((d, i) => ({
      id: `src-${d.name}`,
      label: getCategoryInfo(d.name)?.name || d.name,
      value: d.value,
      color: SOURCE_COLORS[i % SOURCE_COLORS.length],
      icon: getNodeEmoji(d.name),
      type: 'source',
    }));

    const dests: FlowNode[] = [];
    expenseData.forEach((d, i) => {
      dests.push({
        id: `dst-${d.name}`,
        label: getCategoryInfo(d.name)?.name || d.name,
        value: d.value,
        color: DEST_COLORS[i % DEST_COLORS.length],
        icon: getNodeEmoji(d.name),
        type: 'destination',
      });
    });

    if (monthContribs > 0) {
      dests.push({
        id: 'dst-savings',
        label: 'Metas de Ahorro',
        value: monthContribs,
        color: '#00ff88',
        icon: '🎯',
        type: 'destination',
      });
    }

    const totalExpenses = expenseData.reduce((s, d) => s + d.value, 0);
    const available = Math.max(0, totalIncome - totalExpenses - monthContribs);
    if (available > 0) {
      dests.push({
        id: 'dst-available',
        label: 'Disponible',
        value: available,
        color: '#00e5ff',
        icon: '💰',
        type: 'destination',
      });
    }

    const links: FlowLink[] = [];
    sources.forEach((src) => {
      dests.forEach((dst) => {
        const linkValue = (src.value / Math.max(1, totalIncome)) * dst.value;
        if (linkValue > 0) {
          links.push({
            sourceId: src.id,
            targetId: dst.id,
            value: linkValue,
            color: src.color,
          });
        }
      });
    });

    return { sources, destinations: dests, links, totalIncome };
  }, [getIncomesByCategory, getExpensesByCategory, getTotals, currentMonth, goalContributions]);

  if (!isClient) return null;

  if (totalIncome <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>💸 Flujo de Dinero</CardTitle>
          <CardDescription>Visualiza cómo se distribuyen tus ingresos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Aún no hay datos de ingresos para este mes.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>💸 Flujo de Dinero</CardTitle>
          <CardDescription>Cómo se distribuyen tus ingresos del mes.</CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {isMobile ? (
            <MobileFlowView
              sources={sources}
              destinations={destinations}
              totalIncome={totalIncome}
            />
          ) : (
            <DesktopSankeyView
              sources={sources}
              destinations={destinations}
              links={links}
              totalIncome={totalIncome}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
