import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HostNode } from '../../models/host-node.model';

@Component({
  selector: 'app-button-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button-node.component.html',
  styleUrls: ['./button-node.component.css']
})
export class ButtonNodeComponent {
  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() frozen = false;

  @Output() openBtnCfgForNode = new EventEmitter<number[]>();

  get buttonLabel(): string {
    return (this.node?.props?.display_button?.label as string | undefined) || '';
  }

  get buttonLink(): string {
    return (this.node?.props?.display_button?.link as string | undefined) || '';
  }

  get buttonActive(): boolean {
    const raw = this.node?.props?.display_button?.active;
    return this.toBool(raw, true);
  }

  get displayLabel(): string {
    return this.buttonLabel || 'Button';
  }

  onConfigure(): void {
    if (!this.frozen) {
      this.openBtnCfgForNode.emit(this.path);
    }
  }

  onButtonClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.buttonActive || !this.buttonLink) {
      if (!this.frozen) {
        this.onConfigure();
      }
      return;
    }

    const normalized = this.normalizeUrl(this.buttonLink);
    if (!normalized) {
      if (!this.frozen) {
        this.onConfigure();
      }
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }
    window.open(normalized, '_blank', 'noopener');
  }

  private normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) {
      return '';
    }
    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }

  private toBool(value: unknown, fallback = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      if (['true', '1', 'y', 'yes', 'on'].includes(lower)) {
        return true;
      }
      if (['false', '0', 'n', 'no', 'off'].includes(lower)) {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return fallback;
  }
}
