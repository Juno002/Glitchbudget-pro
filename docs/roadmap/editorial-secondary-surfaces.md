# Auditoría editorial — superficies secundarias de Prisma

Fecha: 2026-10-05

## Objetivo

Eliminar residuos del «efecto maqueta»: copy permanente que narra o explica controles cuyo significado ya está expresado por título, label, cifra, estado o acción.

## Regla aplicada

- **Imprescindible:** permanece visible si cambia una decisión, evita doble conteo, protege historial, explica una consecuencia destructiva o comunica un error/estado accionable.
- **Contextual:** se compacta o pasa a `ContextHelp`/`sr-only` cuando puede quedar bajo demanda.
- **Redundante:** se elimina cuando repite el propio control o una explicación ya disponible en la misma superficie.

## Cobertura del barrido

Se revisaron todas las superficies React visibles del producto, con énfasis en dialogs, details, popovers, empty states, formularios de gestión y paneles secundarios.

Superficies con cambios editoriales:

- Cuentas y Efectivo
- tarjetas y pagos
- presupuestos y reasignación
- metas y aportes
- inversiones
- registro rápido / ingreso retroactivo
- plantillas
- categorías
- detalle de movimientos

Superficies revisadas y deliberadamente preservadas:

- backups e importación/restauración;
- integridad de datos;
- bloqueo de aplicación y privacidad;
- confirmaciones destructivas;
- errores accionables;
- semántica de planificados/recurrentes que no es deducible del control;
- ayudas contextuales ya ocultas correctamente.

## Cambios de criterio relevantes

- `DialogDescription` que solo repetía el título/formulario pasó a `sr-only`.
- Explicaciones largas de saldo inicial/rebase se redujeron a restricción + cifras proyectadas.
- La ampliación retroactiva conserva visible la restricción de fecha y el campo `Saldo al inicio de esa fecha`, pero elimina la narración del proceso.
- Presupuestos elimina explicación obvia de «asignar límite» y reduce el caso de límite cero.
- Metas conserva que un aporte no mueve dinero, pero elimina instrucciones introductorias redundantes del formulario.
- Inversiones conserva la diferencia contable entre transferencia y saldo inicial en una línea, sin bloque narrativo.
- Pagos de tarjeta muestran deuda/saldo a favor y cuenta origen sin explicar varias veces el mismo efecto.
- Categorías mueve la preservación del historial a ayuda contextual.

## Invariantes no tocadas

- cero cambios de cálculos financieros;
- cero cambios de selectors/read models/commands;
- cero cambios de schema o migraciones;
- cero cambios de backup/persistencia;
- cero cambios de red;
- cero cambios de navegación principal.

## Regresión

`tests/editorial-secondary-surfaces.test.ts` protege dos cosas: que los textos redundantes retirados no reaparezcan y que sigan presentes las advertencias financieras/destructivas que sí son obligatorias.
