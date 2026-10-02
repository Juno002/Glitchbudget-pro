# Post-roadmap 5 — Mantenibilidad, pruebas y pulido

Estado técnico: **completado / Gate aprobado / listo para integración final**. Post-roadmap 4 ya está integrado en `main`.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

## C5 — acciones repetidas

Se añadió un helper local `runAction` en `FinanceProvider` para el patrón seguro:

```text
ejecutar acción
→ toast de éxito
→ true
o
→ friendlyError
→ toast destructivo específico
→ false
```

Se aplicó a acciones con semántica uniforme:

- crear/actualizar/eliminar tarjeta o deuda;
- registrar pago;
- crear/actualizar/eliminar regla planificada;
- omitir ocurrencia planificada.

No se aplicó a flujos con semántica especial, como confirmación de presupuesto o acciones con sonido, para no ocultar reglas de dominio.

Además:

- se eliminaron `catch (e: any)` del cluster refactorizado;
- `updateSetting` quedó tipado como `<K extends keyof Settings>(key: K, value: Settings[K])`;
- los mensajes genéricos `Error` del cluster se sustituyeron por títulos específicos.

## E1 / E3 — comportamiento sobre grep

Se extrajo la decisión de guardado de Quick Add a `src/domain/transaction-draft.ts`.

La suite ejecuta una matriz de comportamiento para:

- gasto efectivo/banco válido;
- ingreso válido;
- compra con tarjeta válida;
- tarjeta sin deuda seleccionada;
- transferencia válida;
- transferencia a la misma cuenta;
- falta de categoría;
- fecha inválida;
- monto inválido;
- estado guardando;
- formulario ya guardado.

Esto sustituye la necesidad de probar esa lógica mediante coincidencias de strings y deja el grep únicamente para contratos estructurales de wiring/accesibilidad.

No se introdujo jsdom/Testing Library/Playwright en esta intervención: el smoke E2E real existente sigue cubriendo navegador, y la nueva matriz cubre la decisión crítica como función pura.

## NativeSelect

Se creó `src/components/ui/native-select.tsx` para unificar controles `<select>` nativos sin sustituir su semántica HTML.

La primera migración cubre:

- Ajustes;
- Quick Add / edición de movimientos.

El componente centraliza:

- altura y radio;
- borde/superficie;
- tipografía;
- focus ring;
- estado disabled;
- sombra de control.

No se fuerza una migración masiva de todas las superficies para evitar churn sin valor funcional.

## Contraste

La auditoría cuantitativa detectó que en Modo Prisma claro:

```text
--muted-foreground: 150 5% 50%
sobre --background: 48 23% 95%
≈ 3.45:1
```

Eso no alcanza 4.5:1 para texto normal pequeño.

Se cambió únicamente el token claro a:

```text
--muted-foreground: 150 5% 42%
```

Ratios calculados:

- sobre background claro: ~4.64:1;
- sobre card claro: ~4.93:1.

Neón y Minimalista ya estaban por encima o alrededor del umbral relevante y no se alteraron.

## Decisiones deliberadas

### Must / Need / Want

Se conserva el lenguaje:

- Must · imprescindible;
- Need · necesario;
- Want · deseo.

Es una decisión de producto ya cubierta por el contrato visible-language, no un residuo accidental.

### Compatibility entrypoint

Se conserva `src/contexts/finance--context.tsx`.

El archivo sigue siendo un entrypoint explícito de compatibilidad y no debe borrarse por el doble guion mientras existan imports históricos posibles.

### Prettier

No se añade Prettier en este cierre.

Motivo:

- implicaría un commit de formato de gran superficie;
- aumentaría conflictos y ruido histórico;
- no corrige un bug ni una inconsistencia de runtime;
- la base ya tiene ESLint + TypeScript + tests como gates.

Si se adopta en el futuro debe hacerse como cambio aislado exclusivamente de formato.

## Validación

El commit técnico `6ef349d711109093423aff52ac4f31c736d4da54` pasó:

- `npm run check` ✅
- benchmark ledger ✅
- `npm run build` ✅
- `npm run test:e2e` ✅

## Datos e invariantes

Sin cambios en:

- schema Dexie;
- migraciones;
- formatos de backup;
- reglas financieras;
- red;
- PBKDF2;
- préstamos históricos.

## Gate técnico

**Aprobado.** Tras rebasar Post-roadmap 5 sobre `main` con Post-roadmap 4 ya integrado, el head `e50ae565e2599d7d1ba2100b79bf852f3acf0328` pasó el gate completo tanto por `push` (**Quality checks #2027**) como por `pull_request` (**#2028**): `npm run check`, benchmark del ledger, `npm run build` y `npm run test:e2e` en verde. La rama queda lista para la integración final.
