import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormComponentTemplateDto } from '../../models/form-component';

@Component({
  selector: 'app-birth-date-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './birth-date-node.component.html',
  styleUrls: ['./birth-date-node.component.css']
})
export class BirthDateNodeComponent implements OnChanges {
  @Input({ required: true }) component!: FormComponentTemplateDto;
  @Input() frozen = false;

  @Output() edit = new EventEmitter<FormComponentTemplateDto>();
  @Output() remove = new EventEmitter<FormComponentTemplateDto>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['component'] && this.component) {
      this.ensureBirthDate();
    }
  }

  get displayLabel(): string {
    return this.component?.birthDate?.label ?? '';
  }

  openEdit(): void {
    if (this.frozen) return;
    this.ensureBirthDate();
    this.edit.emit(this.component);
  }

  onRemove(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.frozen) return;
    this.remove.emit(this.component);
  }

  private ensureBirthDate(): void {
    if (!this.component.birthDate) {
      this.component.birthDate = { label: '' };
    }
  }
}