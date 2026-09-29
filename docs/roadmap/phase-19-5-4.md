# Fase 19.5.4 — finance-context como fachada + hardening

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 19.5.

Plan de ejecución: [phase-19-5.md](phase-19-5.md).

Estado: **completado**.

## Objetivo

Cumplir los requisitos canónicos 19.5.5 y 19.5.6 antes del barrido final:

```text
finance-context = composición / exposición / coordinación de interacción
domain + policies = React-free
services / queries financieros = React-free
```

No se añaden features.

## Auditoría de `finance-context.tsx`

Después de 19.5.3 se revisó cada callback del context.

Se consideran responsabilidades válidas de fachada:

- suscripción React a datos ya resueltos;
- exposición de commands y selectors;
- `toast` y mensajes de error;
- sonidos/feedback de interacción;
- diálogo de confirmación de exceso de presupuesto;
- coordinación del período actualmente visible;
- adaptación de inputs de formulario a centavos mediante el helper compartido `toCents`;
- estado de backup/import y preferencias visuales;
- aplicación de clases/metadata del tema en DOM.

Ninguna de estas responsabilidades define una fórmula financiera.

## Residuos extraídos

### Validación de settings financieros

Salieron del context:

```text
periodStartDay ∈ 1..31
baseIncome -> cents
baseIncome safe/nonnegative
```

Ahora pertenecen a:

```text
src/lib/settings-service.ts
  savePeriodStartDay()
  saveBaseIncomeInput()
```

El context únicamente invoca esos commands y muestra su resultado/error.

### Aportes a metas

El context dejó de validar manualmente:

```text
Number.isSafeInteger(amountInCents)
amountInCents > 0
```

La validación canónica ya existía en `recordGoalContribution()` / `goal-service.ts`; 19.5.4 elimina la duplicación React.

### Read model de settings

Se detectó durante el hardening un residuo adicional:

```text
baseIncome.amount = Math.max(0, Number(...))
normalizeFinancialPolicies(...)
```

vivía dentro de un `useMemo` del context.

Se extrajo a:

```text
src/lib/settings-read-model.ts
  DEFAULT_SETTINGS
  resolveSettings()
```

El read model es React-free y devuelve `Settings & FinancialPolicies`, conservando explícitamente las garantías de políticas normalizadas.

## Imports residuales eliminados

`finance-context.tsx` dejó de importar helpers financieros que ya no usaba:

```text
requireCategory
selectBudgetRemaining
monthlyAmount
normalizeFinancialPolicies
```

## Hardening automático

### ESLint

`.eslintrc.json` añade una frontera permanente para:

```text
src/domain/**
src/policies/**
```

Esos módulos no pueden importar:

- `react`;
- `react-dom`;
- `dexie-react-hooks`;
- `@/components/*`;
- `@/hooks/*`;
- `@/contexts/*`;
- `@/app/*`.

Los guards previos contra Dexie en components/app/hooks/contexts permanecen activos.

### Tests de arquitectura

`tests/phase-19-5-4-architecture-boundary.test.ts` verifica:

- dominio y policies React-free;
- application services financieros React-free;
- finance query layer React-free;
- `finance-context` sin `db.*`, Dexie, `.reduce()`, validaciones monetarias canónicas ni fórmulas residuales auditadas;
- validación de settings alojada en el service;
- ESLint configurado para impedir dependencias UI desde dominio.

`tests/phase-19-5-4-settings-boundary.test.ts` verifica:

- `finance-context` delega a `resolveSettings()`;
- normalización de settings no vive en React;
- `settings-read-model.ts` permanece React-free.

## Files changed

```text
.eslintrc.json
src/contexts/finance-context.tsx
src/lib/settings-service.ts
src/lib/settings-read-model.ts
tests/phase-19-5-4-architecture-boundary.test.ts
tests/phase-19-5-4-settings-boundary.test.ts
docs/roadmap/phase-19-5-4.md
docs/roadmap/phase-19-5.md
docs/roadmap/README.md
```

## Schema changes

Ninguno.

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

## Migration behavior

No existe migración nueva.

No se modifica ni reinterpreta información persistida.

## Invariants affected

Ninguna invariante financiera cambia.

La validación movida conserva los mismos límites y la normalización de settings conserva el mismo resultado.

## Gate técnico

El código final previo a documentación pasó:

```text
Quality checks #36607016647
npm run check ✅
npm run build ✅
```

Durante el hardening, TypeScript detectó que el primer tipo de `resolveSettings()` perdía la obligatoriedad estática de las políticas normalizadas. Se corrigió declarando el read model como `Settings & FinancialPolicies`; no se relajó ningún guard.

## Excepciones deliberadas

Permanecen en React porque son coordinación/presentación, no semántica financiera:

- `useLiveQuery` únicamente en los dos adapters autorizados por 19.5.2;
- feedback mediante toast/sonidos;
- confirmación interactiva de `BudgetWarning`;
- aplicación del tema al DOM;
- `toCents` como adaptación de unidad en entradas de formulario antes de invocar commands que vuelven a validar el monto.

Ninguna excepción contiene acceso directo a Dexie ni una fórmula financiera canónica.

## Known limitations / architectural concern

`finance-context.tsx` sigue siendo un archivo grande porque conserva una API pública amplia y centraliza muchos adaptadores de interacción. **El tamaño es deuda organizativa, no una dependencia del motor financiero**: persistencia, validación canónica, read models y fórmulas están fuera de React.

No se fragmenta artificialmente en 19.5.4 porque hacerlo no mejora el Prisma Engine Gate y aumentaría riesgo de regresión antes del cierre.

19.5.5 debe volver a auditarlo desde cero junto con el resto de las superficies.

## Resultado

Después de 19.5.4:

```text
React context
→ compone estado
→ expone commands/selectors
→ coordina feedback/interacción

Domain / policies / financial services / query layer
→ reutilizables sin React
```

La siguiente ejecución es **19.5.5 — barrido final + Prisma Engine Gate**. No iniciar automáticamente sin autorización del usuario.
