'use client';

import { useState, useMemo } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCategoryInfo } from '@/lib/categories';
import { Skeleton } from '../ui/skeleton';

export default function TransactionHistoryClient() {
  const { incomes, expenses, loading, incomeCategories, expenseCategories } = useFinances();
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const transactions = useMemo(() => {
    const all = [
        ...(incomes || []).map(i => ({...i, type: 'income' as const, description: i.description, amount: i.amount })),
        ...(expenses || []).map(e => ({...e, type: 'expense' as const, description: e.concept, amount: e.amount }))
    ];
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomes, expenses]);

  const filteredTransactions = useMemo(() => transactions.filter(tx => {
    const searchMatch = tx.description.toLowerCase().includes(filter.toLowerCase());
    const typeMatch = typeFilter === 'all' || tx.type === typeFilter;
    const categoryMatch = categoryFilter === 'all' || tx.categoryId === categoryFilter;
    return searchMatch && typeMatch && categoryMatch;
  }), [transactions, filter, typeFilter, categoryFilter]);

  const categoryOptions = useMemo(() => {
    return Array.from(new Set([...incomeCategories, ...expenseCategories]));
  }, [incomeCategories, expenseCategories]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Filtrar por descripción..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
            />
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setCategoryFilter('all'); }}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Tipos</SelectItem>
                <SelectItem value="income">Ingreso</SelectItem>
                <SelectItem value="expense">Gasto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Categorías</SelectItem>
                {categoryOptions.map(id => {
                  const cat = getCategoryInfo(id);
                  return cat ? <SelectItem key={id} value={id}>{cat.name}</SelectItem> : null
                })}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : (
                <TransactionTable transactions={filteredTransactions} />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
