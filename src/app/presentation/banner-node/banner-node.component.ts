import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HostNode } from '../../models/host-node.model';

@Component({
  selector: 'app-banner-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner-node.component.html',
  styleUrls: ['./banner-node.component.css']
})
export class BannerNodeComponent {
  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() frozen = false;

  @Output() openPickerForNode = new EventEmitter<number[]>();
  @Output() openTextCfgForNode = new EventEmitter<number[]>();
  @Output() openBtnCfgForNode = new EventEmitter<number[]>();

  get imgSrc(): string {
    return (this.node?.props?.display_picture?.src as string | undefined) || '';
  }

  get displayText(): string {
    return (this.node?.props?.display_text as string | undefined) || '';
  }

  get buttonLabel(): string {
    return (this.node?.props?.display_button?.label as string | undefined) || '';
  }

  get buttonActive(): boolean {
    const raw = this.node?.props?.display_button?.active;
    return this.toBool(raw, true);
  }

  get overlayText(): string {
    return this.displayText || 'Text here';
  }

  get overlayButton(): string {
    return this.buttonLabel || 'Text here';
  }

  onPickImage(): void {
    if (!this.frozen) {
      this.openPickerForNode.emit(this.path);
    }
  }

  onEditText(): void {
    if (!this.frozen) {
      this.openTextCfgForNode.emit(this.path);
    }
  }

  onEditButton(): void {
    if (!this.frozen) {
      this.openBtnCfgForNode.emit(this.path);
    }
  }

  private toBool(value: unknown, fallback = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      if (['true', '1', 'y', 'on'].includes(lower)) {
        return true;
      }
      if (['false', '0', 'n', 'off'].includes(lower)) {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return fallback;
  }
}
