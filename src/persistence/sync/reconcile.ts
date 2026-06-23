/**
 * Deep-reconcile a plain JS `target` into an Automerge `draft` (the mutable
 * proxy handed to `Automerge.change`). The store keeps editing plain objects;
 * this is the only place plain state is translated into granular Automerge
 * mutations, which is what makes cross-device merge lossless. See ADR 0013.
 *
 * Strategy:
 * - Objects: upsert each key present in target; delete keys target dropped.
 * - Arrays of `{ id }` objects: keyed by id — existing ids reconciled in place
 *   (so a concurrent edit on another device survives per-field), new ids
 *   appended, missing ids removed. This is what lets two devices each add log
 *   events without clobbering one another.
 * - Other arrays (string[] like `options`/`metricIds`): replaced wholesale;
 *   they're small config lists where field-level merge isn't worth the cost.
 * - Primitives: assigned directly.
 *
 * Known v1 limit: element *reordering* within keyed lists isn't propagated
 * (items keep their CRDT insertion order). Data is never lost; order may differ.
 */
export function reconcile(draft: unknown, target: unknown): void {
  if (!isPlainObject(draft) || !isPlainObject(target)) return;
  reconcileObject(draft as Mutable, target as Record<string, unknown>);
}

type Mutable = Record<string, unknown> & { [k: string]: unknown };

function reconcileObject(draft: Mutable, target: Record<string, unknown>): void {
  // Remove keys that no longer exist in target.
  for (const key of Object.keys(draft)) {
    if (!(key in target)) delete draft[key];
  }
  // Upsert keys from target.
  for (const key of Object.keys(target)) {
    assignKey(draft, key, target[key]);
  }
}

function assignKey(draft: Mutable, key: string, value: unknown): void {
  const current = draft[key];
  if (Array.isArray(value)) {
    if (!Array.isArray(current)) {
      draft[key] = value; // type changed or new — let Automerge deep-convert
      return;
    }
    reconcileArray(current as unknown[], value);
  } else if (isPlainObject(value)) {
    if (!isPlainObject(current)) {
      draft[key] = value;
      return;
    }
    reconcileObject(current as Mutable, value as Record<string, unknown>);
  } else {
    if (current !== value) draft[key] = value;
  }
}

function reconcileArray(draft: unknown[], target: unknown[]): void {
  if (isKeyedList(target) && (draft.length === 0 || isKeyedList(draft))) {
    reconcileKeyedList(draft as KeyedItem[], target as KeyedItem[]);
  } else {
    // Positional replace for primitive/unkeyed arrays.
    if (!shallowArrayEqual(draft, target)) {
      draft.splice(0, draft.length, ...target);
    }
  }
}

function reconcileKeyedList(draft: KeyedItem[], target: KeyedItem[]): void {
  const targetIds = new Set(target.map((t) => t.id));
  // Delete items removed in target (back-to-front to keep indices valid).
  for (let i = draft.length - 1; i >= 0; i--) {
    if (!targetIds.has(draft[i].id)) draft.splice(i, 1);
  }
  // Upsert: reconcile existing in place, append new.
  for (const item of target) {
    const idx = draft.findIndex((d) => d.id === item.id);
    if (idx === -1) {
      draft.push(item); // new — Automerge deep-converts the plain object
    } else {
      reconcileObject(draft[idx] as Mutable, item as Record<string, unknown>);
    }
  }
}

type KeyedItem = { id: string } & Record<string, unknown>;

function isKeyedList(arr: unknown[]): arr is KeyedItem[] {
  return arr.length > 0 && arr.every((x) => isPlainObject(x) && typeof (x as Record<string, unknown>).id === 'string');
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function shallowArrayEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
