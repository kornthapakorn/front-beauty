import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HostNode } from '../../models/host-node.model';

export type TableField = 'title' | 'textDesc';
export interface TableTopicDescEvent {
  path: number[];
  field: TableField;
}

@Component({
  selector: 'app-table-topic-desc-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-topic-desc-node.component.html',
  styleUrls: ['./table-topic-desc-node.component.css']
})
export class TableTopicDescNodeComponent {
  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() frozen = false;

  @Output() openTextForField = new EventEmitter<TableTopicDescEvent>();

  private getProp(field: TableField): string {
    const props = (this.node?.props ?? {}) as Record<string, unknown>;
    const raw = props[field];
    return typeof raw === 'string' ? raw : '';
  }

  get titleText(): string {
    const text = this.getProp('title').trim();
    return text.length ? text : 'Text here';
  }

  get descText(): string {
    const text = this.getProp('textDesc').trim();
    return text.length ? text : 'Text here';
  }

  get titlePlaceholder(): boolean {
    return !this.getProp('title').trim().length;
  }

  get descPlaceholder(): boolean {
    return !this.getProp('textDesc').trim().length;
  }

  onEdit(field: TableField): void {
    if (this.frozen) return;
    this.openTextForField.emit({ path: this.path, field });
  }
}
