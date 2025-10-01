import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HostNode } from '../../models/host-node.model';

export type TwoTopicSide = 'left' | 'right';
export type TwoTopicTextField = 'title' | 'textDesc';

export interface TwoTopicImageCaptionButtonEvent {
  path: number[];
  side: TwoTopicSide;
}

export interface TwoTopicTextEvent extends TwoTopicImageCaptionButtonEvent {
  field: TwoTopicTextField;
}

@Component({
  selector: 'app-two-topic-image-caption-button-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './two-topic-image-caption-button-node.component.html',
  styleUrls: ['./two-topic-image-caption-button-node.component.css']
})
export class TwoTopicImageCaptionButtonNodeComponent {
  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() frozen = false;

  @Output() openImageForSide = new EventEmitter<TwoTopicImageCaptionButtonEvent>();
  @Output() openTextForField = new EventEmitter<TwoTopicTextEvent>();
  @Output() openBtnCfgForSide = new EventEmitter<TwoTopicImageCaptionButtonEvent>();

  get leftImage(): string {
    return this.resolveImage('left');
  }

  get rightImage(): string {
    return this.resolveImage('right');
  }

  get leftTitle(): string {
    const text = this.resolveText('leftTitle').trim();
    return text.length ? text : 'Text here';
  }

  get rightTitle(): string {
    const text = this.resolveText('rightTitle').trim();
    return text.length ? text : 'Text here';
  }

  get leftDesc(): string {
    const text = this.resolveText('leftTextDesc').trim();
    return text.length ? text : 'Text here';
  }

  get rightDesc(): string {
    const text = this.resolveText('rightTextDesc').trim();
    return text.length ? text : 'Text here';
  }

  get leftButtonLabel(): string {
    return this.resolveButtonLabel('leftTextOnButton');
  }

  get rightButtonLabel(): string {
    return this.resolveButtonLabel('rightTextOnButton');
  }

  get leftButtonActive(): boolean {
    return this.resolveButtonActive('leftIsActive');
  }

  get rightButtonActive(): boolean {
    return this.resolveButtonActive('rightIsActive');
  }

  get leftTitlePlaceholder(): boolean {
    return !this.resolveText('leftTitle').trim().length;
  }

  get rightTitlePlaceholder(): boolean {
    return !this.resolveText('rightTitle').trim().length;
  }

  get leftDescPlaceholder(): boolean {
    return !this.resolveText('leftTextDesc').trim().length;
  }

  get rightDescPlaceholder(): boolean {
    return !this.resolveText('rightTextDesc').trim().length;
  }

  onPick(side: TwoTopicSide): void {
    if (this.frozen) return;
    this.openImageForSide.emit({ path: this.path, side });
  }

  onEdit(side: TwoTopicSide, field: TwoTopicTextField): void {
    if (this.frozen) return;
    this.openTextForField.emit({ path: this.path, side, field });
  }

  onEditButton(side: TwoTopicSide): void {
    if (this.frozen) return;
    this.openBtnCfgForSide.emit({ path: this.path, side });
  }

  private get props(): any {
    return this.node?.props ?? {};
  }

  private resolveImage(side: TwoTopicSide): string {
    const field = side === 'left' ? 'leftImage' : 'rightImage';
    return this.props[field] || '';
  }

  private resolveText(field: string): string {
    const raw = this.props[field];
    return typeof raw === 'string' ? raw : '';
  }

  private resolveButtonLabel(field: string): string {
    const raw = this.props[field];
    return typeof raw === 'string' && raw.trim().length ? raw : 'Text here';
  }

  private resolveButtonActive(field: string): boolean {
    const raw = this.props[field];
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') return ['true', '1', 'y', 'on'].includes(raw.toLowerCase());
    return true;
  }
}
