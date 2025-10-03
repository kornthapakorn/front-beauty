import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { take } from 'rxjs';

import { FormService } from '../../domain/form.service';
import { HostNode } from '../../models/host-node.model';
import {
  FORM_COMPONENT_PALETTE,
  FormComponentPaletteItem,
  FormComponentTemplateDto,
  FormComponentType,
  createDefaultFormComponent
} from '../../models/form-component';
import { slugify } from '../../shared/slug.util';

export type FormTemplateField = 'topic' | 'popupText' | 'textOnButton';

export interface FormTemplateTextEvent {
  path: number[];
  field: FormTemplateField;
}

type FormTemplateProps = {
  topic?: string;
  textOnButton?: string;
  popupImage?: string;
  popupText?: string;
  formSlug?: string;
  formTemplateId?: number;
  formComponents?: FormComponentTemplateDto[];
};

@Component({
  selector: 'app-form-template-node',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-template-node.component.html',
  styleUrls: ['./form-template-node.component.css']
})
export class FormTemplateNodeComponent implements OnInit, OnChanges, OnDestroy {
  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() frozen = false;

  @Output() openTextForField = new EventEmitter<FormTemplateTextEvent>();
  @Output() openImagePicker = new EventEmitter<number[]>();

  readonly palette: ReadonlyArray<FormComponentPaletteItem> = FORM_COMPONENT_PALETTE;

  configOpen = false;
  componentsMenuOpen = false;
  loadingComponents = false;
  loadError = '';
  copied = false;

  singleSelectionModalOpen = false;
  singleSelectionTarget: FormComponentTemplateDto | null = null;
  singleSelectionOptions: string[] = [];
  singleSelectionDeleteIndex: number | null = null;

  onRootCardActivate(event: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.openConfig(event);
  }

