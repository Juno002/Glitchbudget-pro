# Fase 20.9.4 — Tooltips, popovers y dialogs

Estado: **completada / Gate aprobado**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Contrato contextual

20.9.4 normaliza ayuda contextual y superficies modales sin ocultar consecuencias importantes.

### Tooltip

- retraso breve y explícito: 250 ms;
- `sideOffset` y `collisionPadding` definidos;
- superficie, borde, contraste y sombra semánticos;
- ancho limitado al viewport;
- texto breve en `text-popover-foreground`;
- eliminado el fondo claro + texto blanco heredado;
- no se usa como único lugar para advertencias financieras o destructivas.

### Popover

- offset/collision padding compartidos;
- ancho máximo responsive;
- cierre explícito opcional para contenido informativo táctil;
- botón de cierre con foco visible;
- ayuda KPI de Home incluye título + explicación breve;
- las advertencias KPI permanecen visibles fuera del popover;
- detalles de medallas reutilizan el mismo cierre táctil.

### Dialog / AlertDialog

- jerarquía de títulos compartida;
- headers alineados y espacio reservado para cierre;
- Dialog usa un control de cierre consistente, etiquetado y con foco visible;
- footers usan gap compartido;
- AlertDialog conserva Cancelar/Confirmar como salida explícita y no añade una X ambigua a operaciones destructivas;
- consecuencias destructivas siguen visibles en `AlertDialogDescription`.

## Responsive / browser gate

El E2E abre y cierra la explicación de “Disponible líquido” en desktop y en viewport móvil, y verifica que el popover permanezca dentro del ancho visible.

## Delimitación con 20.9.8

El defecto ya inventariado de focus invisible en `BadgeCard` **no se corrige aquí**. 20.9.4 normaliza el contenido/dismiss del popover; 20.9.8 conserva la remediación obligatoria del trigger de medalla y el sweep general de touch/focus.

## Cambios funcionales

Ninguno. No cambia semántica financiera, schema, migraciones, backup, persistencia ni red.

## Quality gate aprobado

```text
609/609 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
static output / connect-src 'none' ✅
Quality checks 36893491408 ✅
```

No hubo findings sustantivos de review sobre el HEAD validado. El único status externo rojo fue Vercel por cuota diaria, fuera del gate funcional.

## Gate

**Aprobado.** 20.9.4 queda cerrada. Una vez fusionada esta reconciliación y verificado `main`, la siguiente intervención autorizada es **20.9.5 — Achievement toast / feedback celebratorio**.
