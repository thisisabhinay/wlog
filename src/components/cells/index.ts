import type { ColumnType } from '#domain/schema';
import type { CellComponent } from './cell-types';
import { TextCell } from './text-cell';
import { NumberCell } from './number-cell';
import { DateCell } from './date-cell';
import { SelectCell } from './select-cell';
import { LinkCell } from './link-cell';

export const cellRegistry: Record<ColumnType, CellComponent> = {
  text: TextCell as CellComponent,
  number: NumberCell as CellComponent,
  date: DateCell as CellComponent,
  select: SelectCell as CellComponent,
  link: LinkCell as CellComponent,
};

export type { CellProps, CellComponent } from './cell-types';
