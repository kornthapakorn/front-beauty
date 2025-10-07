import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FormComponentTemplateDto } from '../../models/form-component';

type ChipOption = {
  label: string;
  isEmpty: boolean;
};

@Component({
  selector: 'app-single-selection-node',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './single-selection-node.component.html',
  styleUrls: ['./single-selection-node.component.css']
})
export class SingleSelectionNodeComponent implements OnChanges {
  @Input({ required: true }) component!: FormComponentTemplateDto;
  @Input() frozen = false;

  @Output() remove = new EventEmitter<FormComponentTemplateDto>();

  modalOpen = false;
  workingOptions: string[] = [];
  pendingDeleteIndex: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['component']?.currentValue) {
      this.ensureSingleSelection();
      this.syncWorkingOptions();
    }
  }

  get chipOptions(): ChipOption[] {
    const options = this.component?.singleSelection?.options ?? [];
    if (!options.length) {
      return [];
    }
    return options.map((option: string | null | undefined) => {
      const label = (option ?? '').trim();
      return { label, isEmpty: label.length === 0 };
    });
  }

  trackOption(index: number): number {
    return index;
  }

  openConfig(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.frozen) {
      return;
    }
    this.ensureSingleSelection();
    this.syncWorkingOptions();
    this.pendingDeleteIndex = null;
    this.modalOpen = true;
  }

  openConfigWithNewOption(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.frozen) {
      return;
    }
    this.ensureSingleSelection();
    this.syncWorkingOptions();
    this.workingOptions = [...this.workingOptions, ''];
    this.pendingDeleteIndex = null;
    this.modalOpen = true;
  }

  closeConfig(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.modalOpen = false;
    this.pendingDeleteIndex = null;
    this.workingOptions = [];
  }

  addOption(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.frozen) {
      return;
    }
    this.workingOptions = [...this.workingOptions, ''];
    this.pendingDeleteIndex = null;
  }

  requestRemoval(index: number, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.frozen) {
      return;
    }
    this.pendingDeleteIndex = index;
  }

  cancelRemoval(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.pendingDeleteIndex = null;
  }

  confirmRemoval(index: number, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.frozen) {
      return;
    }
    const next = [...this.workingOptions];
    next.splice(index, 1);
    this.workingOptions = next;
    this.pendingDeleteIndex = null;
  }

  save(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (!this.component || this.frozen) {
      return;
    }
    this.ensureSingleSelection();
    const normalized = this.workingOptions.map((option: string) => option.trim());
    this.component.singleSelection!.options = normalized;
    this.component.singleSelection!.value = normalized.find((option: string) => option.length > 0) ?? '';
    this.closeConfig();
  }

  removeComponent(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.frozen) {
      return;
    }
    this.closeConfig();
    this.remove.emit(this.component);
  }

  private ensureSingleSelection(): void {
    this.component.singleSelection ??= { value: '', options: [] };
    this.component.singleSelection.options ??= [];
  }

  private syncWorkingOptions(): void {
    const options = this.component.singleSelection?.options;
    if (Array.isArray(options) && options.length) {
      this.workingOptions = options.map((option: string | null | undefined) => option ?? '');
    } else {
      this.workingOptions = [];
    }
  }
}

