
'use client';

import { useState } from 'react';
import { db } from '@/lib/db'; // tu instancia Dexie

function monthOf(iso?: string) { return iso && iso.length >= 7 ? iso.slice(0,7) : undefined; }

function normalizeDump(raw: any) {
  if (!raw || !raw.v || raw.v < 1) throw new Error('Backup inválido: v');
  const settingsObj = Array.isArray(raw.settings) ? (raw.settings[0] ?? {}) : (raw.settings ?? {});
  if (!settingsObj.id) settingsObj.id = 'general';

  const incomes = (raw.incomes ?? []).map((i: any) => ({
    id: i.id ?? crypto.randomUUID(),
    month: i.month ?? monthOf(i.date),
    categoryId: i.categoryId ?? i.type ?? 'ingresos',
    amount: Math.abs(Number(i.amount ?? 0)),
    description: i.description ?? i.source ?? 'ingreso',
    date: i.date ?? (i.month ? `${i.month}-01` : new Date().toISOString().slice(0,10)),
    type: i.type || 'extra',
  }));

  const expenses = (raw.expenses ?? []).map((e: any) => ({
    id: e.id ?? crypto.randomUUID(),
    month: e.month ?? monthOf(e.date),
    categoryId: e.categoryId ?? e.type ?? 'gastos',
    amount: Math.abs(Number(e.amount ?? 0)),
    concept: e.concept ?? e.note ?? 'gasto',
    date: e.date ?? (e.month ? `${e.month}-01` : new Date().toISOString().slice(0,10)),
    type: e.type || 'Variable'
  }));

  const budgets = (raw.budgets ?? raw.plans ?? []).map((b: any) => ({
    month: b.month,
    categoryId: b.categoryId,
    limit: Math.abs(Number(b.limit ?? b.planned ?? 0)),
  }));

  const goals = (raw.goals ?? []).map((g: any) => ({ ...g }));
  const goalContributions = (raw.goalContributions ?? raw.goal_contributions ?? []).map((gc: any) => ({ ...gc }));

  return { v: raw.v, settings: [settingsObj], incomes, expenses, budgets, goals, goalContributions };
}

export default function DiagRestore() {
  const [log, setLog] = useState<string>('Listo.');
  const append = (line: string) => setLog(s => s + '\n' + line);

  async function showCounts(tag: string) {
    const [
      settings, incomes, expenses, plans, goals, goalContributions,
    ] = await Promise.all([
      db.settings.count(), db.incomes.count(), db.expenses.count(),
      db.plans.count(), db.goals.count(), db.goal_contributions.count?.() ?? 0,
    ]);
    append(`${tag} counts -> settings:${settings} incomes:${incomes} expenses:${expenses} plans:${plans} goals:${goals} goal_contributions:${goalContributions}`);
  }

  async function handleFile(file: File) {
    try {
      setLog('Procesando…');
      await showCounts('PRE');
      const text = await file.text();
      const raw = JSON.parse(text);
      const n = normalizeDump(raw);

      await db.transaction('rw',
        db.settings, db.incomes, db.expenses, db.plans, db.goals, db.goal_contributions,
        async () => {
          await Promise.all([
            db.settings.clear(), db.incomes.clear(), db.expenses.clear(),
            db.plans.clear(), db.goals.clear(),
            db.goal_contributions?.clear?.(),
          ]);
          if (n.settings?.length) await db.settings.bulkAdd(n.settings);
          if (n.incomes?.length) await db.incomes.bulkAdd(n.incomes);
          if (n.expenses?.length) await db.expenses.bulkAdd(n.expenses);
          if (n.budgets?.length) await db.plans.bulkPut(n.budgets); // Use bulkPut for budgets
          if (n.goals?.length) await db.goals.bulkAdd(n.goals);
          if (n.goalContributions?.length && db.goal_contributions?.bulkAdd) {
            await db.goal_contributions.bulkAdd(n.goalContributions);
          }
        }
      );

      const general = await db.settings.get('general');
      append('settings["general"] ' + (general ? 'OK' : 'NO-EXISTE'));
      await showCounts('POST');
      append('Éxito: datos importados. Si la UI no refresca, el problema es el contexto.');
    } catch (e: any) {
      append('ERROR: ' + (e?.message ?? String(e)));
    }
  }

  return (
    <div style={{padding:16}}>
      <h1>Diagnóstico de Restore</h1>
      <input type="file" accept="application/json" onChange={e => {
        const f = e.currentTarget.files?.[0];
        if (f) void handleFile(f);
      }} />
      <pre style={{whiteSpace:'pre-wrap', background:'#111', color:'#0f0', padding:12, marginTop:12, borderRadius:8}}>
        {log}
      </pre>
    </div>
  );
}
