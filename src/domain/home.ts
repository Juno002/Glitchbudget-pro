import type { Investment, PlannedOccurrence, RecurringRule } from './models';
import type { GoalView } from './goals';
import { goalFundingSchedule } from './goals';
import { groupUpcomingOccurrences } from './upcoming';
import { investmentProjection } from './investments';
import type { selectReportsSnapshot } from './reports';

export type HomeModuleId = 'position' | 'budget' | 'upcoming' | 'goals' | 'investments';

export type HomeBudgetDetail = {
  configured: boolean;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'ok' | 'alert' | 'over' | 'unbudgeted';
};

export type HomeReadModelInput = {
  report: ReturnType<typeof selectReportsSnapshot>;
  budgetDetails: HomeBudgetDetail[];
  plannedOccurrences: PlannedOccurrence[];
  recurringRules: RecurringRule[];
  goals: GoalView[];
  investments: Investment[];
  today: string;
  periodStartDay: number;
};

export function selectHomeReadModel(input: HomeReadModelInput) {
  const trackedBudgets = input.budgetDetails.filter(row => row.configured);
  const budgetLimit = trackedBudgets.reduce((sum,row)=>sum+row.limit,0);
  const budgetSpent = trackedBudgets.reduce((sum,row)=>sum+row.spent,0);
  const budgetRemaining = trackedBudgets.reduce((sum,row)=>sum+row.remaining,0);
  const overBudgetCount = trackedBudgets.filter(row=>row.status==='over').length;
  const alertBudgetCount = trackedBudgets.filter(row=>row.status==='alert').length;

  const grouped = groupUpcomingOccurrences(input.plannedOccurrences,input.today);
  const upcomingRows = [...grouped.overdue,...grouped.today,...grouped.tomorrow,...grouped.next7].slice(0,3);
  const rulesById = new Map(input.recurringRules.map(rule=>[rule.id,rule]));
  const upcoming = upcomingRows
    .map(occurrence=>({occurrence,rule:rulesById.get(occurrence.ruleId)}))
    .filter((row): row is { occurrence:PlannedOccurrence; rule:RecurringRule } => Boolean(row.rule));

  const goals = [...input.goals]
    .filter(goal=>goal.status==='active')
    .sort((a,b)=>(a.date||'9999-12-31').localeCompare(b.date||'9999-12-31') || a.name.localeCompare(b.name,'es'))
    .slice(0,2)
    .map(goal=>{
      const remaining=Math.max(0,goal.target-goal.saved);
      return {
        goal,
        remaining,
        schedule:goalFundingSchedule(remaining,goal.date,input.today,{periodStartDay:input.periodStartDay}),
      };
    });

  const investments = [...input.investments]
    .filter(row=>row.status==='active')
    .map(investment=>({investment,projection:investmentProjection(investment,input.today)}))
    .sort((a,b)=>(a.investment.maturityDate||'9999-12-31').localeCompare(b.investment.maturityDate||'9999-12-31') || a.investment.name.localeCompare(b.investment.name,'es'))
    .slice(0,2);

  const overdueGoalCount=input.goals.filter(goal=>goal.status==='active' && Boolean(goal.date) && goal.date! < input.today).length;
  const maturedInvestmentCount=input.investments.filter(row=>row.status==='active' && Boolean(row.maturityDate) && row.maturityDate! <= input.today).length;
  const attentionCount=grouped.overdue.length+overBudgetCount+overdueGoalCount+maturedInvestmentCount;

  return {
    attentionCount,
    position:{
      liquidAssets:input.report.netWorth.liquidAssets,
      investments:input.report.netWorth.investments,
      liabilities:input.report.netWorth.creditCardLiabilities,
      netWorth:input.report.netWorth.netWorth,
    },
    budget:{
      configuredCount:trackedBudgets.length,
      limit:budgetLimit,
      spent:budgetSpent,
      remaining:budgetRemaining,
      overCount:overBudgetCount,
      alertCount:alertBudgetCount,
      status:overBudgetCount>0 ? 'over' as const : alertBudgetCount>0 ? 'alert' as const : trackedBudgets.length ? 'ok' as const : 'unconfigured' as const,
    },
    upcoming:{
      rows:upcoming,
      overdueCount:grouped.overdue.length,
      todayCount:grouped.today.length,
    },
    goals,
    investments:{
      totalRegistered:input.report.netWorth.investments,
      activeCount:input.investments.filter(row=>row.status==='active').length,
      rows:investments,
      maturedCount:maturedInvestmentCount,
    },
  };
}
