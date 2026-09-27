'use client';
import { useEffect, useState } from 'react';
import { useCategoryResolver } from '@/hooks/use-categories';
import { useMoneyFormatter, useMoneyVisibility } from '@/hooks/use-money-visibility';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
export const DonutChart = ({ data, title, colors, delay = 0 }: { data: { name: string, value: number }[], title: string, colors?: string[], delay?: number }) => {
  const formatCurrency = useMoneyFormatter();
  const { balancesHidden } = useMoneyVisibility();
  const getCategoryInfo = useCategoryResolver();
    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true) }, []);

    // Default palette if none provided
    const COLORS = colors || [
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
    ];

    if (balancesHidden) return <Card><CardContent className="p-6"><h3>{title} por categoría</h3><p className="text-sm text-muted-foreground">Gráfico oculto por privacidad.</p></CardContent></Card>;
    if(!isClient) return <Skeleton className="h-64 w-full" />;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
        >
        <Card className="hover:shadow-lg hover:shadow-[hsl(var(--primary)_/_0.04)] transition-shadow duration-300">
            <CardContent className="pt-6">
                <h3 className="text-base font-semibold mb-3">{title} por categoría</h3>
                <div className="h-64 w-full">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <RechartsTooltip
                                    formatter={(value: number) => [formatCurrency(value), title]}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '12px',
                                        backdropFilter: 'blur(12px)',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                    }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Legend formatter={(value) => getCategoryInfo(String(value))?.name || String(value)} />
                                <Pie
                                    data={data}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    innerRadius={50}
                                    labelLine={false}
                                    animationBegin={delay * 1000}
                                    isAnimationActive={false}
                                    animationEasing="ease-out"
                                    paddingAngle={3}
                                    stroke="hsl(var(--background))"
                                    strokeWidth={2}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">Sin datos para mostrar.</div>
                    )}
                </div>
            </CardContent>
        </Card>
        </motion.div>
    );
}

