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
import { SingleSelectionNodeComponent } from '../single-selection-node/single-selection-node.component';
import { TextFieldNodeComponent } from '../text-field-node/text-field-node.component';
import { DateNodeComponent } from '../date-node/date-node.component';
import { BirthDateNodeComponent } from '../birth-date-node/birth-date-node.component';
import { ImageUploadNodeComponent } from '../image-upload-node/image-upload-node.component';
import { FormButtonNodeComponent } from '../form-button-node/form-button-node.component';
import { ImageUploadWithContentNodeComponent } from '../image-upload-with-content-node/image-upload-with-content-node.component';

export type FormTemplateField = 'topic' | 'popupText' | 'textOnButton' | 'componentText';

export interface FormTemplateTextEvent {
  path: number[];
  field: FormTemplateField;
  component?: FormComponentTemplateDto;
}

export interface FormTemplateImageEvent {
  path: number[];
  component: FormComponentTemplateDto;
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
  imports: [CommonModule, FormsModule, SingleSelectionNodeComponent, TextFieldNodeComponent, DateNodeComponent, BirthDateNodeComponent, ImageUploadNodeComponent, ImageUploadWithContentNodeComponent, FormButtonNodeComponent],
  templateUrl: './form-template-node.component.html',
  styleUrls: ['./form-template-node.component.css']
})
export class FormTemplateNodeComponent implements OnInit, OnChanges, OnDestroy {
  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() frozen = false;
  @Input() submitAttempted = false;

  @Output() openTextForField = new EventEmitter<FormTemplateTextEvent>();
  @Output() openImagePicker = new EventEmitter<number[]>();
  @Output() openImageForComponent = new EventEmitter<FormTemplateImageEvent>();

  readonly palette: ReadonlyArray<FormComponentPaletteItem> = FORM_COMPONENT_PALETTE;

  configOpen = false;
  componentsMenuOpen = false;
  loadingComponents = false;
  loadError = '';
  copied = false;
  configSubmitAttempted = false;

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

  get topicMissing(): boolean {
    return !this.trimString(this.props.topic);
  }

  private trimString(value: string | undefined | null): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  get popupTextMissing(): boolean {
    return !this.trimString(this.props.popupText);
  }

  get popupImageMissing(): boolean {
    return !this.trimString(this.props.popupImage);
  }

  private get shouldShowFieldErrors(): boolean {
    return this.configSubmitAttempted || this.submitAttempted;
  }

  private get hasPopupImageError(): boolean {
    const props = this.props as Record<string, unknown>;
    const message = typeof props['popupImageError'] === "string" ? props['popupImageError'].trim() : "";
    return message.length > 0;
  }

  get topicErrorMessage(): string {
    if (!this.shouldShowFieldErrors) return "";
    return this.topicMissing ? "Please Complete all required fields" : "";
  }

  get popupTextErrorMessage(): string {
    if (!this.shouldShowFieldErrors) return "";
    return this.popupTextMissing ? "Please Complete all required fields" : "";
  }

  get popupImageErrorMessage(): string {
    const props = this.props as Record<string, unknown>;
    const explicit = typeof props['popupImageError'] === "string" ? props['popupImageError'].trim() : "";
    if (explicit) return explicit;
    if (!this.shouldShowFieldErrors) return "";
    return this.popupImageMissing ? "Please upload only image file (jpg, jpeg, png)" : "";
  }

  get activeComponents(): FormComponentTemplateDto[] {
    return this.props.formComponents!.filter((c: FormComponentTemplateDto) => !c.isDelete);
  }

  get singleSelectionComponent(): FormComponentTemplateDto | undefined {
    return this.activeComponents.find((comp: FormComponentTemplateDto) => comp.componentType === 'singleSelection');
  }

  // <CHANGE> เพิ่ม getter สำหรับ components ที่ไม่ใช่ singleSelection
  get nonSingleSelectionComponents(): FormComponentTemplateDto[] {
    return this.activeComponents.filter((comp: FormComponentTemplateDto) => comp.componentType !== 'singleSelection');
  }

  // <CHANGE> เพิ่ม getter สำหรับ components ที่เรียงลำดับโดยให้ singleSelection อยู่ด้านบนสุด
  get orderedComponents(): FormComponentTemplateDto[] {
    const single = this.singleSelectionComponent;
    const others = this.nonSingleSelectionComponents;
    return single ? [single, ...others] : others;
  }

