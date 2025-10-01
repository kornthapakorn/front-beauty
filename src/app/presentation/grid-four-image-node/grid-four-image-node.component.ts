import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HostNode } from '../../models/host-node.model';

export type GridFourImageField = 'image1' | 'image2' | 'image3' | 'image4';
export interface GridFourImageEvent {
  path: number[];
  field: GridFourImageField;
}

@Component({
  selector: 'app-grid-four-image-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grid-four-image-node.component.html',
  styleUrls: ['./grid-four-image-node.component.css']
})
export class GridFourImageNodeComponent {
  private static readonly FIELDS: readonly GridFourImageField[] = ['image1', 'image2', 'image3', 'image4'];

  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() frozen = false;

  @Output() openImageForField = new EventEmitter<GridFourImageEvent>();

  readonly fields = GridFourImageNodeComponent.FIELDS;

  getImage(field: GridFourImageField): string {
    const raw = (this.node?.props as Record<string, unknown> | undefined)?.[field];
    return typeof raw === 'string' ? raw : '';
  }

  hasImage(field: GridFourImageField): boolean {
    return this.getImage(field).length > 0;
  }

  onPick(field: GridFourImageField): void {
    if (this.frozen) return;
    this.openImageForField.emit({ path: this.path, field });
  }

  trackField = (_: number, field: GridFourImageField) => field;
}
