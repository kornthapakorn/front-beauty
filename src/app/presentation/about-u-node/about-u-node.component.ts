import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HostNode } from '../../models/host-node.model';
import { TableTopicDescEvent } from '../table-topic-desc-node/table-topic-desc-node.component';
import { GridColumnSide, GridTwoColumnEvent } from '../grid-two-column-node/grid-two-column-node.component';

type GridData = {
  leftImage?: string;
  leftText?: string;
  leftUrl?: string;
  rightImage?: string;
  rightText?: string;
  rightUrl?: string;
};

type AboutProps = {
  display_picture?: { src?: string };
  imageTopic?: string;
  textTopic?: string;
  textDesc?: string;
  gridTwoColumn?: GridData | null;
  leftImage?: string;
  leftText?: string;
  rightImage?: string;
  rightText?: string;
};

@Component({
  selector: 'app-about-u-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-u-node.component.html',
  styleUrls: ['./about-u-node.component.css']
})
export class AboutUNodeComponent {
  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() frozen = false;

  @Output() openPickerForNode = new EventEmitter<number[]>();
  @Output() openTextForField = new EventEmitter<TableTopicDescEvent>();
  @Output() openGridImageForNode = new EventEmitter<GridTwoColumnEvent>();
  @Output() openGridTextCfgForNode = new EventEmitter<GridTwoColumnEvent>();
  @Output() openGridUrlCfgForNode = new EventEmitter<number[]>();

  private get props(): AboutProps {
    return (this.node?.props as AboutProps | undefined) ?? {};
  }

  private get grid(): GridData {
    const nested = this.props.gridTwoColumn;
    return (nested && typeof nested === 'object') ? nested : {};
  }

  get heroImage(): string {
    const pic = this.props.imageTopic;
    if (typeof pic === 'string' && pic.trim().length) {
      return pic;
    }
    const fallback = this.props.display_picture?.src;
    return typeof fallback === 'string' ? fallback : '';
  }

  get hasHeroImage(): boolean {
    return this.heroImage.trim().length > 0;
  }

  get headlineText(): string {
    const txt = this.resolveTextTopic().trim();
    return txt.length ? txt : 'Text here';
  }

  get headlinePlaceholder(): boolean {
    return !this.resolveTextTopic().trim().length;
  }

  get descriptionText(): string {
    const text = this.props.textDesc;
    if (typeof text === 'string' && text.trim().length) {
      return text;
    }
    return 'Text here';
  }

  get descriptionPlaceholder(): boolean {
    const text = this.props.textDesc;
    return !(typeof text === 'string' && text.trim().length);
  }

  get leftImage(): string {
    return this.resolveGridField('leftImage');
  }

  get rightImage(): string {
    return this.resolveGridField('rightImage');
  }

  get leftText(): string {
    const text = this.resolveGridField('leftText').trim();
    return text.length ? text : 'Text here';
  }

  get rightText(): string {
    const text = this.resolveGridField('rightText').trim();
    return text.length ? text : 'Text here';
  }

  get leftTextPlaceholder(): boolean {
    return !this.resolveGridField('leftText').trim().length;
  }

  get rightTextPlaceholder(): boolean {
    return !this.resolveGridField('rightText').trim().length;
  }

  onPickHero(): void {
    if (this.frozen) return;
    this.openPickerForNode.emit(this.path);
  }

  onEditHeadline(): void {
    if (this.frozen) return;
    this.openTextForField.emit({ path: this.path, field: 'title' });
  }

  onEditDescription(): void {
    if (this.frozen) return;
    this.openTextForField.emit({ path: this.path, field: 'textDesc' });
  }

  onConfigureLinks(): void {
    if (this.frozen) return;
    this.openGridUrlCfgForNode.emit(this.path);
  }

  onPickCard(side: GridColumnSide): void {
    if (this.frozen) return;
    this.openGridImageForNode.emit({ path: this.path, side });
  }

  onEditCardText(side: GridColumnSide): void {
    if (this.frozen) return;
    this.openGridTextCfgForNode.emit({ path: this.path, side });
  }


  private resolveTextTopic(): string {
    const topic = this.props.textTopic;
    if (typeof topic === 'string') {
      return topic;
    }
    const fallback = (this.props as Record<string, unknown>)['title'];
    return typeof fallback === 'string' ? fallback : '';
  }

  private resolveGridField(field: keyof GridData): string {
    const flat = (this.props as Record<string, unknown>)[field];
    if (typeof flat === 'string') {
      return flat;
    }
    const nested = this.grid[field];
    return typeof nested === 'string' ? nested : '';
  }
}
