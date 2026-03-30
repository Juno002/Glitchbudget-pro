'use client';

import { useState } from "react";
import { useFinances } from "@/contexts/finance-context";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import IconPicker from "./icon-picker";

export default function IncomeCategoryManager() {
    const { incomeCategories, addIncomeCategory, resetIncomeCategories } = useFinances();
    const [newCategory, setNewCategory] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('circle-dollar-sign');
    const { toast } = useToast();

    const handleAddCategory = () => {
        if (!newCategory.trim()) {
            toast({ title: 'Nombre de categoría vacío', variant: 'destructive' });
            return;
        }
        if (incomeCategories.includes(newCategory.trim())) {
            toast({ title: 'La categoría ya existe', variant: 'destructive' });
            return;
        }
        addIncomeCategory(newCategory.trim(), selectedIcon);
        setNewCategory('');
        setSelectedIcon('circle-dollar-sign');
        toast({ title: 'Categoría de ingresos agregada' });
    };

    const handleReset = () => {
        resetIncomeCategories();
        toast({ title: "Categorías de ingresos restablecidas" });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>🏷️ Gestión de categorías de ingresos</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-2 items-end">
                    <div className="flex-1 flex gap-2 w-full">
                        <IconPicker value={selectedIcon} onChange={setSelectedIcon} />
                        <Input 
                            placeholder="Nueva categoría (ej: Freelance)"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                            className="flex-1"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button onClick={handleAddCategory} className="flex-1 md:w-auto bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20">➕ Agregar</Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="w-full md:w-auto">🔄 Restablecer</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esto restablecerá tus categorías de ingresos a las predeterminadas. Esta acción no se puede deshacer.
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
            </CardContent>
        </Card>
    );
}
