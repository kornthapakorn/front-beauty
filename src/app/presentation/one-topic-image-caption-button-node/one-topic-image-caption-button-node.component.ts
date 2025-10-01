import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HostNode } from '../../models/host-node.model';
import { TableField, TableTopicDescEvent } from '../table-topic-desc-node/table-topic-desc-node.component';

@Component({
  selector: 'app-one-topic-image-caption-button-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './one-topic-image-caption-button-node.component.html',
  styleUrls: ['./one-topic-image-caption-button-node.component.css']
})
export class OneTopicImageCaptionButtonNodeComponent {
  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() frozen = false;

  @Output() openPickerForNode = new EventEmitter<number[]>();
  @Output() openTextForField = new EventEmitter<TableTopicDescEvent>();
  @Output() openBtnCfgForNode = new EventEmitter<number[]>();

  get imageSrc(): string {
    const props: any = this.node?.props ?? {};
    return props.display_picture?.src || props.image || '';
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

  get buttonLabel(): string {
    const props: any = this.node?.props ?? {};
    const label = props.display_button?.label || props.textOnButton;
    return typeof label === 'string' && label.trim().length ? label : 'Text here';
  }

  get buttonActive(): boolean {
    const props: any = this.node?.props ?? {};
    const raw = props.display_button?.active;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') return ['true', '1', 'on', 'y'].includes(raw.toLowerCase());
    return props.isActive ?? true;
  }

  onPickImage(): void {
    if (this.frozen) return;
    this.openPickerForNode.emit(this.path);
  }

  onEdit(field: TableField): void {
    if (this.frozen) return;
    this.openTextForField.emit({ path: this.path, field });
  }

  onEditButton(): void {
    if (this.frozen) return;
    this.openBtnCfgForNode.emit(this.path);
  }

  private getProp(field: TableField): string {
    const props: Record<string, unknown> = (this.node?.props ?? {}) as Record<string, unknown>;
    const raw = props[field];
    return typeof raw === 'string' ? raw : '';
  }
}
