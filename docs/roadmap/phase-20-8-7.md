# Fase 20.8.7 — Progressive disclosure y copy contextual

Estado: **completada técnicamente / Gate aprobado; cierre documental en curso**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## Objetivo

Aplicar de forma consistente el contrato de disclosure de 20.8:

```text
¿ayuda a decidir ahora? → visible
¿aclara una definición? → popover/tooltip
¿es redundante? → eliminar
¿advierte una consecuencia importante? → visible
```

La información necesaria para comprender consecuencias financieras no puede depender únicamente de hover. Los controles de disclosure deben funcionar por teclado y toque.

## Resultado

- las definiciones estables de los KPI de Resumen permanecen detrás de popovers activados mediante botones accesibles;
- las advertencias que cambian interpretación permanecen visibles fuera del disclosure: crédito disponible no tratado como activo, deuda real registrada y rendimiento proyectado no incluido;
- Reportes mantiene visibles las consecuencias financieras relevantes y conserva comparación, tablas y detalle exacto;
- Home y Reportes quedan protegidos contra disclosure requerido dependiente solo de `hover` o `onMouseEnter`;
- no se añadieron fórmulas financieras, acceso directo a Dexie, red, schema, migraciones ni cambios de backup.

## Regresión añadida

`tests/phase-20-8-7-disclosure.test.ts` fija cuatro contratos:

1. definiciones estables detrás de un `PopoverTrigger` con `button` accesible;
2. consecuencias financieras importantes renderizadas fuera del popover;
3. detalle exacto de Reportes preservado y visible;
4. ausencia de mecanismos hover-only para significado requerido.

## Quality gate

```text
580/580 tests
npm run check ✅
npm run benchmark:ledger ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36839469668 ✅
```

El E2E cubrió branding Prisma, Home, Movimientos/compositor, Plan, Reportes/gráficos, mutaciones, navegación responsive y recarga offline. El build mantuvo `connect-src 'none'`.

## Integración

PR #69 fusionada mediante squash.

Merge commit:

```text
34daf8ca4c64ddb344c07681885461f3cf6707b0
```

## Gate 20.8.7

**Aprobado técnicamente.** La reducción de ruido no reduce comprensión ni accesibilidad.

El siguiente paso autorizado solo después de reconciliar el estado de este cierre en el roadmap canónico, `docs/roadmap/phase-20.md`, `docs/roadmap/phase-20-8.md` y `docs/roadmap/README.md` es **20.8.8 — Gate final 20.8**.
