import type { FC } from 'react';
import type { ColumnType } from '#domain/schema';

export interface CellProps<V = unknown> {
  value: V;
  onCommit: (next: V) => void;
  onCancel: () => void;
  options?: string[];
}

export type CellComponent = FC<CellProps>;

const registry = new Map<ColumnType, CellComponent>();

export function registerCell(type: ColumnType, component: CellComponent) {
  registry.set(type, component);
}

export function getCell(type: ColumnType): CellComponent | undefined {
  return registry.get(type);
}
