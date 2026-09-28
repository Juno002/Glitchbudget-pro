# Fase 8 — Quick Add 2.0

> **Registro histórico de fase.** Conserva versiones, resultados y restricciones del momento de su cierre. Para el estado acumulado hasta Fase 10, las continuaciones autorizadas y los pendientes vigentes, consulta el [índice del roadmap](README.md).

**Fuente de verdad:** `Roadmap septiembre 2026.txt`.

**Estado:** implementación completa en rama `phase-8-quick-add-2`; no se inicia Fase 9 desde este cierre.

## Alcance implementado

`TransactionModal` existente fue mejorado, no sustituido por otro compositor.

Flujo principal:

```text
Monto
→ Gasto / Ingreso / Transferencia
→ Cuenta
→ Categoría (cuando aplica)
→ Guardar
```

Valores comunes preseleccionados:

- Gasto como tipo inicial.
- Efectivo real como cuenta predeterminada cuando existe.
- Fecha actual.
- Naturaleza Variable.
- Método de pago Efectivo / banco.

Transferencia vive en el mismo compositor, exige origen y destino y nunca muestra categoría. Sigue usando `addAccountTransfer` / `saveTransfer`, por lo que no se convierte en ingreso o gasto.

## Progressive disclosure

La superficie principal conserva solo los campos necesarios para la captura cotidiana.

`Más detalles` contiene, según el tipo:

- fecha;
- concepto / descripción / nota;
- naturaleza del gasto;
- tipo de ingreso;
- método de pago;
- tarjeta cuando la compra es a crédito.

Los campos que no aplican no se muestran. Una compra con tarjeta no exige una cuenta bancaria de origen.

## Templates

Después de estabilizar el flujo se añadió **Guardar como plantilla**.

Las plantillas almacenan presets reutilizables para:

- monto;
- tipo;
- cuenta(s);
- categoría;
- concepto/nota;
- naturaleza/tipo de ingreso;
- método de pago/tarjeta cuando aplica.

La fecha no se congela en la plantilla: al aplicarla se usa la fecha actual.

Persistencia:

```text
localStorage
glitchbudget_quick_add_templates_v1
```

No se añadió tabla Dexie, schema ni migración. Las plantillas se eliminan también con **Borrar todos los datos**.

Limitación deliberada: las plantillas son configuración local del Quick Add y no forman parte todavía del backup JSON. Fase 8 no modifica el formato de backup.

## Invariantes preservadas

- Transferencia ≠ ingreso/gasto.
- Compra a crédito crea gasto y deuda; no descuenta una cuenta bancaria.
- Efectivo sigue siendo la cuenta predeterminada para movimientos cash/bank nuevos.
- Editar un movimiento existente reutiliza los servicios actuales y no crea otro movimiento.
- Guardar bloquea doble submit.
- Un error conserva lo escrito.
- Éxito aparece únicamente después de persistencia correcta.
- No se introdujo tráfico financiero de red.

## Definition of Done

Gate final previo al merge: GitHub Actions `Quality checks` run **322**.

```text
npm run check  ✓
  check:local  ✓
  typecheck    ✓
  lint         ✓
  tests        222/222
npm run build  ✓
static offline manifest: 42 resources
```

El suite existente verificó también compatibilidad de backups, round-trip y resultados financieros; entre otros, el fixture congelado v4 exporta, vacía la DB de prueba, importa y preserva todas las tablas y resultados financieros.

### Entrega obligatoria

1. **Files changed**
   - `src/components/dashboard/TransactionModal.tsx`
   - `src/contexts/finance-context.tsx`
   - `src/components/layout/settings-dialog.tsx`
   - `src/lib/quick-add-templates.ts`
   - `tests/phase-8-quick-add.test.ts`
   - `tests/phase-8-templates.test.ts`
   - ajuste de invariantes en `tests/phase-7.5-roadmap.test.ts`
   - este cierre documental.
2. **Schema changes:** ninguno.
3. **Migration behavior:** no hay migración nueva; Dexie conserva v11 y el backup su formato vigente.
4. **Invariants affected:** ninguna fórmula financiera. Se hizo explícita la selección real de Efectivo en el estado del Quick Add y se mantiene la semántica existente de transferencias y crédito.
5. **Tests added:** flujo/jerarquía de Quick Add, Transferencia sin categoría, preselección real de Efectivo, persistencia local/round-trip/corrupción/borrado de plantillas y limpieza con Borrar todos los datos.
6. **Known limitations:** las plantillas no se exportan en el backup JSON; permanecen en el navegador actual. No se implementaron saved filters ni rules.
7. **Architectural concerns:** `AccountSelect` aún lee Dexie directamente; no se amplió ese patrón. El roadmap reserva el cierre sistemático de accesos UI→DB para Fase 19.

## Fuera de alcance

No se inició:

- Budgets 2.0;
- Goals 2.0;
- Currency foundation;
- metadata avanzada;
- saved filters;
- rules;
- IA;
- sincronización/cloud.

**Resultado:** Fase 8 completada según `Roadmap septiembre 2026.txt`. Fase 9 queda como siguiente fase posible, pero no se inicia automáticamente.
