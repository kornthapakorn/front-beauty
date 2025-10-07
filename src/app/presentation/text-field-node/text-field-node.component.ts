import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { FormComponentTemplateDto } from '../../models/form-component';

@Component({
  selector: 'app-text-field-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './text-field-node.component.html',
  styleUrls: ['./text-field-node.component.css']
})
export class TextFieldNodeComponent implements OnChanges {
  @Input({ required: true }) component!: FormComponentTemplateDto;
  @Input() frozen = false;

  @Output() edit = new EventEmitter<FormComponentTemplateDto>();
  @Output() remove = new EventEmitter<FormComponentTemplateDto>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['component'] && this.component) {
      this.ensureTextField();
    }
  }

  get displayText(): string {
    return this.component?.textField?.text ?? '';
  }

  get isPlaceholder(): boolean {
    return !this.displayText?.trim().length;
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.frozen) return;
    this.ensureTextField();
    this.edit.emit(this.component);
  }

  onRemove(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.frozen) return;
    this.remove.emit(this.component);
  }

  private ensureTextField(): void {
    if (!this.component.textField) {
      this.component.textField = { text: '' };
    }
  }
}
