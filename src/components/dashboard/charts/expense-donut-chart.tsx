'use client';

import { useFinances } from '@/contexts/finance-context';
import { formatCurrency } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useState, useEffect } from 'react';

const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff8042',
    '#00C49F',
];

const CustomLegend = (props: any) => {
  const { payload } = props;
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
      {
        payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
            <span>{entry.value} ({`${(entry.payload.percent * 100).toFixed(0)}%`})</span>
          </li>
        ))
      }
    </ul>
  );
};

export default function ExpenseDonutChart() {
    const { getExpensesByCategory, currentMonth, loading } = useFinances();
    const data = getExpensesByCategory(currentMonth);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (loading) return <div className="h-full w-full flex items-center justify-center text-muted-foreground">Cargando...</div>;

    if (!isClient) return null; // Prevent server-side rendering of the chart

    if (data.length === 0) {
        return <div className="h-full w-full flex items-center justify-center text-muted-foreground">Sin datos de gastos para mostrar.</div>
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
          <PieChart>
              <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend content={<CustomLegend />} verticalAlign="bottom" />
              <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  innerRadius={50}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
              >
                  {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
              </Pie>
          </PieChart>
      </ResponsiveContainer>
    );
}
