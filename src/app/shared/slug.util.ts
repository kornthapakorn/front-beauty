export function slugify(value: string, fallback = 'form'): string {
  const base = (value || '')
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const slug = base || fallback;
  const stamp = Date.now().toString(36).slice(-4);
  return `${slug}-${stamp}`;
}

export function sanitizeSlug(value: string): string {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}
