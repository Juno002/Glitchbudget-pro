# Fase 7.5 — Prototipos estructurales

Estos wireframes son deliberadamente estructurales. No son pixel-perfect y no introducen lógica financiera nueva.

## 1. Resumen

### Mobile

```text
┌ GlitchBudget · período · 👁 · ⚙ ┐
│                                  │
│ Resumen                          │
│                                  │
│ Posición financiera              │
│ [Disponible]                     │
│ [Deuda]                          │
│ [Patrimonio neto]                │
│                                  │
│ Presupuesto disponible           │
│ [Restante / progreso]            │
│                                  │
│ Próximos pagos          [Ver Plan]│
│ [Planificado · Pending/Overdue]  │
│                                  │
│ Metas relevantes       [Ver metas]│
│ [Meta / progreso]                │
│                                  │
│ Movimientos recientes  [Ver todos]│
│ [TransactionRow]                 │
│ [TransactionRow]                 │
│                                  │
│ Preferencia ahorro sugerido      │
└────────── [ + ] ─────────────────┘
   Resumen Movimientos Plan Reportes
```

Primero: estado financiero y lo que requiere atención.  
Secundario: preferencias de planificación.  
Oculto: análisis profundo; vive en Reportes.

### Desktop

Mismo orden conceptual. Las métricas pueden ir en grid de 3; Upcoming/Metas pueden aprovechar dos columnas cuando no altere el orden de lectura.

## 2. Quick Add

Patrón estructural previo a Fase 8.

```text
┌ Nuevo movimiento ────────────────┐
│             RD$ 0.00             │
│                                  │
│ [ Gasto | Ingreso | Transferencia ]│
│                                  │
│ Cuenta                           │
│ Categoría       (si aplica)      │
│                                  │
│ [ Guardar ]                      │
│                                  │
│ ▸ Más detalles                   │
│   Fecha                          │
│   Nota                           │
│   Naturaleza        (gasto)      │
│   Método de pago    (gasto)      │
│   Tarjeta           (crédito)    │
│   Recurrencia       (futuro)     │
└──────────────────────────────────┘
```

Reglas:
- Transferencia: origen + destino; sin categoría.
- Compra con tarjeta: tarjeta; sin cuenta bancaria de origen.
- Mismo compositor desde cualquier área.
- TransactionModal existente es la base; Fase 8 lo mejora, no lo reconstruye.

## 3. Movimientos

### Mobile

```text
Movimientos

Buscar…
[Todos] [Ingresos] [Gastos] [Otros]
[Categoría] [Período]

Historial
[TransactionRow]
[TransactionRow]
[TransactionRow]

──────────────────────────────────
Cuentas y tarjetas     (secundario)
[resumen / gestionar]
```

La actividad real aparece antes que administración de cuentas.  
“Cuentas y tarjetas” no bloquea la consulta del historial.

### Desktop

```text
Movimientos
Buscar / filtros

┌ Historial ───────────────────────┐
│ TransactionRow                  │
│ TransactionRow                  │
└─────────────────────────────────┘

Cuentas y tarjetas
[acceso secundario / detalle]
```

Master/detail puede aparecer posteriormente si mejora Account Detail, sin convertir Cuentas en quinta navegación primaria.

## 4. Plan

```text
Plan · período

[ Presupuestos | Metas | Planificados ]

Presupuestos:
  límite / gastado / restante

Metas:
  objetivo / progreso / aporte

Planificados:
  Upcoming
    [PlannedPaymentRow · Pending]
    [PlannedPaymentRow · Overdue]
  Actividad reciente
    [Confirmed → Ver movimiento]
    [Skipped]
  Reglas recurrentes
```

Realizado y planificado permanecen separados.

## 5. Account Detail

```text
Qik
Cuenta bancaria

RD$ 24,350
+ cambio del período (cuando exista selector)

[Transferir]        [⋯]

Movimientos recientes
[TransactionRow]
[TransactionRow]

⋯ Más
  Editar cuenta
  Conciliar
  Ajustar saldo inicial
  Archivar (cuando exista)
```

View mode primero.  
Management mode detrás de acciones explícitas.

## 6. Settings

```text
Ajustes

[General]
  Moneda base
  Inicio del período

[Finanzas]
  Ingreso previsto
  Rollover
  Evitar saldo negativo
  Exceso presupuesto

[Categorías]
  Gastos
  Ingresos

[Privacidad y seguridad]
  Ocultar importes
  Bloqueo aplicación (F17)
  Auto-lock (F17)

[Datos y backups]
  Exportar
  Importar
  Backups
  ─────────────────
  Zona destructiva

[Apariencia]
  Neón oscuro / Claro / Minimalista

[Acerca de]
  Ayuda / privacidad
```

## Evaluación por taps/interacciones

### Registrar gasto cotidiano

```text
FAB +
→ monto
→ tipo/cuenta/categoría si hace falta
→ Guardar
```

Objetivo: no navegar primero a Movimientos.

### Consultar saldo de una cuenta

```text
Resumen
→ posición / acceso a cuentas
→ cuenta
```

La arquitectura permite llegar en pocas interacciones sin crear una pestaña principal nueva.

### Confirmar pago planificado

```text
Resumen
→ Confirmar
```

o:

```text
Plan → Planificados → Confirmar
```

No se reintroducen monto/categoría/regla.

### Ver por qué cambió el dinero

```text
Movimientos
→ cuenta / movimiento
→ historial
```

No requiere Reportes.

## Comportamiento responsive

Mobile:
- una columna;
- cuatro destinos inferiores;
- FAB persistente;
- acciones secundarias debajo del contenido principal;
- formularios se apilan.

Desktop:
- mismas etiquetas/orden;
- grids para métricas y análisis;
- master/detail solo si reduce navegación;
- ninguna funcionalidad exclusiva por viewport.

## No copiar de Wallet

No incorporar:
- dashboard gigante configurable por defecto;
- bank sync UX;
- cloud account flows;
- Premium upsells;
- recibos/warranties/loyalty;
- location metadata;
- market feeds;
- formularios gigantes de metadata.

Sí conservar como principios:
- amount-first;
- progressive disclosure;
- planned → confirmed;
- remaining budget;
- actionable goals;
- controles de período útiles;
- reportes profundos.
