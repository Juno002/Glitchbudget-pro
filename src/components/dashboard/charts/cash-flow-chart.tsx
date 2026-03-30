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
  useEffect(() => setIsClient(true), []);

  const { sources, destinations, links, totalIncome } = useMemo(() => {
    const incomeData = getIncomesByCategory(currentMonth);
    const expenseData = getExpensesByCategory(currentMonth);
    const totals = getTotals(currentMonth);

    // Goal contributions this month
    const monthContribs = (goalContributions || [])
      .filter((c) => c.date.slice(0, 7) === currentMonth)
      .reduce((sum, c) => sum + c.amount, 0);

    const totalIncome = incomeData.reduce((s, d) => s + d.value, 0);
    if (totalIncome <= 0) return { sources: [], destinations: [], links: [], totalIncome: 0 };

    // Sources (left side)
    const sources: FlowNode[] = incomeData.map((d, i) => ({
      id: `src-${d.name}`,
      label: getCategoryInfo(d.name)?.name || d.name,
      value: d.value,
      color: SOURCE_COLORS[i % SOURCE_COLORS.length],
      icon: getNodeEmoji(d.name),
      type: 'source',
    }));

    // Destinations (right side)
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

    // Goal contributions
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

    // Available / surplus
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

    // Links — connect each source proportionally to each destination
    const links: FlowLink[] = [];
    const destTotal = dests.reduce((s, d) => s + d.value, 0);
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

  // Layout constants
  const SVG_W = 680;
  const SVG_H = Math.max(320, Math.max(sources.length, destinations.length) * 56 + 40);
  const NODE_W = 14;
  const LEFT_X = 50;
  const RIGHT_X = SVG_W - 50 - NODE_W;
  const GAP = 8;

  // Calculate node positions
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

  // Build link paths with source/dest offset tracking
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
        <CardContent className="p-2 md:p-6 overflow-x-auto">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width="100%"
            height={SVG_H}
            className="font-sans"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {sources.map((s, i) => (
                <linearGradient key={s.id} id={`grad-${i}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.08" />
                </linearGradient>
              ))}
            </defs>

            {/* Links */}
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

            {/* Source nodes */}
            {srcPositions.map((s, i) => (
              <g key={s.id}>
                <motion.rect
                  x={s.x}
                  y={s.y}
                  width={NODE_W}
                  height={s.h}
                  rx={4}
                  fill={s.color}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 200, damping: 20 }}
                  style={{ transformOrigin: `${s.x + NODE_W / 2}px ${s.y + s.h / 2}px` }}
                />
                <text
                  x={s.x - 6}
                  y={s.y + s.h / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  className="text-[11px] fill-white/60"
                >
                  {s.icon} {s.label}
                </text>
                <text
                  x={s.x - 6}
                  y={s.y + s.h / 2 + 13}
                  textAnchor="end"
                  dominantBaseline="central"
                  className="text-[9px] fill-white/30 tabular-nums"
                >
                  {formatCurrency(s.value)}
                </text>
              </g>
            ))}

            {/* Destination nodes */}
            {dstPositions.map((d, i) => (
              <g key={d.id}>
                <motion.rect
                  x={d.x}
                  y={d.y}
                  width={NODE_W}
                  height={d.h}
                  rx={4}
                  fill={d.color}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 200, damping: 20 }}
                  style={{ transformOrigin: `${d.x + NODE_W / 2}px ${d.y + d.h / 2}px` }}
                />
                <text
                  x={d.x + NODE_W + 6}
                  y={d.y + d.h / 2}
                  textAnchor="start"
                  dominantBaseline="central"
                  className="text-[11px] fill-white/60"
                >
                  {d.icon} {d.label}
                </text>
                <text
                  x={d.x + NODE_W + 6}
                  y={d.y + d.h / 2 + 13}
                  textAnchor="start"
                  dominantBaseline="central"
                  className="text-[9px] fill-white/30 tabular-nums"
                >
                  {formatCurrency(d.value)}
                </text>
              </g>
            ))}
          </svg>
        </CardContent>
      </Card>
    </motion.div>
  );
}
