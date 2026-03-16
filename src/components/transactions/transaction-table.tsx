'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { getCategoryInfo } from '@/lib/categories';
import { format } from 'date-fns';
import type { Income, Expense } from '@/lib/types';

type TransactionView = (Omit<Income, 'amount'> | Omit<Expense, 'amount'>) & { type: 'income' | 'expense', description: string, amount: number };

interface TransactionTableProps {
  transactions: TransactionView[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  return (
    <div className="rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {transactions.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                    Sin resultados.
                    </TableCell>
                </TableRow>
                ) : (
                transactions.map((tx) => {
                    const category = getCategoryInfo(tx.categoryId);
                    const isIncome = tx.type === 'income';
                    return (
                    <TableRow key={tx.id}>
                        <TableCell className="font-medium">
                            {tx.description}
                            <div className="text-muted-foreground text-xs sm:hidden">
                                {category?.name} - {format(new Date(tx.date), 'MMM d')}
                            </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                        {category && (
                            <Badge variant="outline" className="flex items-center gap-2 w-fit">
                            <category.icon className="h-3 w-3" />
                            {category.name}
                            </Badge>
                        )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{format(new Date(tx.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className={`text-right font-medium ${isIncome ? 'text-green-600' : 'text-foreground'}`}>
                        {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                        </TableCell>
                    </TableRow>
                    );
                })
                )}
            </TableBody>
        </Table>
    </div>
  );
}

    