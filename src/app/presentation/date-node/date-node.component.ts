import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormComponentTemplateDto } from '../../models/form-component';

@Component({
  selector: 'app-date-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-node.component.html',
  styleUrls: ['./date-node.component.css']
})
export class DateNodeComponent implements OnChanges {
  @Input({ required: true }) component!: FormComponentTemplateDto;
  @Input() frozen = false;

  @Output() edit = new EventEmitter<FormComponentTemplateDto>();
  @Output() remove = new EventEmitter<FormComponentTemplateDto>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['component'] && this.component) {
      this.ensureDateField();
    }
  }

  get displayText(): string {
    return this.component?.date?.text ?? '';
  }

  openEdit(): void {
    if (this.frozen) return;
    this.ensureDateField();
    this.edit.emit(this.component);
  }

  onRemove(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.frozen) return;
    this.remove.emit(this.component);
  }

  private ensureDateField(): void {
    if (!this.component.date) {
      this.component.date = { text: '' };
    }
  }
}