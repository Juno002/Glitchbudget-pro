import { z } from 'zod';

export const money = z.coerce.number({ invalid_type_error: 'Monto inválido' }).finite().positive('El monto debe ser positivo');
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');

export const ExpenseInputSchema = z.object({
  concept: z.string().min(1, 'El concepto es requerido.'),
  categoryId: z.string().min(1, 'La categoría es requerida.'),
  amount: money,
  date: isoDate,
  type: z.enum(['Fijo', 'Variable', 'Ocasional']),
  frequency: z.enum(['mensual', 'quincenal', 'semanal']).optional(),
});

export type ExpenseInput = z.infer<typeof ExpenseInputSchema>;

export const IncomeInputSchema = z.object({
    description: z.string().min(1, 'La descripción es requerida.'),
    categoryId: z.string().min(1, 'La categoría es requerida.'),
    amount: money,
    date: isoDate,
    type: z.enum(['extra', 'gift']),
});

export type IncomeInput = z.infer<typeof IncomeInputSchema>;

    