import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HostNode } from '../../models/host-node.model';

@Component({
  selector: 'app-textbox-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './textbox-node.component.html',
  styleUrls: ['./textbox-node.component.css']
})
export class TextboxNodeComponent {
  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() frozen = false;

  @Output() openTextCfgForNode = new EventEmitter<number[]>();

  get displayText(): string {
    const raw = this.node?.props?.display_text;
    return typeof raw === 'string' && raw.trim().length ? raw : '';
  }

  get placeholderText(): string {
    return this.displayText || 'Text here';
  }

  onEditText(): void {
    if (this.frozen) return;
    this.openTextCfgForNode.emit(this.path);
  }
}
