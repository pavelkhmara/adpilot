export type RecId = string;

export async function applyRecommendation(id: RecId) {
  const res = await fetch('/api/recommendations/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function dismissRecommendation(id: RecId, reason?: string) {
  const res = await fetch('/api/recommendations/dismiss', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, reason }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function snoozeRecommendation(id: RecId, validUntilISO: string) {
  const res = await fetch('/api/recommendations/snooze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, validUntil: validUntilISO }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
