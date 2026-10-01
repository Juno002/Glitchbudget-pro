declare const centsBrand: unique symbol;

/** Integer amount in the smallest persisted currency unit (centavos today). */
export type Cents = number & { readonly [centsBrand]: 'Cents' };

export function asCents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new Error('El importe en centavos debe ser un entero seguro.');
  }
  return value as Cents;
}