  private nextTempId = -1;
  private copyResetHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly forms: FormService) {}

  ngOnInit(): void {
    this.ensureProps();
    this.ensureSlug();
    this.loadExistingComponents();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['node']) {
      this.ensureProps();
      this.ensureSlug();
      this.loadExistingComponents();
    }
  }

  ngOnDestroy(): void {
    if (this.copyResetHandle) {
      clearTimeout(this.copyResetHandle);
      this.copyResetHandle = null;
    }
  }

  get title(): string {
    const raw = this.node?.comp?.name ?? this.node?.comp?.tagName ?? '';
    return typeof raw === 'string' && raw.trim().length ? raw.trim() : 'Form';
  }

  get iconSrc(): string {
    return 'assets/icons/formm.png';
  }

  get props(): FormTemplateProps {
    if (!this.node.props) {
      this.node.props = {} as any;
    }
    const props = this.node.props as FormTemplateProps;
    props.formComponents ??= [];
    return props;
  }

  get formUrl(): string {
    return this.ensureSlug();
  }

  get activeComponents(): FormComponentTemplateDto[] {
    return this.props.formComponents!.filter(c => !c.isDelete);
  }

  get singleSelectionComponent(): FormComponentTemplateDto | undefined {
    return this.activeComponents.find(comp => comp.componentType === "singleSelection");
  }

  openConfig(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.frozen) return;
    this.ensureProps();
    this.componentsMenuOpen = false;
    this.copied = false;
    this.configOpen = true;
    this.loadExistingComponents();
  }

  closeConfig(): void {
    this.configOpen = false;
    this.componentsMenuOpen = false;
    this.copied = false;
    if (this.copyResetHandle) {
      clearTimeout(this.copyResetHandle);
      this.copyResetHandle = null;
    }
  }

  togglePalette(): void {
    if (this.frozen) return;
    this.componentsMenuOpen = !this.componentsMenuOpen;
  }

  addComponent(type: FormComponentType): void {
    if (this.frozen) return;
    const templateId = this.props.formTemplateId ?? 0;
    const component = createDefaultFormComponent(templateId, type);
    component.id = this.nextTempId--;
    component.formTemplateId = templateId;
    this.props.formComponents!.push(component);
    this.componentsMenuOpen = false;
  }

  removeComponent(index: number): void {
    const list = this.activeComponents;
    const target = list[index];
    if (!target) return;
    const original = this.props.formComponents!.find(c => c.id === target.id);
    if (!original) return;
    if (original.id > 0) {
      original.isDelete = true;
    } else {
      const idx = this.props.formComponents!.indexOf(original);
      if (idx >= 0) this.props.formComponents!.splice(idx, 1);
    }
  }

  regenerateSlug(): void {
    if (this.frozen) return;
    const source = this.props.topic || this.title || 'form';
    this.props.formSlug = slugify(source, 'form');
  }

  copyUrl(): void {
    if (!navigator?.clipboard) return;
    navigator.clipboard
      .writeText(this.formUrl)
      .then(() => {
        this.copied = true;
        if (this.copyResetHandle) {
          clearTimeout(this.copyResetHandle);
        }
        this.copyResetHandle = setTimeout(() => {
          this.copied = false;
          this.copyResetHandle = null;
        }, 2000);
      })
      .catch(() => {
        this.copied = false;
      });
  }

  openTopic(): void {
    if (this.frozen) return;
    this.openTextForField.emit({ path: this.path, field: 'topic' });
  }

  openButtonLabel(): void {
    if (this.frozen) return;
    this.openTextForField.emit({ path: this.path, field: 'textOnButton' });
  }

  openPopupText(): void {
    if (this.frozen) return;
    this.openTextForField.emit({ path: this.path, field: 'popupText' });
  }

  openPopupImage(): void {
    if (this.frozen) return;
    this.openImagePicker.emit(this.path);
  }

  trackByComponent = (_: number, item: FormComponentTemplateDto) => item.id;

  getComponentLabel(type: FormComponentType): string {
    return this.palette.find(item => item.type === type)?.label ?? type;
  }

  getComponentIcon(type: FormComponentType): string {
    return this.palette.find(item => item.type === type)?.icon ?? this.iconSrc;
  }

  onChipRemove(comp: FormComponentTemplateDto, ev?: Event): void {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    const idx = this.activeComponents.findIndex(item => item.id === comp.id);
    if (idx >= 0) {
      this.removeComponent(idx);
    }
  }

  trackOption = (_: number, item: string) => item;

  ensureTextField(comp: FormComponentTemplateDto): boolean {
    comp.textField ??= { text: '' };
    return true;
  }

  ensureDateField(comp: FormComponentTemplateDto): boolean {
    comp.date ??= { text: '' };
    return true;
  }


  openPrimarySingleSelection(): void {
    if (this.frozen) return;
    const comp = this.singleSelectionComponent;
    if (comp) {
      this.openSingleSelectionConfig(comp);
    }
  }

  openSingleSelectionConfig(comp: FormComponentTemplateDto): void {
    if (this.frozen) return;
    this.singleSelectionTarget = comp;
    const options = comp.singleSelection?.options;
    if (Array.isArray(options) && options.length) {
      this.singleSelectionOptions = options.map(opt => opt ?? '');
    } else if (comp.singleSelection?.value) {
      this.singleSelectionOptions = [comp.singleSelection.value];
    } else {
      this.singleSelectionOptions = [''];
    }
    this.singleSelectionDeleteIndex = null;
    this.singleSelectionModalOpen = true;
  }

  addSingleSelectionOption(): void {
    this.singleSelectionOptions.push('');
    this.singleSelectionDeleteIndex = null;
  }

  requestSingleSelectionRemoval(index: number): void {
    this.singleSelectionDeleteIndex = index;
  }

  cancelSingleSelectionRemoval(): void {
    this.singleSelectionDeleteIndex = null;
  }

  confirmSingleSelectionRemoval(index: number): void {
    this.singleSelectionOptions.splice(index, 1);
    this.singleSelectionDeleteIndex = null;
    if (!this.singleSelectionOptions.length) {
      this.singleSelectionOptions.push('');
    }
  }

  saveSingleSelectionOptions(): void {
    if (!this.singleSelectionTarget) return;
    const options = this.singleSelectionOptions
      .map(option => option.trim())
      .filter(option => option.length > 0);
    this.singleSelectionTarget.singleSelection ??= {};
    this.singleSelectionTarget.singleSelection.options = options;
    this.singleSelectionTarget.singleSelection.value = options[0] ?? '';
    this.closeSingleSelectionConfig();
  }

  closeSingleSelectionConfig(): void {
    this.singleSelectionModalOpen = false;
    this.singleSelectionTarget = null;
    this.singleSelectionOptions = [];
    this.singleSelectionDeleteIndex = null;
  }

  private ensureProps(): void {
    this.props.formComponents ??= [];
  }

  private ensureSlug(): string {
    const props = this.props;
    if (!props.formSlug) {
      props.formSlug = slugify(props.topic || this.title || 'form');
    }
    return props.formSlug;
  }

  private loadExistingComponents(): void {
    const props = this.props;
    if (!props.formTemplateId || (props.formComponents && props.formComponents.length)) {
      return;
    }
    this.loadingComponents = true;
    this.forms
      .getTemplate(props.formTemplateId)
      .pipe(take(1))
      .subscribe({
        next: comps => {
          props.formComponents = comps?.map(c => ({ ...c })) ?? [];
          this.loadingComponents = false;
          this.loadError = '';
        },
        error: err => {
          this.loadingComponents = false;
          this.loadError = err?.error ?? 'Unable to load form components';
        }
      });
  }
}











