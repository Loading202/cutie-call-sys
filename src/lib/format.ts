// Phone helpers for synthetic-email auth (login by phone + password).
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

export function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@cliente.barbearia.local`;
}

export function formatPhoneBR(input: string): string {
  const d = normalizePhone(input).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function currency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
