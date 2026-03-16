
'use client';

import { useRef } from 'react';
import { useFinances } from '@/contexts/finance-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { friendlyError } from '@/lib/errors';
import {
  exportIncomesCSV,
  exportExpensesCSV,
  exportPlansCSV,
  exportGoalsCSV,
  exportGoalContribCSV,
  importIncomesCSV,
  importExpensesCSV,
  importPlansCSV,
  importGoalsCSV,
  importGoalContribCSV,
} from '@/lib/csv-backup';

type TableName = 'incomes' | 'expenses' | 'plans' | 'goals' | 'goalContributions';

const backupActions: {
    name: TableName;
    label: string;
    exportFn: () => Promise<void>;
    importFn: (file: File) => Promise<void>;
}[] = [
    { name: 'incomes', label: 'Ingresos', exportFn: exportIncomesCSV, importFn: importIncomesCSV },
    { name: 'expenses', label: 'Gastos', exportFn: exportExpensesCSV, importFn: importExpensesCSV },
    { name: 'plans', label: 'Planes (Presupuestos)', exportFn: exportPlansCSV, importFn: importPlansCSV },
    { name: 'goals', label: 'Metas', exportFn: exportGoalsCSV, importFn: importGoalsCSV },
    { name: 'goalContributions', label: 'Aportes a Metas', exportFn: exportGoalContribCSV, importFn: importGoalContribCSV },
];

export default function CsvBackupDialog() {
  const { toast } = useToast();
  const { setDataVersion } = useFinances();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentImportFn = useRef<((file: File) => Promise<void>) | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentImportFn.current) {
      try {
        await currentImportFn.current(file);
        setDataVersion(v => v + 1);
        toast({
          title: 'Importación CSV exitosa',
          description: `Los datos de "${file.name}" se han restaurado.`,
        });
      } catch (error) {
        toast({
          title: 'Error en la importación CSV',
          description: friendlyError(error),
          variant: 'destructive',
        });
      }
    }
    // Reset file input to allow selecting the same file again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const triggerImport = (importFn: (file: File) => Promise<void>) => {
      currentImportFn.current = importFn;
      fileInputRef.current?.click();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Importar/Exportar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gestión de CSV</DialogTitle>
          <DialogDescription>
            Importa o exporta los datos de cada tabla individualmente en formato CSV, legible por Excel o Google Sheets.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
            {backupActions.map(({ name, label, exportFn, importFn }) => (
                <div key={name} className="flex items-center justify-between p-2 rounded-md border">
                    <span className="font-medium">{label}</span>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => triggerImport(importFn)} title={`Importar ${label}`}>
                            <Upload className="h-4 w-4 text-primary" />
                        </Button>
                         <Button variant="ghost" size="icon" onClick={exportFn} title={`Exportar ${label}`}>
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
         <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".csv"
        />
        <DialogFooter>
          <p className="text-xs text-muted-foreground">Nota: La importación reemplazará todos los datos de la tabla seleccionada.</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
