/** Formato moneda chilena. Retorna "Gratuito" si el valor es 0. */
export const formatCLP = (n: number): string =>
  n === 0
    ? 'Gratuito'
    : n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

/**
 * Fecha larga en español (ej: "26 de abril de 2026").
 * Para dates sin hora (events: "2026-04-26"), agrega T12:00:00 para evitar desfase de zona.
 * Para datetimes completos (blog: "2026-03-29T00:00:00Z"), usa el valor tal cual.
 */
export const formatDateLong = (s: string): string =>
  new Date(s.includes('T') ? s : s + 'T12:00:00').toLocaleDateString('es-CL', { dateStyle: 'long' });

/** Fecha media en español (ej: "26 abr 2026"). Misma lógica de detección que formatDateLong. */
export const formatDateMedium = (s: string): string =>
  new Date(s.includes('T') ? s : s + 'T12:00:00').toLocaleDateString('es-CL', { dateStyle: 'medium' });

/** Etiqueta legible para el campo proxyesAllowed. */
export const proxyLabel = (v: string): string =>
  v === 'si' ? 'Sí' : v === 'no' ? 'No' : 'Por confirmar';

/** Primera letra en mayúscula. */
export const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

/** Nombres de meses en español (índice 1-12). */
export const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;
