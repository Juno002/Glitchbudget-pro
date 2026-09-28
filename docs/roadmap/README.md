# Roadmap: documentación vigente

## Fases 9 y 10 — cierre de implementación

La continuación de **Fase 9 — Budgets 2.0** y **Fase 10 — Goals 2.0** fue autorizada por el usuario el 2026-09-27. Los contratos, migraciones, comprobaciones y límites están en [phase-9.md](phase-9.md) y [phase-10.md](phase-10.md). Fase 11 no se inicia automáticamente.

## Fase 8 — completada

Fase 8 — Quick Add 2.0 está cerrada contra `Roadmap septiembre 2026.txt`. El cierre histórico y la Definition of Done están en [phase-8.md](phase-8.md). Las fases posteriores autorizadas se registran arriba.

## Fase 7.5 — completada y aprobada

El usuario revisó y aprobó el Gate 7.5 el **2026-09-27**. Ese gate habilitó Fase 8 — Quick Add 2.0 sobre `TransactionModal`, conservando el compositor único. Los documentos siguientes preservan ese cierre histórico.

| Documento canónico | Función |
|---|---|
| [phase-7.5.md](phase-7.5.md) | Cierre completo y evidencia técnica registrada |
| [phase-7.5-gate.md](phase-7.5-gate.md) | Entregable formal de diez puntos y aprobación |
| [wireframes-phase-7.5.md](../ux/wireframes-phase-7.5.md) | Jerarquías vigentes de las seis superficies |

El contrato se desarrolla en [arquitectura UX](../ux/architecture.md) y [sistema de diseño](../ux/design-system.md). En Movimientos, el orden aprobado es **búsqueda → filtros → historial real → cuentas/tarjetas como gestión secundaria**.

El cierre histórico registraba 214/214 pruebas. La **revisión final contra `Roadmap septiembre 2026.txt`** añadió regresiones específicas para 7.5.17 y 7.5.19 y volvió a ejecutar el gate técnico: GitHub Actions `Quality checks` run 299 completó correctamente `npm run check` y `npm run build` antes del merge de cierre.

## Antecedentes históricos

[7.5A](phase-7.5a.md), [7.5B](phase-7.5b.md), [7.5C](phase-7.5c.md) y [7.5D](phase-7.5d.md) conservan la evolución y las pruebas de cada checkpoint. Sus pendientes o instrucciones de detenerse corresponden a esas iteraciones y no reabren el gate aprobado.

Los siguientes entregables de la primera implementación están **supersedidos y ausentes del árbol actual de main**:

- `phase-7-5-ux-architecture.md`
- `phase-7-5-validation.md`
- `phase-7-5-wireframes.html`
- `phase-7-5-summary.png`

No deben recrearse ni usarse como referencia canónica. Una copia local, captura o pestaña antigua puede mostrar otra jerarquía o el resultado anterior de 195 pruebas. Para la arquitectura vigente, utilizar los tres documentos canónicos enlazados arriba. El historial Git conserva los antecedentes que hayan sido versionados.
