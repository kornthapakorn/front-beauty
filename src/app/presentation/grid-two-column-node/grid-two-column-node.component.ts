import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HostNode } from '../../models/host-node.model';

export type GridColumnSide = 'left' | 'right';
export interface GridTwoColumnEvent {
  path: number[];
  side: GridColumnSide;
}

type GridTwoColumnData = {
  leftImage?: string;
  leftText?: string;
  leftUrl?: string;
  rightImage?: string;
  rightText?: string;
  rightUrl?: string;
};

type GridTwoColumnProps = NonNullable<HostNode['props']> & GridTwoColumnData & {
  gridTwoColumn?: GridTwoColumnData | null;
};

@Component({
  selector: 'app-grid-two-column-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grid-two-column-node.component.html',
  styleUrls: ['./grid-two-column-node.component.css']
})
export class GridTwoColumnNodeComponent {
  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() frozen = false;

  @Output() openImageForSide = new EventEmitter<GridTwoColumnEvent>();
  @Output() openTextForSide = new EventEmitter<GridTwoColumnEvent>();
  @Output() openUrlConfig = new EventEmitter<number[]>();

  private get flatProps(): GridTwoColumnProps {
    if (!this.node.props || typeof this.node.props !== 'object') {
      this.node.props = {};
    }
    return this.node.props as GridTwoColumnProps;
  }

  private get nestedProps(): GridTwoColumnData {
    const props = this.flatProps;
    if (!props.gridTwoColumn || typeof props.gridTwoColumn !== 'object') {
      props.gridTwoColumn = {};
    }
    return props.gridTwoColumn as GridTwoColumnData;
  }

  private resolve(field: keyof GridTwoColumnData): string {
    const flatValue = this.flatProps[field];
    if (typeof flatValue === 'string') {
      return flatValue;
    }
    const nestedValue = this.nestedProps[field];
    return typeof nestedValue === 'string' ? nestedValue : '';
  }

  get leftImage(): string {
    return this.resolve('leftImage');
  }

  get rightImage(): string {
    return this.resolve('rightImage');
  }

  private get rawLeftText(): string {
    return this.resolve('leftText');
  }

  private get rawRightText(): string {
    return this.resolve('rightText');
  }

  get leftText(): string {
    const text = this.rawLeftText.trim();
    return text.length ? text : 'Text here';
  }

  get rightText(): string {
    const text = this.rawRightText.trim();
    return text.length ? text : 'Text here';
  }

  get leftTextPlaceholder(): boolean {
    return !this.rawLeftText.trim().length;
  }

  get rightTextPlaceholder(): boolean {
    return !this.rawRightText.trim().length;
  }

  onPick(side: GridColumnSide): void {
    if (this.frozen) return;
    this.openImageForSide.emit({ path: this.path, side });
  }

  onEditText(side: GridColumnSide): void {
    if (this.frozen) return;
    this.openTextForSide.emit({ path: this.path, side });
  }

  onConfigureUrls(): void {
    if (this.frozen) return;
    this.openUrlConfig.emit(this.path);
  }
}
