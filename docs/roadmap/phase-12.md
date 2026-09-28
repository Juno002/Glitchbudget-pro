# Fase 12 — Investments 1.0

Fuente de verdad: `Roadmap septiembre 2026.txt`, Fase 12.

Estado: **completada técnicamente**.

## Objetivo

Representar certificados, depósitos a plazo e inversiones de rendimiento conocido como **activos patrimoniales no líquidos**, nunca como gastos.

La regla central es:

```text
Banco -50,000
Inversión +50,000
Patrimonio neto sin cambio
```

El rendimiento futuro es una proyección local y no aumenta el patrimonio real hasta que exista una operación real en una fase posterior.

## Modelo

### Account

Fase 12 extiende el tipo de cuenta:

```ts
type: 'cash' | 'bank' | 'investment'
```

Una cuenta `investment` participa en patrimonio, pero no en `liquidAssets`.

### Investment

Entidad persistente:

```ts
Investment {
  id
  accountId
  type
  name
  institution?
  openedAt
  maturityDate?
  principal
  annualRate?
  compoundingMethod?
  notes?
  status
}
```

Tipos admitidos:

- `certificate` — certificado financiero;
- `term_deposit` — depósito a plazo;
- `known_yield` — inversión con rendimiento conocido.

Métodos de capitalización admitidos para la proyección:

- simple / al vencimiento;
- mensual;
- trimestral;
- anual.

No existe API de mercado ni descarga de tasas.

## Existing vs New investment

### Ya la tenía al empezar a usar GlitchBudget

- la cuenta de inversión inicia en la fecha actual de seguimiento;
- `openingBalance = currentTrackedValue`;
- el principal contractual se guarda por separado;
- no se crea ingreso;
- no se crea transferencia.

Esto evita contar como ingreso un activo que ya existía.

### La acabo de abrir usando dinero registrado

- `openingBalance = 0`;
- se crea una transferencia real desde una cuenta líquida registrada hacia la cuenta de inversión;
- el monto transferido es el principal;
- no se crea gasto ni ingreso;
- la operación completa es transaccional: si falla la protección de saldo, no queda ni inversión, ni cuenta, ni transferencia parcial.

Las transferencias genéricas hacia/desde cuentas de inversión quedan bloqueadas. Investments 1.0 controla la apertura; retiro, vencimiento y renovación pertenecen a Investments 1.1.

## Posición financiera

`selectPosition` separa:

```text
liquidAssets     = cash + bank
investmentAssets = investment accounts
netWorth          = liquidAssets + investmentAssets + cardPositiveBalance - liabilities
```

Por tanto una apertura Banco → Inversión conserva el patrimonio neto.

La UI muestra por separado **Disponible líquido** e **Inversiones registradas**.

## Proyecciones

`investmentProjection()` es una función de dominio pura: recibe una inversión y una fecha explícita; no lee reloj, navegador ni persistencia.

Muestra:

- Principal;
- Tasa;
- Fecha de apertura;
- Vencimiento;
- Tiempo transcurrido %;
- Días restantes;
- Valor estimado al vencimiento;
- Interés estimado.

Las proyecciones usan exclusivamente los datos introducidos por el usuario. El cálculo se hace localmente.

**Invariante:** `estimatedMaturityValue` y `estimatedInterest` nunca entran en `accountBalance`, `liquidAssets` ni `netWorth`.

## Límites de Investments 1.0

Una cuenta de inversión:

- no aparece en los selectores operativos de ingresos, gastos o pagos de tarjeta;
- no puede financiar gastos o pagos;
- no recibe ingresos operativos;
- no puede ser origen de una transferencia genérica;
- no recibe aportes adicionales por la transferencia genérica.

Esto evita implementar accidentalmente funciones reservadas a Investments 1.1.

## Persistencia

### Dexie

Esquema actual: **v14**.

v14 añade:

```text
investments: id, &accountId, type, status, maturityDate
```

La migración desde v13 solo crea el store vacío; no reescribe cuentas, movimientos ni saldos existentes.

### Backup JSON

Contrato canónico actual: **JSON v10**.

v10 añade:

- cuentas `type: investment`;
- colección `investments`;
- relación 1:1 entre `Investment.accountId` y la cuenta de inversión.

Se mantiene lectura de JSON v3–v9. Los backups v9 y anteriores importan con `investments: []`.

Validaciones v10:

- una inversión debe apuntar a una cuenta `investment`;
- una cuenta `investment` debe tener metadatos de inversión;
- no puede haber dos inversiones para la misma cuenta;
- un movimiento operativo no puede usar una cuenta de inversión;
- una transferencia no puede salir de una inversión en Investments 1.0;
- la moneda sigue obedeciendo el contrato de Fase 11.

La restauración continúa siendo atómica.

## UI

Investments 1.0 vive como destino secundario dentro de **Movimientos**, después de Cuentas y tarjetas. No se crea una quinta pestaña primaria.

El formulario distingue explícitamente:

- “Ya la tenía”;
- “La acabo de abrir”.

Cada inversión muestra el valor registrado real y, en un bloque visual separado, la proyección marcada:

```text
ESTIMADO · no forma parte del patrimonio real
```

## Pruebas

`tests/phase-12-investments.test.ts` cubre:

- proyección local determinista;
- apertura nueva mediante transferencia patrimonial;
- conservación del patrimonio;
- inversión preexistente mediante saldo inicial;
- exclusión de interés estimado del patrimonio real;
- rollback atómico por fondos insuficientes;
- bloqueo del ciclo genérico de transferencias;
- migración Dexie v13 → v14;
- backup JSON v10 y compatibilidad v9;
- rechazo atómico de cuentas de inversión huérfanas;
- presencia de todos los campos UX exigidos por el roadmap y etiqueta ESTIMADO.

## Gate técnico

GitHub Actions `Quality checks` run `36454064247` verificó:

- **278/278 pruebas**, 0 fallos;
- typecheck: aprobado;
- lint con cero warnings: aprobado;
- guard local-only: aprobado;
- build de producción: aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

No se utilizaron datos financieros reales del navegador habitual del usuario.

## Fuera de alcance

Reservado para Investments 1.1 o fases posteriores:

- valor introducido manualmente después de la apertura;
- historial de valoraciones;
- renovación;
- vencimiento como operación;
- retiro;
- interés realmente acreditado;
- APIs de mercado.

**Fase 13 — Reports 2.0 no se inicia automáticamente.**
