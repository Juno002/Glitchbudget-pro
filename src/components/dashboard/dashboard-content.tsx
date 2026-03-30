'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, NotebookPen, FileText, ArrowLeftRight, History } from "lucide-react";
import SummaryTab from "@/components/dashboard/summary-tab";
import ReportsTab from "@/components/dashboard/reports-tab";
import BottomNav from "@/components/layout/bottom-nav";
import { useTabs } from "@/contexts/tabs-context";
import MovementsTab from "./movements-tab";
import PlanningTab from "./planning-tab";
import { CreditCard, X } from "lucide-react";
import { useFinances } from "@/contexts/finance-context";
import { useState, useEffect } from "react";

function AchievementMonkMode() {
  const { getTotals, currentMonth } = useFinances();
  const [qualifies, setQualifies] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const p = currentMonth.split('-');
    let py = parseInt(p[0]), pm = parseInt(p[1]);
    
    let isMonk = true;
    for (let i = 1; i <= 3; i++) {
        let m = pm - i;
        let y = py;
        if (m <= 0) {
            m += 12;
            y -= 1;
        }
        const mStr = `${y}-${String(m).padStart(2, '0')}`;
        const t = getTotals(mStr);
        if (t.totalIncome === 0) { isMonk = false; break; }
        const ratio = t.totalExpenses / t.totalIncome;
        if (ratio > 0.20 || ratio < 0) { isMonk = false; break; } // Negative check to prevent glitches
    }
    setQualifies(isMonk);
  }, [currentMonth, getTotals]);

  if (!qualifies || closed) return null;

  return (
    <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start sm:items-center gap-4 relative">
       <div className="text-3xl shrink-0">🧘🏾‍♂️</div>
       <div className="flex-1 pr-6">
         <h4 className="font-bold text-sm text-foreground">Desbloqueo I.A.: Monje Financiero</h4>
         <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Felicidades. Has gastado menos del 20% durante un trimestre completo. Tu vida social probablemente ha muerto, pero el ecosistema celebra tu disciplina. Tu cuenta bancaria será eterna.</p>
       </div>
       <button onClick={() => setClosed(true)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1" aria-label="Cerrar notificación">
         <X className="w-4 h-4" />
       </button>
    </div>
  )
}

export default function DashboardContent() {
  const { activeTab, setActiveTab } = useTabs();

  return (
    <div className="w-full fade-in">
      <AchievementMonkMode />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="hidden md:grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="summary">
          <BarChart2 className="w-4 h-4 mr-2"/>
          Resumen
        </TabsTrigger>
        <TabsTrigger value="movements">
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Movimientos
        </TabsTrigger>
        <TabsTrigger value="planning">
          <NotebookPen className="w-4 h-4 mr-2" />
          Planificación
          </TabsTrigger>
        <TabsTrigger value="reports">
          <FileText className="w-4 h-4 mr-2" />
          Reportes
          </TabsTrigger>
      </TabsList>
      <div className="min-h-[calc(100vh-200px)] w-full relative">
      <TabsContent value="summary">
        <SummaryTab />
      </TabsContent>
       <TabsContent value="movements">
         <MovementsTab />
      </TabsContent>
      <TabsContent value="planning">
         <PlanningTab />
      </TabsContent>
      <TabsContent value="reports">
         <ReportsTab />
      </TabsContent>
      </div>
      <BottomNav />
    </Tabs>
    </div>
  )
}
