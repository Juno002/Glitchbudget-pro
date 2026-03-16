'use client';

import { useFinances } from '@/contexts/finance-context';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useState, useEffect } from 'react';

const RADIAN = Math.PI / 180;

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent === 0) return null;
    return (
        <text
            x={cx}
            y={cy}
            fill="hsl(var(--foreground))"
            textAnchor="middle"
            dominantBaseline="central"
            className="text-3xl font-bold"
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};


export default function PercentageSpentRing() {
    const { getTotals, currentMonth } = useFinances();
    const { totalIncome, totalExpenses } = getTotals(currentMonth);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const spentPercentage = totalIncome > 0 ? (totalExpenses / totalIncome) : 0;
    
    const data = [
        { name: 'Gastado', value: Math.min(spentPercentage, 1) },
        { name: 'Restante', value: Math.max(0, 1 - spentPercentage) },
    ];

    let color = 'hsl(var(--good))';
    if (spentPercentage >= 1) color = 'hsl(var(--bad))';
    else if (spentPercentage >= 0.8) color = 'hsl(var(--warning))';

    return (
        <div className="h-48 w-48 relative">
          {isClient && (
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Tooltip 
                        formatter={(value: number, name: string) => [`${(spentPercentage * 100).toFixed(0)}%`, 'Gastado']}
                    />
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        dataKey="value"
                        innerRadius="80%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                        isAnimationActive={false}
                        stroke="none"
                    >
                         <Cell key={`cell-0`} fill={color} />
                         <Cell key={`cell-1`} fill="hsl(var(--border))" />
                    </Pie>
                    <Pie
                        data={[{ value: 1, percent: spentPercentage }]}
                        cx="50%"
                        cy="50%"
                        dataKey="value"
                        innerRadius="80%"
                        outerRadius="100%"
                        isAnimationActive={true}
                        labelLine={false}
                        label={CustomLabel}
                        stroke="none"
                    >
                         <Cell fill="transparent" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
          )}
        </div>
    );
}
