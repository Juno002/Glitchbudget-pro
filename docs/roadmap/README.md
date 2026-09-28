# Roadmap: estado y documentación vigente

Actualizado el **28/09/2026**. Las fases **0–10, incluida 7.5, están implementadas e integradas en main**. Último cierre funcional: `60b50e9`, [PR #6](https://github.com/Juno002/Glitchbudget-pro/pull/6). La siguiente fase prevista es 11; actualizar documentación no la inicia.

## Cómo leer los informes

Este índice describe el estado acumulado. Cada informe conserva el alcance, decisiones, versiones y evidencia de su momento. Frases como «no iniciar la siguiente fase», «main congelado» o «pendiente de fase X» son históricas cuando esa fase ya figura completada aquí. Las autorizaciones posteriores permitieron continuar; los resultados antiguos no se atribuyen al código actual.

El [roadmap original](../../Roadmap%20septiembre%202026.txt) define el alcance; los informes documentan su ejecución. «Completada» significa cierre del alcance implementado, no certificación comercial ni sustitución del QA físico.

## Fases implementadas

| Fase | Entrega completada | Informe canónico |
| --- | --- | --- |
| 0 | Línea base, invariantes, fixtures y recuperación. | [Fase 0](phase-0.md) |
| 1 | Distribución estática, retirada de IA remota, CSP, local-only y precaché. | [Fase 1](phase-1.md) |
| 2 | Dominio puro para ledger, posición y métricas; adaptadores históricos. | [Fase 2](phase-2.md) |
| 3 | Dinero registrado; protección de cuentas separada del exceso presupuestario. | [Fase 3](phase-3.md) |
| 4 | Categorías con IDs estables, migración y archivo/reactivación. | [Fase 4](phase-4.md) |
| 5 | Movimientos reales separados de reglas planificadas; naturaleza distinta de frecuencia. | [Fase 5](phase-5.md) |
| 6 | Period Engine, día inicial configurable y métricas por fechas reales. | [Fase 6](phase-6.md) |
| 7 | Ocurrencias, scheduler idempotente y confirmación atómica. | [Fase 7](phase-7.md) |
| 7.5 | Arquitectura UX y 13 patrones visuales; Gate aprobado el 27/09. | [Fase 7.5](phase-7.5.md) · [Gate](phase-7.5-gate.md) |
| 8 | Compositor único Quick Add, detalles progresivos y plantillas locales. | [Fase 8](phase-8.md) |
| 9 | Presupuestos semanales/mensuales/anuales/únicos, métricas, rollover y reasignación neutral. | [Fase 9](phase-9.md) |
| 10 | Metas derivadas de aportes, plazos por Period Engine y migración sin doble conteo. | [Fase 10](phase-10.md) |

### Subfases y antecedentes

- Fase 2: [inventario previo](phase-2-review.md), supersedido en estado por el cierre de Fase 2.
- Fase 7: [7A — modelo](phase-7a.md), [7B — scheduler](phase-7b.md), [7C — lifecycle](phase-7c.md), [7D — integración](phase-7d.md).
- Fase 7.5: [7.5A](phase-7.5a.md), [7.5B](phase-7.5b.md), [7.5C](phase-7.5c.md), [7.5D](phase-7.5d.md). Sus pendientes corresponden a cada checkpoint; el gate final prevalece.
- UX: [arquitectura](../ux/architecture.md), [sistema visual](../ux/design-system.md) y [wireframes canónicos](../ux/wireframes-phase-7.5.md).

Movimientos conserva **búsqueda → filtros → historial real → cuentas/tarjetas como gestión secundaria**. Resumen prioriza posición y acciones; el análisis detallado vive en Reportes.

Los primeros documentos `phase-7-5-ux-architecture.md`, `phase-7-5-validation.md`, `phase-7-5-wireframes.html` y `phase-7-5-summary.png` están supersedidos y ausentes del árbol actual. No deben recrearse como otra arquitectura válida; Git conserva su historia.

## Evolución de persistencia

| Cierre | Dexie | JSON | Cambio |
| --- | --- | --- | --- |
| 0–3 | v8 | v4 | Base financiera, dominio y políticas sin cambio de stores. |
| 4 | v9 | v5 | Categorías estables. |
| 5–6 | v10 | v6 | Actual/Planned y calendario financiero. |
| 7–9, incluida 7.5 | v11 | v7 | Ocurrencias, UX y rangos presupuestarios compatibles. |
| 10 — vigente | **v12** | **v8** | Progreso de metas representado solo mediante aportes. |

JSON v8 admite respaldos v3–v7. Los fixtures Dexie v6/v7 siguen siendo regresiones históricas, no el esquema actual. El saldo heredado de una meta se conserva sin crear una reserva mensual nueva. Un CSV antiguo parcial que podría duplicar progreso se rechaza indicando usar el JSON completo.

El JSON financiero no incluye plantillas Quick Add de localStorage ni copia íntegramente preferencias/logros externos a Dexie o archivos OPFS. Backup 2.0 corresponde a Fase 18.

## Última evidencia integrada

Cierre funcional de Fases 9 y 10, 28/09/2026:

- **259/259 pruebas**, tipos, lint y guard local-only aprobados.
- Build estático correcto, **44 recursos de precaché**, CSP `connect-src 'none'`.
- [GitHub Actions Quality checks #346](https://github.com/Juno002/Glitchbudget-pro/actions/runs/36432350509) aprobado antes del merge del [PR #6](https://github.com/Juno002/Glitchbudget-pro/pull/6).
- QA sintético: ingresos 1,200 menos gastos 330 = liquidez 870; aportar 100 a una meta no cambia esa liquidez. Plan y Resumen coinciden: progreso 10%, restante 900 y aporte requerido 225.
- Navegación móvil a 360 px, barra y porcentaje accesible, actualización del service worker conservando datos y recarga con servidor apagado verificadas.

Los conteos y versiones de informes anteriores corresponden a sus respectivos cortes, no al total integrado de 259. El detalle y límites de cada recorrido se conservan en su informe.

## Pendientes de publicación

Sigue pendiente la matriz física de dispositivos/navegadores objetivo: teclado Android/iOS, instalación y actualización PWA, recuperación de archivos en móvil, lector de pantalla, zoom y contraste completo. Ver [checklist de release](../release-checklist.md). La [revisión comercial del 17/09](../quality-review.md) es histórica y no reemplaza la evidencia posterior.

## Fases futuras — no iniciadas

| Fase | Alcance previsto |
| --- | --- |
| 11 | Currency foundation. |
| 12 | Investments 1.0. |
| 13 | Reports 2.0. |
| 14 | Home 2.0. |
| 15 | Transaction Metadata y filtros. |
| 16 | Automatización local. |
| 17 | Seguridad y privacidad local. |
| 18 | Backup 2.0 y migraciones permanentes. |
| 19 | Cierre de deuda técnica. |

No se consideran completadas porque existan controles básicos relacionados. Su ejecución requiere el alcance y gates del roadmap; este cierre documental no las implementa.
