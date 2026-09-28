# Fase 7.5D — Estados, privacidad, responsive y accesibilidad

> **Registro histórico de fase.** Conserva versiones, resultados y restricciones del momento de su cierre. Para el estado acumulado hasta Fase 10, las continuaciones autorizadas y los pendientes vigentes, consulta el [índice del roadmap](README.md).

> **Checkpoint histórico, supersedido por el cierre de Fase 7.5.** Sus alcances, pendientes, instrucciones de parada y pruebas describen esta iteración. Consulta el [cierre canónico](phase-7.5.md), el [Gate aprobado](phase-7.5-gate.md) y los [wireframes vigentes](../ux/wireframes-phase-7.5.md).

Fecha: 2026-09-27. Rama: `phase-7.5-ux-architecture`. Base: 7.5C cerrada en `9e7d4f7`.

## Alcance

7.5D cierra la arquitectura UX con cuatro objetivos:

1. estados visuales/textuales consistentes;
2. Hide Balances global como preferencia local de presentación;
3. responsive/touch targets;
4. accesibilidad y consistencia final.

No cambia el dominio financiero, Dexie, backups ni reglas de negocio.

## Hide Balances

Se añade:

```text
src/contexts/balance-visibility-context.tsx
src/components/layout/balance-visibility-toggle.tsx
```

La preferencia:

```text
glitchbudget_balances_hidden_v1
```

vive exclusivamente en `localStorage`.

No entra en:

- Settings de Dexie;
- backup JSON;
- métricas;
- ledger;
- sincronización alguna.

Semántica:

- botón rápido con ojo en el Header;
- control equivalente en Ajustes → Privacidad;
- se conserva en el navegador actual;
- se sincroniza entre pestañas mediante el evento `storage`;
- no cifra ni elimina datos: es una protección visual contra exposición casual.

Al activarse, las superficies financieras principales dejan de mostrar cantidades exactas y usan `••••••`.

Se evita el flash inicial de cifras cuando la preferencia ya estaba activa: el layout lee únicamente la preferencia visual antes de hidratar y mantiene la superficie financiera oculta hasta que el contexto está listo.

Los campos de entrada que el usuario está editando siguen mostrando el valor introducido; Hide Balances protege lectura/presentación, no impide escribir una cantidad.

## Cobertura de importes

Los readouts principales utilizan ahora `MoneyValue` o `usePrivateCurrency`.

Cobertura incluida:

- Resumen;
- BudgetStatus;
- Historial de Movimientos;
- cuentas;
- tarjetas;
- Plan → Presupuestos;
- Plan → Metas;
- Plan → Planificados;
- Reportes;
- gráfico de resultado;
- donut legacy;
- transferencias entre presupuestos;
- tabla de transacciones legacy.

`MoneyValue` obedece automáticamente al estado global.

## Planned Payments — estados

`Plan → Planificados` muestra estados mediante `StatusBadge`, siempre con texto además de color.

```text
pending   → Pendiente
overdue   → Vencido
confirmed → Confirmado
skipped   → Omitido
```

La cola accionable continúa mostrando pending/overdue.

Se añade una sección secundaria:

```text
Actividad planificada reciente
```

con las últimas ocurrencias confirmed/skipped. No crea un nuevo historial financiero ni duplica el ledger.

Las reglas muestran también:

```text
Activa
Pausada
```

como estado textual.

## Reportes

Los estados de presupuesto dejan de mostrar códigos internos como `ok/alert/over`.

Se normalizan a:

```text
En presupuesto
Cerca del límite
Excedido
Sin presupuesto
```

en móvil y escritorio mediante el mismo primitive.

## Accesibilidad

### Navegación por teclado

`AppShell` incluye:

```text
Saltar al contenido
```

y un target de foco explícito en `main`.

El FAB y la navegación inferior tienen focus rings visibles.

### Touch targets

Se amplían targets móviles en:

- Bottom Navigation;
- Confirmar/Omitir planificados;
- Añadir regla;
- acciones de metas;
- cards de cuenta.

### Estados dinámicos

- contador de planificados pendientes usa `aria-live="polite"`;
- autosave de presupuesto anuncia “Guardando presupuesto” / “Presupuesto guardado” sin depender del icono;
- botones de Hide Balances exponen `aria-pressed` y etiquetas “Mostrar/Ocultar importes”.

### Reduced motion

El contrato existente:

```tsx
<MotionConfig reducedMotion="user">
```

se conserva como política global. 7.5D no introduce animaciones que ignoren esa preferencia.

## Responsive

Ajustes específicos:

- formularios de planificados pasan de dos columnas forzadas a una columna en móvil y dos desde `sm`;
- formulario de metas equivalente;
- métricas de cuentas apilan en pantallas estrechas;
- filtro de categoría de Movimientos usa ancho completo en móvil;
- Bottom Navigation conserva cuatro destinos con targets mínimos mayores;
- FAB mantiene distancia respecto a safe-area y Bottom Navigation.

No se cambia el significado de una pantalla según viewport.

## Destructivos

Ajustes mantiene la zona:

```text
Zona destructiva
```

separada de preferencias comunes.

Borrar todos los datos sigue requiriendo `AlertDialog`.

No se convirtió ninguna acción destructiva en un botón directo.

## Guards nuevos

`tests/ux-accessibility.test.ts` comprueba:

- Hide Balances como estado local y sin Dexie/network;
- Settings + Header conectados al control de privacidad;
- superficies monetarias principales sin bypass directo de `formatCurrency`;
- Planned Payments con StatusBadge y estados recientes;
- skip link/focus target;
- touch/focus en Bottom Navigation;
- zona destructiva separada.

Los guards de 7.5A–C permanecen activos.

## Persistencia

Sin cambios:

```text
Dexie v11
Backup JSON v7
```

La preferencia de ocultar importes no forma parte del backup por ser presentación local del dispositivo.

## Gate técnico

GitHub Actions sobre `4b111f4`:

- `npm run check`: aprobado;
- **205 pruebas aprobadas, 0 fallidas**;
- TypeScript: aprobado;
- ESLint: aprobado con 0 warnings;
- guard local-only: aprobado;
- `npm run build`: aprobado;
- exportación estática: aprobada;
- manifiesto offline: 42 recursos.

Los warnings del runner sobre Node/Actions son deprecaciones externas y no fallos de GlitchBudget.

## Límites de evidencia

El gate automático cubre tipos, lint, invariantes, build, local-only y contratos UX por código.

No se realizó en este gate una auditoría visual manual en un teléfono físico ni una auditoría completa con lector de pantalla. Esos controles siguen siendo recomendables antes de una release pública.

## Nota posterior de revisión

Este documento conserva el checkpoint técnico de la iteración 7.5D. Después de revisar literalmente `Roadmap septiembre 2026.txt`, el gate de Fase 7.5 continuó con los patrones base faltantes, wireframes estructurales, jerarquía completa de Resumen, Movimientos history-first, compositor global Gasto/Ingreso/Transferencia y el entregable exacto de 10 puntos.

El cierre vigente está en:

```text
docs/roadmap/phase-7.5.md
docs/roadmap/phase-7.5-gate.md
```

La revisión pendiente en este checkpoint ya se completó: el usuario aprobó el [Gate 7.5](phase-7.5-gate.md) el 2026-09-27.
