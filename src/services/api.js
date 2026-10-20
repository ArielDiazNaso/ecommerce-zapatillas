/**
 * Cliente HTTP centralizado para comunicación con el backend Express / Serverless API.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('stride_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error HTTP ${response.status}`);
  }
  return data;
}

/**
 * Formatea valores numéricos a moneda Pesos Argentinos (ARS).
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(Number(amount || 0));
}
