'use client';
import CategoryMaintenance from './category-maintenance';
import { friendlyError } from '@/lib/errors';


import { useState } from "react";
import { useFinances } from "@/contexts/finance-context";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import IconPicker from "./icon-picker";

export default function ExpenseCategoryManager() {
    const { expenseCategories, addExpenseCategory, resetExpenseCategories } = useFinances();
    const [newCategory, setNewCategory] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('landmark');
    const { toast } = useToast();

    const handleAddCategory = async () => {
        if (!newCategory.trim()) {
            toast({ title: 'Nombre de categoría vacío', variant: 'destructive' });
            return;
        }
        try { await addExpenseCategory(newCategory.trim(), selectedIcon); } catch (error) { toast({title:'No se guardó la categoría', description:friendlyError(error),variant:'destructive'}); return; }
        setNewCategory('');
        setSelectedIcon('landmark');
        toast({ title: 'Categoría de gastos agregada' });
    };

    const handleReset = async () => {
        try { await resetExpenseCategories(); } catch(error) { toast({title:'No se restablecieron las categorías',description:friendlyError(error),variant:'destructive'}); return; }
        toast({ title: "Categorías de gastos restablecidas" });
    }

    return (
        <Card className="border bg-card shadow-[var(--shadow-card)]" data-category-manager="prisma">
            <CardHeader>
                <CardTitle className="font-display text-xl font-normal">Categorías de gastos</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-2 items-end">
                    <div className="flex-1 flex gap-2 w-full">
                        <IconPicker value={selectedIcon} onChange={setSelectedIcon} />
                        <Input 
                            placeholder="Nueva categoría (ej: Cine)"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                            className="flex-1"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button onClick={handleAddCategory} className="flex-1 rounded-[var(--radius-interactive)] md:w-auto">➕ Agregar</Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="w-full md:w-auto">🔄 Restablecer</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esto restablecerá tus categorías de gastos a las predeterminadas. Las categorías propias se archivarán conservando el historial y podrán reactivarse. Las compartidas con ingresos y gastos se conservarán.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleReset}>Continuar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
                <CategoryMaintenance direction="expense" />
            </CardContent>
        </Card>
    );
}
