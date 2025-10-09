import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { FormComponentTemplateDto } from '../../models/form-component';

@Component({
  selector: 'app-form-button-node',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-button-node.component.html',
  styleUrls: ['./form-button-node.component.css']
})
export class FormButtonNodeComponent {
  @Input({ required: true }) component!: FormComponentTemplateDto;
  @Input() frozen = false;

  @Output() edit = new EventEmitter<FormComponentTemplateDto>();
  @Output() remove = new EventEmitter<FormComponentTemplateDto>();

  configOpen = false;
  configIsActive = true;
  configUrl = '';

  get buttonText(): string {
    return this.component?.formButton?.textOnButton?.trim() || 'Text Here';
  }

  get isActive(): boolean {
    return this.component?.formButton?.isActive ?? true;
  }

  get buttonClasses(): string[] {
    return ['fbn__button', this.isActive ? 'fbn__button--active' : 'fbn__button--inactive'];
  }

  openTextEdit(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.frozen) return;
    this.ensureModel();
    this.edit.emit(this.component);
  }

  openConfig(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.frozen) return;
    this.ensureModel();
    this.configIsActive = this.component.formButton?.isActive ?? true;
    this.configUrl = this.component.formButton?.url ?? '';
    this.configOpen = true;
  }

  closeConfig(): void {
    this.configOpen = false;
  }

  setActive(state: boolean): void {
    if (this.frozen) return;
    this.configIsActive = state;
  }

  saveConfig(): void {
    if (this.frozen) return;
    this.ensureModel();
    const url = (this.configUrl || '').trim();
    this.component.formButton!.isActive = this.configIsActive;
    this.component.formButton!.url = url;
    this.closeConfig();
  }

  onRemove(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.frozen) return;
    this.remove.emit(this.component);
  }

  private ensureModel(): void {
    if (!this.component.formButton) {
      this.component.formButton = { textOnButton: 'Text Here', isActive: true, url: '' };
    }
  }
}