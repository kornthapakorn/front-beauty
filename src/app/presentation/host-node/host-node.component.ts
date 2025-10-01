import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { BannerNodeComponent } from '../banner-node/banner-node.component';
import { ButtonNodeComponent } from '../button-node/button-node.component';
import { HostNode, MoveEvent } from '../../models/host-node.model';
import { GenericNodeComponent } from '../generic-node/generic-node.component';
import { ImageCaptionNodeComponent } from '../image-caption-node/image-caption-node.component';
import { ImageDescNodeComponent } from '../image-desc-node/image-desc-node.component';
import { AboutUNodeComponent } from '../about-u-node/about-u-node.component';
import { TableTopicDescNodeComponent, TableTopicDescEvent } from '../table-topic-desc-node/table-topic-desc-node.component';
import { OneTopicImageCaptionButtonNodeComponent } from '../one-topic-image-caption-button-node/one-topic-image-caption-button-node.component';
import { TwoTopicImageCaptionButtonNodeComponent, TwoTopicImageCaptionButtonEvent, TwoTopicTextEvent } from '../two-topic-image-caption-button-node/two-topic-image-caption-button-node.component';
import { GridFourImageNodeComponent, GridFourImageEvent } from '../grid-four-image-node/grid-four-image-node.component';
import { GridTwoColumnNodeComponent, GridTwoColumnEvent } from '../grid-two-column-node/grid-two-column-node.component';
import { SaleNodeComponent, SaleTextEvent, SaleDateChangeEvent } from '../sale-node/sale-node.component';
import { SectionNodeComponent } from '../section-node/section-node.component';
import { TextboxNodeComponent } from '../textbox-node/textbox-node.component';

@Component({
  selector: 'app-host-node',
  standalone: true,
  imports: [
    CommonModule,
    SectionNodeComponent,
    GenericNodeComponent,
    ButtonNodeComponent,
    BannerNodeComponent,
    TextboxNodeComponent,
    ImageCaptionNodeComponent,
    ImageDescNodeComponent,
    AboutUNodeComponent,
    TableTopicDescNodeComponent,
    GridFourImageNodeComponent,
    OneTopicImageCaptionButtonNodeComponent,
    TwoTopicImageCaptionButtonNodeComponent,
    GridTwoColumnNodeComponent,
    SaleNodeComponent
  ],
  templateUrl: './host-node.component.html',
  styleUrls: ['./host-node.component.css']
})
export class HostNodeComponent {
  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() siblingsLen = 0;
  @Output() addChild = new EventEmitter<number[]>();
  @Output() childMoveUp = new EventEmitter<MoveEvent>();
  @Output() childMoveDown = new EventEmitter<MoveEvent>();
  @Output() childMoveToBack = new EventEmitter<MoveEvent>();
  @Output() childRemove = new EventEmitter<MoveEvent>();
  @Output() openPickerForNode = new EventEmitter<number[]>();
  @Output() openTextCfgForNode = new EventEmitter<number[]>();
  @Output() openBtnCfgForNode = new EventEmitter<number[]>();
  @Output() openGridImageForNode = new EventEmitter<GridTwoColumnEvent>();
  @Output() openGridTextCfgForNode = new EventEmitter<GridTwoColumnEvent>();
  @Output() openTableTextCfgForNode = new EventEmitter<TableTopicDescEvent>();
  @Output() openTwoTopicImageForNode = new EventEmitter<TwoTopicImageCaptionButtonEvent>();
  @Output() openTwoTopicTextCfgForNode = new EventEmitter<TwoTopicTextEvent>();
  @Output() openTwoTopicBtnCfgForNode = new EventEmitter<TwoTopicImageCaptionButtonEvent>();
  @Output() openGridFourImageForNode = new EventEmitter<GridFourImageEvent>();
  @Output() openGridUrlCfgForNode = new EventEmitter<number[]>();
  @Output() openSaleTextCfgForNode = new EventEmitter<SaleTextEvent>();
  @Output() saleDateChange = new EventEmitter<SaleDateChangeEvent>();

  get title(): string {
    return (
      (this.node?.comp?.name as string | undefined) ||
      (this.node?.comp?.tagName as string | undefined) ||
      (this.node?.comp?.componentType as string | undefined) ||
      'Component'
    );
  }

  get normalizedTagName(): string {
    const raw = (this.node?.comp?.tagName ?? this.node?.comp?.componentType ?? '') as string;
    return raw.trim().toLowerCase();
  }

  get isSection(): boolean {
    return this.normalizedTagName === 'section';
  }

  get children(): HostNode[] {
    const arr = this.node?.props?.children;
    return Array.isArray(arr) ? arr : [];
  }

  get frozen(): boolean {
    return this.toBool(this.node?.comp?.isFreeze);
  }

  canMoveUp(): boolean {
    return this.path.length > 0 && this.myIndex > 0;
  }

  canMoveDown(): boolean {
    return this.path.length > 0 && this.myIndex < this.siblingsLen - 1;
  }

  emitMoveUp(): void {
    if (this.canMoveUp()) {
      this.childMoveUp.emit({ path: this.parentPath, index: this.myIndex });
    }
  }

  emitMoveDown(): void {
    if (this.canMoveDown()) {
      this.childMoveDown.emit({ path: this.parentPath, index: this.myIndex });
    }
  }

  emitMoveToBack(): void {
    this.childMoveToBack.emit({ path: this.parentPath, index: this.myIndex });
  }

  emitRemove(): void {
    this.childRemove.emit({ path: this.parentPath, index: this.myIndex });
  }

  trackChild = (_: number, item: HostNode) => (item?.uid as string | number | undefined) ?? (item?.comp as any)?.componentId ?? _;

  append(path: number[] | undefined, idx: number): number[] {
    return [...(path ?? []), idx];
  }



  private get parentPath(): number[] {
    return this.path.slice(0, -1);
  }

  private get myIndex(): number {
    return this.path[this.path.length - 1] ?? 0;
  }

  private toBool(value: unknown): boolean {
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'y';
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return !!value;
  }
}


































