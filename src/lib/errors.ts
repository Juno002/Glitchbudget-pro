import { ZodError } from 'zod';

export function friendlyError(e: unknown, fallback='Operación fallida'){
  if (e instanceof ZodError) {
    const issue = e.issues[0];
    return `Revisa los datos${issue?.path.length ? ` (${issue.path.join('.')})` : ''}: ${issue?.message || fallback}`;
  }
  if (e instanceof DOMException) {
    if (e.name === 'QuotaExceededError') {
      return 'No hay suficiente espacio de almacenamiento en el navegador. Intenta borrar datos de otros sitios.';
    }
     if (e.name === 'VersionError') {
      return 'El formato de la base de datos se actualizó. Por favor, recarga la página.';
    }
    return e.message || fallback;
  }
  if (e instanceof Error) {
     if (e.message.includes('decryption') || e.message.includes('decipher')) {
      return 'La contraseña es incorrecta o el archivo está dañado.';
    }
    return e.message;
  }
  if (typeof e === 'string') return e;
  return fallback;
}
