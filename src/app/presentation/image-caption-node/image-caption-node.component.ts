import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HostNode } from '../../models/host-node.model';

@Component({
  selector: 'app-image-caption-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-caption-node.component.html',
  styleUrls: ['./image-caption-node.component.css']
})
export class ImageCaptionNodeComponent {
  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() frozen = false;

  @Output() openPickerForNode = new EventEmitter<number[]>();
  @Output() openTextCfgForNode = new EventEmitter<number[]>();

  get imgSrc(): string {
    const raw = this.node?.props?.display_picture?.src;
    return typeof raw === 'string' ? raw : '';
  }

  get displayText(): string {
    const raw = this.node?.props?.display_text;
    return typeof raw === 'string' && raw.trim().length ? raw : '';
  }

  get captionText(): string {
    return this.displayText || 'Text here';
  }

  onPickImage(): void {
    if (this.frozen) return;
    this.openPickerForNode.emit(this.path);
  }

  onEditText(): void {
    if (this.frozen) return;
    this.openTextCfgForNode.emit(this.path);
  }
}
