import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HostNode } from '../../models/host-node.model';

@Component({
  selector: 'app-generic-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-node.component.html',
  styleUrls: ['./generic-node.component.css']
})
export class GenericNodeComponent {
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

  get hasTextConfig(): boolean {
    return typeof this.node?.props?.display_text === 'string';
  }

  get hasButtonConfig(): boolean {
    return !!this.node?.props?.display_button;
  }

  get hasPreview(): boolean {
    return !!(this.imgSrc || this.displayText || this.buttonLabel);
  }

  get quickActionsVisible(): boolean {
    return !this.frozen && (this.hasTextConfig || this.hasButtonConfig);
  }
}