  openConfig(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.frozen) return;
    this.ensureProps();
    this.componentsMenuOpen = false;
    this.copied = false;
    this.configSubmitAttempted = false;
    this.configOpen = true;
    this.loadExistingComponents();
  }

  closeConfig(): void {
    this.configOpen = false;
    this.componentsMenuOpen = false;
    this.configSubmitAttempted = false;
  }

  saveConfig(): void {
    if (this.frozen) return;
    this.configSubmitAttempted = true;
    if (this.topicMissing || this.popupTextMissing || this.popupImageMissing || this.hasPopupImageError) {
      return;
    }
    this.closeConfig();
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

  // <CHANGE> แก้ไข removeComponent ให้รับ component โดยตรงแทนที่จะเป็น index
  removeComponent(comp: FormComponentTemplateDto): void {
    if (!comp) return;
    const original = this.props.formComponents!.find((c: FormComponentTemplateDto) => c.id === comp.id);
    if (!original) return;
    if (original.id > 0) {
      original.isDelete = true;
    } else {
      const idx = this.props.formComponents!.indexOf(original);
      if (idx >= 0) this.props.formComponents!.splice(idx, 1);
    }
  }

  removeSingleSelection(): void {
    if (!this.singleSelectionComponent) {
      return;
    }
    this.removeComponent(this.singleSelectionComponent);
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
    return this.palette.find((item: FormComponentPaletteItem) => item.type === type)?.label ?? type;
  }

  getComponentIcon(type: FormComponentType): string {
    return this.palette.find((item: FormComponentPaletteItem) => item.type === type)?.icon ?? this.iconSrc;
  }

  openTextField(comp: FormComponentTemplateDto, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.frozen) return;
    this.ensureTextField(comp);
    this.openTextForField.emit({
      path: this.path,
      field: 'componentText',
      component: comp
    });
  }

  openDateField(comp: FormComponentTemplateDto, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.frozen) return;
    this.ensureDateField(comp);
    this.openTextForField.emit({
      path: this.path,
      field: 'componentText',
      component: comp
    });
  }

  openBirthDateField(comp: FormComponentTemplateDto, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.frozen) return;
    this.ensureBirthDate(comp);
    this.openTextForField.emit({
      path: this.path,
      field: 'componentText',
      component: comp
    });
  }

  openImageUploadField(comp: FormComponentTemplateDto, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.frozen) return;
    this.ensureImageUpload(comp);
    this.openTextForField.emit({
      path: this.path,
      field: 'componentText',
      component: comp
    });
  }

  openImageUploadWithContentText(comp: FormComponentTemplateDto, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.frozen) return;
    this.ensureImageUploadWithContent(comp);
    this.openTextForField.emit({
      path: this.path,
      field: 'componentText',
      component: comp
    });
  }

  openFormButtonText(comp: FormComponentTemplateDto, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.frozen) return;
    this.ensureFormButton(comp);
    this.openTextForField.emit({
      path: this.path,
      field: 'componentText',
      component: comp
    });
  }

  openImageUploadWithContentImage(comp: FormComponentTemplateDto, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.frozen) return;
    this.ensureImageUploadWithContent(comp);
    this.openImageForComponent.emit({ path: this.path, component: comp });
  }

  ensureTextField(comp: FormComponentTemplateDto): boolean {
    comp.textField ??= { text: '' };
    return true;
  }

  ensureDateField(comp: FormComponentTemplateDto): boolean {
    comp.date ??= { text: '' };
    return true;
  }

  ensureBirthDate(comp: FormComponentTemplateDto): boolean {
    comp.birthDate ??= { label: '' };
    return true;
  }

  ensureFormButton(comp: FormComponentTemplateDto): boolean {
    comp.formButton ??= { textOnButton: 'Button', isActive: true, url: '' };
    return true;
  }

  ensureImageUpload(comp: FormComponentTemplateDto): boolean {
    comp.imageUpload ??= { text: '' };
    return true;
  }

  ensureImageUploadWithContent(comp: FormComponentTemplateDto): boolean {
    comp.imageUploadWithImageContent ??= { textDesc: '', image: '' };
    return true;
  }

  shouldShowImageContentError(comp: FormComponentTemplateDto | null | undefined): boolean {
    if (!comp) return false;
    const model = comp.imageUploadWithImageContent;
    if (!model) return false;
    const state = model as { image?: string; __imageError?: string | null };
    if (state.__imageError) return true;
    if (!this.shouldShowFieldErrors) return false;
    const image = typeof model.image === 'string' ? model.image.trim() : '';
    return image.length === 0;
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
        next: (comps: FormComponentTemplateDto[] | null | undefined) => {
          props.formComponents = comps?.map((c: FormComponentTemplateDto) => ({ ...c })) ?? [];
          this.loadingComponents = false;
          this.loadError = '';
        },
        error: (err: unknown) => {
          this.loadingComponents = false;
          this.loadError = (typeof err === 'object' && err && 'error' in err) ? (err as any).error : String(err) || 'Unable to load form components';
        }
      });
  }
}