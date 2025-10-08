import { Component, OnDestroy, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { EventService } from '../../domain/event.service';
import { EventCreateDto } from '../../models/event.model';
import { EventComponentDto } from '../../models/event-component.model';
import { ComponentDto } from '../../models/component.model';
import { FormComponentTemplateDto } from '../../models/form-component';
import { CategoryService } from '../../domain/category.service';
import { CategoryCreateDto } from '../../models/category.model';
import { firstValueFrom, Subscription } from 'rxjs';

// UI components
import { ComponentListComponent } from '../component-thumb/component-list.component';
import { HostNodeComponent } from '../host-node/host-node.component';
import { EventPreviewComponent } from '../event-preview/event-preview.component';
import { GridFourImageEvent, GridFourImageField } from '../grid-four-image-node/grid-four-image-node.component';
import { TwoTopicImageCaptionButtonEvent, TwoTopicTextEvent, TwoTopicTextField, TwoTopicSide } from '../two-topic-image-caption-button-node/two-topic-image-caption-button-node.component';
import { TableTopicDescEvent, TableField } from '../table-topic-desc-node/table-topic-desc-node.component';
import { FormTemplateTextEvent } from '../form-template-node/form-template-node.component';
import { SaleTextEvent, SaleDateChangeEvent } from '../sale-node/sale-node.component';

/** ---------- Local helper types ---------- */
type Category = { id: number; name: string; selected: boolean };

// ?????? event ??? GridTwoColumn node
type GridImageEvent = { path: number[]; side: 'left' | 'right' };
type ImageField = 'display_picture' | 'leftImage' | 'rightImage' | 'popupImage' | GridFourImageField;
type TextField  = 'display_text' | 'leftText' | 'rightText' | 'title' | 'textDesc' | 'textTopic' | 'topic' | 'leftTitle' | 'rightTitle' | 'leftTextDesc' | 'rightTextDesc' | 'text' | 'promoPrice' | 'price' | 'endDate' | 'textFooter';

export interface ComponentProps {
  display_picture?: { src: string };
  display_text?: string;
  display_button?: { label: string; link: string; active?: boolean };

  // ?????? formTemplate
  topic?: string;
  textOnButton?: string;
  popupImage?: string;
  popupText?: string;
  formSlug?: string;
  formTemplateId?: number;
  formComponents?: FormComponentTemplateDto[];

  // ? ??????? nested ?????? DTO
  gridTwoColumn?: {
    leftImage?: string; leftText?: string; leftUrl?: string;
    rightImage?: string; rightText?: string; rightUrl?: string;
  };
  // flattened fallback fields for legacy data
  leftImage?: string; leftText?: string; leftUrl?: string;
  rightImage?: string; rightText?: string; rightUrl?: string;


  title?: string; textDesc?: string; text?: string;

  image1?: string; image2?: string; image3?: string; image4?: string;

  promoPrice?: number; price?: number; endDate?: string;
  textFooter?: string; isActive?: boolean; url?: string;

  leftTitle?: string; leftTextDesc?: string; leftTextOnButton?: string; leftIsActive?: boolean;
  rightTitle?: string; rightTextDesc?: string; rightTextOnButton?: string; rightIsActive?: boolean;

  imageTopic?: string; textTopic?: string;

  // UI only (?????? section)
  children?: CompInstance[];
}

// ??? instance ??? component ??????????????????
type CompInstance = {
  uid: string;
  comp: ComponentDto;              // ??????? component
  props: ComponentProps;

  // ?????? preview ???
  imgObjectUrl?: string;                 // preview ?????????? (display_picture)
  imgObjectUrls?: Record<string,string>; // preview ?????????? ???? leftImage/rightImage

  // ????????????????????? base64 ??? save
  _file?: File;                          // ???????????
  _fileMap?: Record<string, File>;       // ??????????? (key = 'leftImage' | 'rightImage' | 'image1' | 'image2' | 'image3' | 'image4')

  // UI flags
  ui?: { dragOver?: boolean };
};

type NodeMutationEvent = { path: number[]; index: number };

type EventDraft = {
  form?: { endDate?: string; name?: string; isFav?: boolean };
  selectedCategoryIds?: number[];
};

const clone = <T>(obj: T): T => {
  const anyWin = window as any;
  if (typeof anyWin.structuredClone === 'function') return anyWin.structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
};

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ComponentListComponent, HostNodeComponent, EventPreviewComponent],
  templateUrl: './event-create.component.html',
  styleUrls: ['./event-create.component.css'],
})
export class CreateEventComponent implements OnDestroy, OnInit {
  showCategoryInput = false;
  /** ---------- Form & UI state ---------- */
  form = this.fb.group({
    endDate: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    isFav: [false],
  });
  errors: { endDate?: string; eventName?: string } = {};
  submitting = false;
  submitAttempted = false;

  // success modal + toast
  modalOpen = false;
  modalMessage = '';
  toastOpen = false;
  toastMessage = '';

  // page banner
  bannerUrl: string | null = null;
  private bannerObjectUrl?: string;
  private bannerFile?: File;

  // categories
  categories: Category[] = [];
  categoryModalOpen = false;
  categoryLoading = false;
  categorySaving = false;
  categoryDeleteLoading = false;
  categoryError = '';
  categorySubmitError = '';
  categoryDeleteError = '';
  categoryToDelete: Category | null = null;
  private categoriesLoaded = false;
  categoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
  });
  get hasCategories() { return this.categories.length > 0; }

  // component builder state
  frontComponents: CompInstance[] = [];
  backComponents: CompInstance[] = [];
  readonly backRoot = -1;
  readonly backRootDepth = 2;
  previewOpen = false;
  previewComponents: EventComponentDto[] = [];

  pickerTarget: CompInstance | null = null;
  frontPickerOpen = false;

  textConfigTarget: { inst: CompInstance; field: TextField } | null = null;
  buttonConfigTarget: CompInstance | null = null;
  twoTopicButtonTarget: { inst: CompInstance; side: TwoTopicSide } | null = null;
  gridTwoUrlTarget: CompInstance | null = null;

  imagePickerTarget: { inst: CompInstance; field: ImageField } | null = null;
  @ViewChild('componentImageInput') componentImageInput?: ElementRef<HTMLInputElement>;

  private readonly textConfigDefaultValidators = [Validators.maxLength(500)];
  private readonly priceFieldPattern = /^(?:\d+(?:\.\d+)?)?$/;

  textConfigForm = this.fb.group({
    display_text: this.fb.control<string>('', this.textConfigDefaultValidators)
  });
  buttonConfigForm = this.fb.group({
    label: this.fb.control<string>('', [Validators.maxLength(120)]),
    link: this.fb.control<string>('', [Validators.maxLength(500)]),
    active: this.fb.control<boolean>(true)
  });
  gridTwoUrlForm = this.fb.group({
    leftUrl: this.fb.control<string>('', [Validators.maxLength(500)]),
    rightUrl: this.fb.control<string>('', [Validators.maxLength(500)])
  });

  private addToBack = false;

  // misc
  drawerOpen = false;
  openMenuId: number | null = null;
  todayStr = this.toYMD(new Date());

  private readonly draftStorageKey = 'create-event-draft';
  private formChangesSub?: Subscription;
  private restoringDraft = false;
  private pendingCategoryIds: number[] = [];
  private draftSaveHandle: ReturnType<typeof setTimeout> | null = null;
  private skipNextPersist = false;

  private uidSeq = 1;
  private nextUid() { return 'inst_' + (this.uidSeq++); }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private events: EventService,
    private categoriesApi: CategoryService
  ) {}

  ngOnInit(): void {
    this.formChangesSub = this.form.valueChanges.subscribe(() => {
      if (!this.restoringDraft) this.scheduleDraftSave();
    });
    this.restoreDraft();
    void this.loadCategories();
  }

  toggleMenu(): void {
    this.drawerOpen = !this.drawerOpen;
  }



  /** ---------- Category ---------- */
openCategory() {
  this.categoryModalOpen = true;
  this.categorySubmitError = '';
  this.categoryToDelete = null;
  this.categoryDeleteError = '';
  this.categoryDeleteLoading = false;

  // ซ่อนช่องกรอกตอนเปิด (ยังไม่โชว์จนกว่าจะกด +)
  this.showCategoryInput = false;
  this.categoryForm.reset({ name: '' });
  this.categoryForm.markAsPristine();
  this.categoryForm.markAsUntouched();

  if (!this.categoriesLoaded && !this.categoryLoading) {
    void this.loadCategories();
  }
}

closeCategory() {
  this.categoryModalOpen = false;
  this.categorySubmitError = '';
  this.categoryToDelete = null;
  this.categoryDeleteError = '';
  this.categoryDeleteLoading = false;

  // reset & ซ่อน input เสมอ
  this.categoryForm.reset({ name: '' });
  this.categoryForm.markAsPristine();
  this.categoryForm.markAsUntouched();
  this.showCategoryInput = false;
}

  toggleCategory(cat: Category) {
    const next = !cat.selected;
    this.categories = this.categories.map(c =>
      c.id === cat.id ? { ...c, selected: next } : c
    );
    this.markStateChanged();
  }
  requestDeleteCategory(cat: Category) {
    this.categoryDeleteError = '';
    this.categoryToDelete = cat;
  }
  cancelDeleteCategory() {
    this.categoryDeleteError = '';
    this.categoryToDelete = null;
    this.categoryDeleteLoading = false;
  }
  async confirmDeleteCategory() {
    if (!this.categoryToDelete) return;
    if (typeof this.categoryToDelete.id !== 'number') {
      this.categoryDeleteError = 'Cannot delete category without id.';
      return;
    }
    if (this.categoryDeleteLoading) return;
    this.categoryDeleteLoading = true;
    this.categoryDeleteError = '';

    try {
      await firstValueFrom(this.categoriesApi.delete(this.categoryToDelete.id));
      this.categories = this.categories.filter(cat => cat.id !== this.categoryToDelete!.id);
      this.categoryToDelete = null;
      this.markStateChanged();
    } catch (error) {
      this.categoryDeleteError = this.resolveCategoryError(error, 'Unable to delete category.');
    } finally {
      this.categoryDeleteLoading = false;
    }
  }
async createCategory() {
  this.categorySubmitError = '';

  const nameCtrl = this.categoryForm.get('name');
  const rawName = nameCtrl?.value ?? '';
  const name = typeof rawName === 'string' ? rawName.trim() : '';

  if (!this.showCategoryInput || !name) {
    this.closeCategory();
    return;
  }

  if (this.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    this.categorySubmitError = 'Category already exists.';
    return;
  }

  if (this.categorySaving) return;
  this.categorySaving = true;

  try {
    const dto = await firstValueFrom(this.categoriesApi.create({ name } as CategoryCreateDto));
    if (!dto || typeof dto.id !== 'number') {
      throw new Error('Invalid category response');
    }
    const newCat: Category = { id: dto.id, name: dto.name, selected: true };

    const nextList = [...this.categories, newCat].sort((a, b) => a.name.localeCompare(b.name));
    this.categories = nextList;
    this.categoriesLoaded = true;

    // reset ช่องกรอก และซ่อน
    this.categoryForm.reset({ name: '' });
    this.categoryForm.markAsPristine();
    this.categoryForm.markAsUntouched();
    this.showCategoryInput = false;

    this.markStateChanged();
    this.closeCategory();
  } catch (error) {
    this.categorySubmitError = this.resolveCategoryError(error, 'Unable to create category.');
  } finally {
    this.categorySaving = false;
  }
}

  private async loadCategories(force = false): Promise<void> {
    if (this.categoryLoading) return;
    if (this.categoriesLoaded && !force) return;

    this.categoryLoading = true;
    this.categoryError = '';

    const selectedIds = new Set(this.categories.filter(cat => cat.selected).map(cat => cat.id));
    try {
      const dtos = await firstValueFrom(this.categoriesApi.getAll());
      const mapped: Category[] = [];
      for (const dto of dtos) {
        if (typeof dto.id !== 'number') continue;
        mapped.push({
          id: dto.id,
          name: dto.name,
          selected: selectedIds.has(dto.id),
        });
      }
      mapped.sort((a, b) => a.name.localeCompare(b.name));
      this.categories = mapped;
      this.categoriesLoaded = true;
      this.applyPendingCategorySelection();
    } catch (error) {
      this.categoryError = this.resolveCategoryError(error, 'Unable to load categories.');
    } finally {
      this.categoryLoading = false;
    }
  }
  private resolveCategoryError(error: unknown, fallback: string): string {
    if (!error) return fallback;
    const anyErr = error as any;
    if (typeof anyErr === 'string') return anyErr;
    if (anyErr?.error) {
      if (typeof anyErr.error === 'string') return anyErr.error;
      if (typeof anyErr.error?.message === 'string') return anyErr.error.message;
    }
    if (typeof anyErr?.message === 'string') return anyErr.message;
    return fallback;
  }

  /** ---------- Fav ---------- */
  toggleFav() { this.form.patchValue({ isFav: !this.form.value.isFav }); }

  /** ---------- Date ---------- */
  openDate(el: HTMLInputElement) {
    el.focus();
    (el as any).showPicker?.();
    if (!(el as any).showPicker) el.click();
  }

  /** ---------- Picker ---------- */
  private makeInst(comp: ComponentDto): CompInstance {
    return { uid: this.nextUid(), comp: clone(comp), props: this.defaultPropsFor(comp) };
  }
  addFrontComp() { this.pickerTarget = null; this.addToBack = false; this.frontPickerOpen = true; }
  addBackComp() { this.pickerTarget = null; this.addToBack = true; this.frontPickerOpen = true; }
  closeFrontPicker() { this.frontPickerOpen = false; this.addToBack = false; this.pickerTarget = null; }
  onFrontSelected(comp: ComponentDto) {
    const newInst = this.makeInst(comp);
    if (this.pickerTarget) {
      this.pickerTarget.props.children!.push(newInst);
    } else if (this.addToBack) {
      this.backComponents.push(newInst);
    } else {
      this.frontComponents.push(newInst);
    }
    this.frontPickerOpen = false;
    this.addToBack = false;
    this.pickerTarget = null;
  }

  // ??????????????? node
  onOpenPickerForNode(path: number[]): void {
    const target = this.getNodeAtPath(path);
    if (!target) return;

    const type = this.normalizeType(target.comp?.tagName ?? (target.comp as any)?.componentType);

    if (type === 'section') {
      this.openPickerFor(target);
      return;
    }

    if (type === 'banner' || type === 'imagewithcaption' || type === 'imagedesc' || type === 'onetopicimagecaptionbutton' || type === 'aboutu') {
      // ??? file input ?????????????????
      this.imagePickerTarget = { inst: target, field: 'display_picture' };
      const el = this.componentImageInput?.nativeElement;
      el?.click();
      return;
    }

    if (type === 'formtemplate') {
      this.imagePickerTarget = { inst: target, field: 'popupImage' };
      this.componentImageInput?.nativeElement?.click();
      return;
    }
  }

  /** ---------- Grid Two Column (image/text/url) ---------- */
  onOpenGridImageForNode(ev: GridImageEvent): void {
    const target = this.getNodeAtPath(ev.path);
    if (!target) return;
    const field: ImageField = ev.side === 'left' ? 'leftImage' : 'rightImage';
    this.imagePickerTarget = { inst: target, field };
    this.componentImageInput?.nativeElement?.click();
  }

  onOpenGridFourImageForNode(ev: GridFourImageEvent): void {
    const target = this.getNodeAtPath(ev.path);
    if (!target) return;
    this.imagePickerTarget = { inst: target, field: ev.field };
    this.componentImageInput?.nativeElement?.click();
  }

  onOpenGridTextCfgForNode(ev: GridImageEvent): void {
    const target = this.getNodeAtPath(ev.path);
    if (!target) return;
    this.buttonConfigTarget = null;
    const field: TextField = ev.side === 'left' ? 'leftText' : 'rightText';
    const current = ((target.props as any)[field] as string | undefined) || 'Text here';
    this.configureTextConfigControl('display_text', current);
    this.textConfigTarget = { inst: target, field: field as TextField };
  }

  onOpenTableTextCfgForNode(ev: TableTopicDescEvent): void {
    const target = this.getNodeAtPath(ev.path);
    if (!target) return;
    this.buttonConfigTarget = null;
    const field: TableField = ev.field;
    const props = (target.props ??= {} as ComponentProps);
    const current = field === 'title' ? this.coerceString(props.title) : this.coerceString(props.textDesc);
    this.configureTextConfigControl('display_text', current);
    this.textConfigTarget = { inst: target, field: field as TextField };
  }

  onOpenTwoTopicImageForNode(ev: TwoTopicImageCaptionButtonEvent): void {
    const target = this.getNodeAtPath(ev.path);
    if (!target) return;
    const field: ImageField = ev.side === 'left' ? 'leftImage' : 'rightImage';
    this.imagePickerTarget = { inst: target, field };
    this.componentImageInput?.nativeElement?.click();
  }

  onOpenTwoTopicTextCfgForNode(ev: TwoTopicTextEvent): void {
    const target = this.getNodeAtPath(ev.path);
    if (!target) return;
    this.buttonConfigTarget = null;
    this.twoTopicButtonTarget = null;
    const field = this.resolveTwoTopicTextField(ev.side, ev.field);
    const props = (target.props ?? {}) as ComponentProps;
    const current = typeof (props as any)[field] === 'string' ? ((props as any)[field] as string) : '';
    this.configureTextConfigControl('display_text', current);
    this.textConfigTarget = { inst: target, field: field as TextField };
  }

  onOpenTwoTopicBtnCfgForNode(ev: TwoTopicImageCaptionButtonEvent): void {
    const target = this.getNodeAtPath(ev.path);
    if (!target) return;
    this.textConfigTarget = null;
    this.buttonConfigTarget = target;
    this.twoTopicButtonTarget = { inst: target, side: ev.side };
    const props = (target.props ?? {}) as ComponentProps;
    const label = ev.side === 'left' ? (props.leftTextOnButton || '') : (props.rightTextOnButton || '');
    const link = ev.side === 'left' ? (props.leftUrl || '') : (props.rightUrl || '');
    const active = ev.side === 'left' ? this.coerceBool(props.leftIsActive, true) : this.coerceBool(props.rightIsActive, true);
    this.buttonConfigForm.reset({ label, link, active });
  }

  private resolveTwoTopicTextField(side: TwoTopicSide, field: TwoTopicTextField): TextField {
    if (field === 'title') {
      return (side === 'left' ? 'leftTitle' : 'rightTitle') as TextField;
    }
    return (side === 'left' ? 'leftTextDesc' : 'rightTextDesc') as TextField;
  }
  onOpenGridUrlCfgForNode(path: number[]): void {
    const target = this.getNodeAtPath(path);
    if (!target) return;

    const props = (target.props ??= {} as ComponentProps);
    const nested = props.gridTwoColumn;
    const leftUrl = this.coerceString(nested?.leftUrl ?? props.leftUrl);
    const rightUrl = this.coerceString(nested?.rightUrl ?? props.rightUrl);

    this.gridTwoUrlForm.reset({ leftUrl, rightUrl });
    this.gridTwoUrlTarget = target;
  }

  saveGridTwoUrlConfig(): void {
    if (!this.gridTwoUrlTarget) return;
    const value = this.gridTwoUrlForm.value;
    const leftUrl = this.coerceString(value.leftUrl);
    const rightUrl = this.coerceString(value.rightUrl);

    const target = this.gridTwoUrlTarget;
    const props = (target.props ??= {} as ComponentProps);
    props.leftUrl = leftUrl;
    props.rightUrl = rightUrl;

    const nested = (props.gridTwoColumn ??= {});
    nested.leftUrl = leftUrl;
    nested.rightUrl = rightUrl;

    this.closeGridTwoUrlConfig();
  }

  closeGridTwoUrlConfig(): void {
    this.gridTwoUrlForm.reset({ leftUrl: '', rightUrl: '' });
    this.gridTwoUrlTarget = null;
  }
  onOpenFormTemplateText(ev: FormTemplateTextEvent): void {
    const target = this.getNodeAtPath(ev.path);
    if (!target) return;
    this.buttonConfigTarget = null;
    const field = ev.field as TextField;
    const props = (target.props ??= {} as ComponentProps);
    const current = this.coerceString((props as any)[field]);
    this.configureTextConfigControl('display_text', current);
    this.textConfigTarget = { inst: target, field: field as TextField };
  }


  onOpenSaleTextCfgForNode(ev: SaleTextEvent): void {
    const target = this.getNodeAtPath(ev.path);
    if (!target) return;

    this.buttonConfigTarget = null;
    const field = ev.field as TextField;
    const props = (target.props ??= {} as ComponentProps);
    const raw = (props as any)[field];
    let current = '';
    if (typeof raw === 'string') {
      current = raw;
    } else if (typeof raw === 'number') {
      current = String(raw);
    }
    this.configureTextConfigControl('display_text', current);
    this.textConfigTarget = { inst: target, field: field as TextField };
  }

  private isPriceField(field?: TextField | null): field is 'price' | 'promoPrice' {
    return field === 'price' || field === 'promoPrice';
  }

  private configureTextConfigControl(field: TextField, value: string): void {
    const control = this.textConfigForm.get('display_text');
    if (!control) return;
    if (this.isPriceField(field)) {
      control.setValidators([Validators.pattern(this.priceFieldPattern)]);
    } else {
      control.setValidators(this.textConfigDefaultValidators);
    }
    control.setValue(value);
    control.markAsPristine();
    control.markAsUntouched();
    control.updateValueAndValidity({ emitEvent: false });
  }

  get isPriceTextConfig(): boolean {
    const field = this.textConfigTarget?.field;
    return this.isPriceField(field ?? null);
  }

  onPriceKeydown(event: KeyboardEvent): void {
    const allowKeys = new Set(['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End', 'Enter']);
    if (allowKeys.has(event.key)) return;
    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) return;
    if (!/^[0-9.]$/.test(event.key)) {
      event.preventDefault();
      return;
    }
    if (event.key === '.' && (event.target as HTMLInputElement).value.includes('.')) {
      event.preventDefault();
    }
  }

  onPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const control = this.textConfigForm.get('display_text');
    if (!input || !control) return;
    const sanitized = input.value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0];
    if (normalized !== input.value) {
      input.value = normalized;
    }
    control.setValue(normalized, { emitEvent: false });
    control.markAsDirty();
    control.updateValueAndValidity({ emitEvent: false });
  }
  onSaleDateChange(ev: SaleDateChangeEvent): void {
    const target = this.getNodeAtPath(ev.path);
    if (!target) return;
    const props = (target.props ??= {} as ComponentProps);
    props.endDate = this.coerceString(ev.value);
  }

  /** ---------- Text/Button modals ---------- */
  onOpenTextCfgForNode(path: number[]): void {
    const target = this.getNodeAtPath(path);
    if (!target) return;
    this.buttonConfigTarget = null;
    const current = this.coerceString(target.props?.display_text);
    this.configureTextConfigControl('display_text', current);
    this.textConfigTarget = { inst: target, field: 'display_text' };
  }
  onOpenBtnCfgForNode(path: number[]): void {
    const target = this.getNodeAtPath(path);
    if (!target) return;
    this.textConfigTarget = null;
    this.twoTopicButtonTarget = null;

    const props = (target.props ??= {} as ComponentProps);
    const type = this.normalizeType((target.comp as any)?.tagName ?? (target.comp as any)?.componentType);

    if (type === 'sale') {
      const label = this.coerceString(props.textOnButton);
      const link = this.coerceString(props.url);
      const active = this.coerceBool(props.isActive, true);
      this.buttonConfigForm.reset({ label, link, active });
      this.buttonConfigTarget = target;
      return;
    }

    props.display_button ??= { label: '', link: '', active: true };
    const btn = props.display_button!;
    this.buttonConfigForm.reset({
      label: btn.label || '',
      link: btn.link || '',
      active: btn.active ?? true
    });
    this.buttonConfigTarget = target;
  }
  closeTextConfig(): void {
    this.configureTextConfigControl('display_text', '');
    this.textConfigTarget = null;
  }
  saveTextConfig(): void {
    if (!this.textConfigTarget) return;
    const control = this.textConfigForm.get('display_text');
    if (!control) return;
    const raw = control.value ?? '';
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (typeof raw === 'string' && raw !== text) {
      control.setValue(text, { emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
    if (control.invalid) {
      control.markAsTouched();
      return;
    }

    const { inst, field } = this.textConfigTarget;
    const props = (inst.props ??= {} as ComponentProps);

    if (this.isPriceField(field)) {
      if (!text) {
        delete (props as any)[field];
      } else {
        const numeric = Number(text);
        if (!Number.isFinite(numeric)) {
          control.setErrors({ number: true });
          control.markAsTouched();
          return;
        }
        (props as any)[field] = numeric;
      }
      this.closeTextConfig();
      return;
    }

    switch (field) {
      case 'leftText':
      case 'rightText': {
        props.gridTwoColumn ??= {};
        (props.gridTwoColumn as any)[field] = text;
        (props as any)[field] = text;
        break;
      }
      case 'display_text':
      case 'textDesc': {
        (props as any)[field] = text;
        break;
      }
      case 'title': {
        (props as any)[field] = text;
        (props as any).textTopic = text;
        break;
      }
      case 'textTopic': {
        (props as any).textTopic = text;
        break;
      }
      case 'topic': {
        (props as any)[field] = text;
        break;
      }
      case 'leftTitle':
      case 'rightTitle':
      case 'leftTextDesc':
      case 'rightTextDesc': {
        (props as any)[field] = text;
        break;
      }
      default: {
        (props as any)[field] = text;
      }
    }
    this.closeTextConfig();
  }

  closeButtonConfig(): void {
    this.buttonConfigForm.reset({ label: '', link: '', active: true });
    this.buttonConfigTarget = null;
    this.twoTopicButtonTarget = null;
  }
  get isButtonActive(): boolean {
    return this.coerceBool(this.buttonConfigForm.get('active')?.value, true);
  }
  setButtonActive(state: boolean): void {
    this.buttonConfigForm.patchValue({ active: state });
    const control = this.buttonConfigForm.get('active');
    control?.markAsDirty();
    control?.markAsTouched();
  }
  saveButtonConfig(): void {
    if (!this.buttonConfigTarget) return;
    const val = this.buttonConfigForm.value;
    const label = (val.label ?? '').trim();
    const link = (val.link ?? '').trim();
    const active = this.coerceBool(val.active, true);
    const target = this.buttonConfigTarget;
    const props = (target.props ??= {} as ComponentProps);

    if (this.twoTopicButtonTarget?.inst === target) {
      const side = this.twoTopicButtonTarget.side;
      const nested = (props.gridTwoColumn ??= {});
      if (side === 'left') {
        props.leftTextOnButton = label;
        props.leftUrl = link;
        props.leftIsActive = active;
        nested.leftUrl = link;
      } else {
        props.rightTextOnButton = label;
        props.rightUrl = link;
        props.rightIsActive = active;
        nested.rightUrl = link;
      }
    } else {
      props.display_button = { label, link, active };
    }

    this.closeButtonConfig();
  }
  private coerceBool(value: unknown, fallback = false): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      if (['true','1','y','yes','on'].includes(lower)) return true;
      if (['false','0','n','no','off'].includes(lower)) return false;
    }
    if (typeof value === 'number') return value !== 0;
    return fallback;
  }

  openPickerFor(inst: CompInstance) {
    if (this.normalizeType(inst.comp?.tagName ?? (inst.comp as any)?.componentType) !== 'section') return;
    inst.props.children ??= [];
    this.pickerTarget = inst;
    this.frontPickerOpen = true;
  }

  private defaultPropsFor(c: ComponentDto): ComponentProps {
    const type = ((c as any).tagName ?? (c as any)['componentType'] ?? '').toLowerCase();
    switch (type) {
      case 'banner':
        return {
          display_picture: { src: '' },
          display_text: 'Text here',
          display_button: { label: 'Text here', link: '', active: true }
        };
      case 'textbox':
        return { display_text: 'Text here' };
      case 'imagewithcaption':
        return { display_picture: { src: '' }, display_text: 'Text here' };
      case 'button':
        return {
          display_button: { label: 'Button', link: '', active: true }
        };
      case 'aboutu':
        return {
          display_picture: { src: '' },
          imageTopic: '',
          textTopic: '',
          textDesc: '',
          gridTwoColumn: { leftImage: '', leftText: '', leftUrl: '', rightImage: '', rightText: '', rightUrl: '' },
          leftImage: '',
          leftText: '',
          leftUrl: '',
          rightImage: '',
          rightText: '',
          rightUrl: ''
        };
      case 'gridtwocolumn':
        return {
          gridTwoColumn: {
            leftImage: '', leftText: 'Text here', leftUrl: '',
            rightImage: '', rightText: 'Text here', rightUrl: ''
          }
        };
      case 'formtemplate':
        return {
          topic: '',
          textOnButton: '',
          popupImage: '',
          popupText: '',
          formSlug: '',
          formComponents: []
        };
      case 'sale':
        return {
          title: '',
          text: '',          endDate: '',
          textDesc: '',
          textOnButton: 'Text here',
          textFooter: '',
          isActive: true,
          url: '',
          gridTwoColumn: { leftImage: '', leftText: '', leftUrl: '', rightImage: '', rightText: '', rightUrl: '' },
          leftImage: '',
          leftText: '',
          leftUrl: '',
          rightImage: '',
          rightText: '',
          rightUrl: ''
        };
      case 'section':
        return { children: [] };
      default:
        return {};
    }
  }

  /** ---------- Preview ---------- */
  openPreview(): void {
    this.previewComponents = this.buildPreviewTree(this.frontComponents);
    this.previewOpen = true;
  }

  closePreview(): void {
    this.previewOpen = false;
  }

  private buildPreviewTree(list: CompInstance[] | undefined): EventComponentDto[] {
    if (!Array.isArray(list) || !list.length) {
      return [];
    }

    return list.map((inst, idx) => {
      const { blocks, componentType } = this.buildComponentBlocks(inst);
      const dto: EventComponentDto & { children?: EventComponentDto[] } = {
        id: inst.comp?.componentId ?? 0,
        componentType,
        sortOrder: idx + 1,
        isOutPage: false,
        ...blocks,
      };

      const children = inst.props?.children;
      if (Array.isArray(children) && children.length) {
        dto.children = this.buildPreviewTree(children);
      }

      return dto;
    });
  }
  /** ---------- Banner upload ---------- */
  onBannerPicked(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    this.bannerFile = f;
    if (this.bannerObjectUrl) { URL.revokeObjectURL(this.bannerObjectUrl); this.bannerObjectUrl = undefined; }
    this.bannerObjectUrl = URL.createObjectURL(f);
    this.bannerUrl = this.bannerObjectUrl;
    input.value = '';
  }
  onBannerBoxClick(input: HTMLInputElement, ev: Event) {
    const el = ev.target as HTMLElement;
    if (el.closest('.banner-actions')) return;
    input.click();
  }
  onDragOver(ev: DragEvent) { ev.preventDefault(); }
  onDrop(ev: DragEvent) {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    this.bannerFile = file;
    if (this.bannerObjectUrl) URL.revokeObjectURL(this.bannerObjectUrl);
    this.bannerObjectUrl = URL.createObjectURL(file);
    this.bannerUrl = this.bannerObjectUrl;
  }
  removeBanner() {
    this.bannerFile = undefined;
    if (this.bannerObjectUrl) { URL.revokeObjectURL(this.bannerObjectUrl); this.bannerObjectUrl = undefined; }
    this.bannerUrl = null;
  }

  /** ---------- Instance image helpers ---------- */
  onInstBannerBoxClick(fileInput: HTMLInputElement, ev: Event) {
    const el = ev.target as HTMLElement;
    if (el.closest('.banner-actions')) return;
    fileInput.click();
  }
  onInstDragOver(inst: CompInstance, ev: DragEvent) {
    ev.preventDefault();
    inst.ui = inst.ui ?? {};
    inst.ui.dragOver = true;
  }
  onInstDragLeave(inst: CompInstance) { inst.ui && (inst.ui.dragOver = false); }
  onInstDrop(inst: CompInstance, ev: DragEvent) {
    ev.preventDefault();
    inst.ui = inst.ui ?? {};
    inst.ui.dragOver = false;
    const file = ev.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    this.assignImageToInst(inst, 'display_picture', file);
  }
  onComponentImagePicked(event: Event): void {
    const target = this.imagePickerTarget;
    if (!target) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('????????????????????'); input.value = ''; return; }
    this.assignImageToInst(target.inst, target.field, file);
    input.value = '';
    this.imagePickerTarget = null;
  }

  private assignImageToInst(inst: CompInstance, field: ImageField, file: File): void {
    if (!file.type.startsWith('image/')) return;
    inst.props ??= {} as ComponentProps;

    if (field === 'display_picture') {
      inst._file = file;
      if (inst.imgObjectUrl) URL.revokeObjectURL(inst.imgObjectUrl);
      const url = URL.createObjectURL(file);
      inst.imgObjectUrl = url;
      inst.props.display_picture ??= { src: '' };
      inst.props.display_picture.src = url;
      (inst.props as ComponentProps).imageTopic = url;
    } else {
      inst._fileMap ??= {};
      inst._fileMap[field] = file;

      inst.imgObjectUrls ??= {};
      const prev = inst.imgObjectUrls[field];
      if (prev) URL.revokeObjectURL(prev);
      const url = URL.createObjectURL(file);
      inst.imgObjectUrls[field] = url;

      // update nested structures / props preview
      if (field === 'leftImage' || field === 'rightImage') {
        inst.props.gridTwoColumn ??= {};
        if (field === 'leftImage') {
          inst.props.gridTwoColumn.leftImage = url;
        (inst.props as ComponentProps).leftImage = url;
        } else {
          inst.props.gridTwoColumn.rightImage = url;
        (inst.props as ComponentProps).rightImage = url;
        }
      } else {
        (inst.props as Record<string, string | undefined>)[field] = url;
      }
    }
  }
  private revokeAllObjectUrls(inst?: CompInstance): void {
    if (!inst) return;
    if (inst.imgObjectUrl) {
      URL.revokeObjectURL(inst.imgObjectUrl);
      inst.imgObjectUrl = undefined;
    }
    if (inst.imgObjectUrls) {
      for (const url of Object.values(inst.imgObjectUrls)) {
        if (url) URL.revokeObjectURL(url);
      }
      inst.imgObjectUrls = undefined;
    }
    inst._file = undefined;
    inst._fileMap = undefined;
  }

  /** ---------- Move / remove ---------- */
  onChildMoveUp(ev: NodeMutationEvent) {
    if (!ev || ev.index < 0) return;
    if (ev.path.length === 0) { this.moveFrontUp(ev.index); return; }
    if (this.isBackRootPath(ev.path)) { this.moveBackUp(ev.index); return; }
    const parent = this.getNodeAtPath(ev.path);
    if (!parent) return;
    this.childMoveUp(parent, ev.index);
  }
  onChildMoveDown(ev: NodeMutationEvent) {
    if (!ev || ev.index < 0) return;
    if (ev.path.length === 0) { this.moveFrontDown(ev.index); return; }
    if (this.isBackRootPath(ev.path)) { this.moveBackDown(ev.index); return; }
    const parent = this.getNodeAtPath(ev.path);
    if (!parent) return;
    this.childMoveDown(parent, ev.index);
  }
  onChildMoveToBack(ev: NodeMutationEvent) {
    if (!ev || ev.index < 0) return;
    if (ev.path.length === 0) { this.moveToBack(ev.index); return; }
    if (this.isBackRootPath(ev.path)) return;
    const parent = this.getNodeAtPath(ev.path);
    if (!parent) return;
    this.childMoveToBack(parent, ev.index);
  }
  onMoveFromBackToFront(ev: NodeMutationEvent) {
    if (!ev || ev.index < 0) return;
    if (!this.isBackRootPath(ev.path)) return;
    this.moveToFront(ev.index);
  }
  onChildRemove(ev: NodeMutationEvent) {
    if (!ev || ev.index < 0) return;
    if (ev.path.length === 0) { this.removeFrontComp(ev.index); return; }
    if (this.isBackRootPath(ev.path)) { this.removeBackComp(ev.index); return; }
    const parent = this.getNodeAtPath(ev.path);
    if (!parent) return;
    this.childRemove(parent, ev.index);
  }

  trackByInst = (_: number, item: CompInstance) => item.uid;
  trackByChild = (_: number, item: CompInstance) => item.comp.componentId;

  moveFrontUp(i: number) { if (i > 0) [this.frontComponents[i - 1], this.frontComponents[i]] = [this.frontComponents[i], this.frontComponents[i - 1]]; }
  moveFrontDown(i: number) { if (i < this.frontComponents.length - 1) [this.frontComponents[i + 1], this.frontComponents[i]] = [this.frontComponents[i], this.frontComponents[i + 1]]; }
  moveBackUp(j: number) { if (j > 0) [this.backComponents[j - 1], this.backComponents[j]] = [this.backComponents[j], this.backComponents[j - 1]]; }
  moveBackDown(j: number) { if (j < this.backComponents.length - 1) [this.backComponents[j + 1], this.backComponents[j]] = [this.backComponents[j], this.backComponents[j + 1]]; }
  removeFrontComp(i: number) {
    const inst = this.frontComponents[i];
    this.revokeAllObjectUrls(inst);
    this.frontComponents.splice(i, 1);
  }
  moveToBack(i: number) {
    const moved = this.frontComponents.splice(i, 1)[0];
    if (moved) this.backComponents.push(moved);
  }
  moveToFront(j: number) {
    const moved = this.backComponents.splice(j, 1)[0];
    if (moved) this.frontComponents.unshift(moved);
  }
  removeBackComp(j: number) {
    const inst = this.backComponents[j];
    this.revokeAllObjectUrls(inst);
    this.backComponents.splice(j, 1);
  }
  childMoveUp(parent: CompInstance, i: number) {
    const a = parent.props.children!; if (!a || i === 0) return;
    [a[i - 1], a[i]] = [a[i], a[i - 1]];
  }
  childMoveDown(parent: CompInstance, i: number) {
    const a = parent.props.children!; if (!a || i === a.length - 1) return;
    [a[i + 1], a[i]] = [a[i], a[i + 1]];
  }
  childRemove(parent: CompInstance, i: number) {
    const a = parent.props.children!; if (!a) return;
    const removed = a.splice(i, 1)[0];
    this.revokeAllObjectUrls(removed);
  }
  childMoveToBack(parent: CompInstance, i: number) {
    const a = parent.props.children!; if (!a) return;
    const moved = a.splice(i, 1)[0];
    this.backComponents.push(moved);
  }

  /** ---------- Path helpers ---------- */
  private isBackRootPath(path: number[]): boolean {
    return Array.isArray(path) && path.length === 1 && path[0] === this.backRoot;
  }

  private getNodeAtPath(path: number[]): CompInstance | undefined {
    if (!Array.isArray(path) || path.length === 0) return undefined;

    const isBackList = path[0] === this.backRoot;
    const startIndex = isBackList ? 1 : 0;
    const rootIndex = path[startIndex];
    if (rootIndex === undefined) return undefined;

    let node = (isBackList ? this.backComponents : this.frontComponents)[rootIndex];
    if (!node) return undefined;

    for (let i = startIndex + 1; i < path.length; i++) {
      const children = (node.props.children ?? []) as CompInstance[];
      node = children[path[i]];
      if (!node) break;
    }
    return node;
  }
  onAddChild(path: number[]): void {
    const parent = this.getNodeAtPath(path);
    if (!parent) return;

    const type = this.normalizeType(parent.comp?.tagName ?? (parent.comp as any)?.componentType);
    if (type !== 'section') return;

    parent.props.children ??= [];
    this.pickerTarget = parent;
    this.addToBack = false;
    this.frontPickerOpen = true;
  }

  /** ---------- build blocks & serialize ---------- */
  private coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeType(t?: string) { return String(t ?? '').trim().toLowerCase(); }

  private buildComponentBlocks(inst: CompInstance) {
    const t = this.normalizeType((inst.comp as any).tagName ?? (inst.comp as any)['componentType']);
    const p = inst.props || {};
    const blocks: any = {};

    if (t === 'banner') {
      blocks.banner = {
        image: p.display_picture?.src || '',
        textDesc: p.display_text || '',
        textOnButton: p.display_button?.label || '',
        isActive: (p.display_button as any)?.active ?? true,
        urlButton: p.display_button?.link || ''
      };
    }
    if (t === 'textbox') {
      blocks.textBox = { text: p.display_text || '' };
    }
    if (t === 'imagewithcaption') {
      blocks.imageWithCaption = { image: p.display_picture?.src || '', text: p.display_text || '' };
    }
    if (t === 'imagedesc') {
      blocks.imageDesc = { image: p.display_picture?.src || '', text: p.display_text || '' };
    }
    if (t === 'gridtwocolumn') {
      const g = p.gridTwoColumn ?? {};
      blocks.gridTwoColumn = {
        leftImage:  g.leftImage  || '',
        leftText:   g.leftText   || '',
        leftUrl:    g.leftUrl    || '',
        rightImage: g.rightImage || '',
        rightText:  g.rightText  || '',
        rightUrl:   g.rightUrl   || '',
      };
    }
    if (t === 'gridfourimage') {
      blocks.gridFourImage = {
        image1: p.image1 || '', image2: p.image2 || '', image3: p.image3 || '', image4: p.image4 || '',
      };
    }
    if (t === 'button') {
      blocks.button = {
        textOnButton: p.display_button?.label || '',
        isActive: (p.display_button as any)?.active ?? true,
        url: p.display_button?.link || ''
      };
    }
    if (t === 'formtemplate') {
      const components = Array.isArray((p as any).formComponents)
        ? (p as any).formComponents
            .filter((comp: FormComponentTemplateDto | null | undefined) => !!comp)
            .map((comp: FormComponentTemplateDto) => ({ ...comp }))
        : [];
      const url = this.coerceString((p as any).formSlug);
      const templateId = (p as any).formTemplateId;
      blocks.formTemplate = {
        topic: this.coerceString(p.topic),
        textOnButton: this.coerceString(p.textOnButton),
        popupImage: this.coerceString(p.popupImage),
        popupText: this.coerceString(p.popupText),
        url,
        components
      };
      if (templateId != null) {
        (blocks.formTemplate as any).formTemplateId = templateId;
      }
    }
    if (t === 'onetopicimagecaptionbutton') {
      blocks.oneTopicImageCaptionButton = {
        title: p.title || '',
        image: (p as any).image || p.display_picture?.src || '',
        textDesc: p.textDesc || p.display_text || '',
        textOnButton: p.display_button?.label || p.textOnButton || '',
        isActive: (p.display_button as any)?.active ?? p.isActive ?? true,
        url: p.display_button?.link || p.url || ''
      };
    }
    if (t === 'twotopicimagecaptionbutton') {
      blocks.twoTopicImageCaptionButton = {
        leftTitle: p.leftTitle || '',
        leftImage: p.image1 || p.gridTwoColumn?.leftImage || '',
        leftTextDesc: p.leftTextDesc || '',
        leftTextOnButton: p.leftTextOnButton || '',
        leftIsActive: p.leftIsActive ?? true,
        leftUrl: p.gridTwoColumn?.leftUrl || '',
        rightTitle: p.rightTitle || '',
        rightImage: p.image2 || p.gridTwoColumn?.rightImage || '',
        rightTextDesc: p.rightTextDesc || '',
        rightTextOnButton: p.rightTextOnButton || '',
        rightIsActive: p.rightIsActive ?? true,
        rightUrl: p.gridTwoColumn?.rightUrl || ''
      };
    }
    if (t === 'tablewithtopicanddesc') {
      blocks.tableWithTopicAndDesc = { title: p.title || '', textDesc: p.textDesc || '' };
    }
    if (t === 'aboutu') {
      const grid = p.gridTwoColumn ?? {};
      blocks.aboutU = {
        imageTopic: p.imageTopic || p.display_picture?.src || '',
        textTopic: p.textTopic || p.title || '',
        textDesc: p.textDesc || '',
        leftImage: grid.leftImage || p.leftImage || '',
        leftText: grid.leftText || p.leftText || '',
        leftUrl: grid.leftUrl || p.leftUrl || '',
        rightImage: grid.rightImage || p.rightImage || '',
        rightText: grid.rightText || p.rightText || '',
        rightUrl: grid.rightUrl || p.rightUrl || '',
      };
    }
    if (t === 'sale') {
      blocks.sale = {
        title: p.title || '', text: p.text || '',
        promoPrice: Number(p.promoPrice ?? 0), price: Number(p.price ?? 0), endDate: p.endDate || '',
        textDesc: p.textDesc || '', textOnButton: p.textOnButton || '', textFooter: p.textFooter || '',
        leftImage: p.gridTwoColumn?.leftImage || '', leftText: p.gridTwoColumn?.leftText || '',
        rightImage: p.gridTwoColumn?.rightImage || '', rightText: p.gridTwoColumn?.rightText || '',
        isActive: p.isActive ?? true, url: p.url || ''
      };
    }
    if (t === 'section') {
      blocks.section = {};
    }

    return { blocks, componentType: t };
  }

  private async serializeListForSchema(list: CompInstance[], isOutPage: boolean) {
    const result: EventComponentDto[] = [];
    for (let i = 0; i < list.length; i++) {
      result.push(await this.serializeOneForSchema(list[i], i + 1, isOutPage));
    }
    return result;
  }

  private async serializeOneForSchema(inst: CompInstance, sortOrder: number, isOutPage: boolean): Promise<EventComponentDto> {
    const { blocks, componentType } = this.buildComponentBlocks(inst);

    if (inst._file) {
      const b64 = await this.toBase64(inst._file);
      if (blocks.banner) blocks.banner.image = b64;
      if (blocks.imageWithCaption) blocks.imageWithCaption.image = b64;
      if (blocks.imageDesc) blocks.imageDesc.image = b64;
      if (blocks.oneTopicImageCaptionButton && !blocks.oneTopicImageCaptionButton.image) blocks.oneTopicImageCaptionButton.image = b64;
      if (blocks.aboutU && !blocks.aboutU.imageTopic) blocks.aboutU.imageTopic = b64;
      if (blocks.gridTwoColumn) blocks.gridTwoColumn.leftImage = b64; // default ???????
      if (blocks.gridFourImage && !blocks.gridFourImage.image1) blocks.gridFourImage.image1 = b64;
    }
    if (inst._fileMap) {
      for (const [field, file] of Object.entries(inst._fileMap)) {
        const b64 = await this.toBase64(file);
        switch (field) {
          case 'leftImage':
            if (blocks.gridTwoColumn) blocks.gridTwoColumn.leftImage = b64;
            if (blocks.aboutU) blocks.aboutU.leftImage = b64;
            if (blocks.sale) blocks.sale.leftImage = b64;
            if (blocks.twoTopicImageCaptionButton) blocks.twoTopicImageCaptionButton.leftImage = b64;
            break;
          case 'rightImage':
            if (blocks.gridTwoColumn) blocks.gridTwoColumn.rightImage = b64;
            if (blocks.aboutU) blocks.aboutU.rightImage = b64;
            if (blocks.sale) blocks.sale.rightImage = b64;
            if (blocks.twoTopicImageCaptionButton) blocks.twoTopicImageCaptionButton.rightImage = b64;
            break;
          case 'image1':
            if (blocks.gridFourImage) blocks.gridFourImage.image1 = b64;
            break;
          case 'image2':
            if (blocks.gridFourImage) blocks.gridFourImage.image2 = b64;
            break;
          case 'image3':
            if (blocks.gridFourImage) blocks.gridFourImage.image3 = b64;
            break;
          case 'image4':
            if (blocks.gridFourImage) blocks.gridFourImage.image4 = b64;
            break;
          case 'popupImage':
            if (blocks.formTemplate) blocks.formTemplate.popupImage = b64;
            break;
        }
      }
    }

    return {
      id: 0,
      componentType,
      sortOrder,
      isOutPage,
      ...blocks
    } as EventComponentDto;
  }

  /** ---------- SAVE ---------- */
  async save() {
    this.submitAttempted = true;
    this.errors = {};
    const name = this.form.value.name?.trim() || '';
    const endDate = this.form.value.endDate || '';
    const isFav = !!this.form.value.isFav;

    const requiredMessage = 'Please Complete all required fields';

    if (!endDate) this.errors.endDate = requiredMessage;
    else if (endDate < this.todayStr) this.errors.endDate = 'End date cannot be in the past.';
    if (!name) this.errors.eventName = requiredMessage;

    if (this.errors.endDate || this.errors.eventName) {
      setTimeout(() => document.querySelector('.field.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }

    if (this.hasInvalidSaleComponents()) {
      setTimeout(() => document.querySelector('.sale-editor__field.is-invalid, .sale-editor__error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }

    this.submitting = true;

    // Always send JSON + base64 (server expects application/json)
    const front = await this.serializeListForSchema(this.frontComponents, false);
    const back = await this.serializeListForSchema(this.backComponents, true);
    const components: EventComponentDto[] = [...front, ...back];

    const dtoJson: EventCreateDto = {
      name,
      isFavorite: isFav,
      fileImage: this.bannerFile ? await this.toBase64(this.bannerFile) : '',
      endDate: this.toLocalEndDateString(endDate),
      categoryIds: this.categories.filter(c => c.selected).map(c => c.id),
      components
    };

    this.events.create(dtoJson).subscribe({
      next: () => {
        this.submitting = false;
        this.clearDraft();
        this.submitAttempted = false;
        this.showToast('Created event successfully');
      },
      error: (err: unknown) => { this.submitting = false; const message = (err as { error?: string })?.error ?? 'Create failed'; alert(message); }
    });
  }

  private hasInvalidSaleComponents(): boolean {
    return this.listHasInvalidSale(this.frontComponents) || this.listHasInvalidSale(this.backComponents);
  }

  private listHasInvalidSale(list: CompInstance[]): boolean {
    for (const inst of list) {
      if (this.compHasInvalidSale(inst)) {
        return true;
      }
    }
    return false;
  }

  private compHasInvalidSale(inst: CompInstance): boolean {
    const type = this.normalizeType((inst.comp as any)?.tagName ?? (inst.comp as any)?.componentType);
    if (type === 'sale') {
      const props = (inst.props ?? {}) as ComponentProps;
      if (!this.isValidSaleNumber((props as any).promoPrice)) {
        return true;
      }
      if (!this.isValidSaleNumber((props as any).price)) {
        return true;
      }
      if (this.saleDateHasIssue((props as any).endDate)) {
        return true;
      }
    }
    const children = (inst.props?.children ?? []) as CompInstance[];
    for (const child of children) {
      if (this.compHasInvalidSale(child)) {
        return true;
      }
    }
    return false;
  }

  private isValidSaleNumber(value: unknown): boolean {
    const numeric = this.parseSaleNumber(value);
    return numeric !== null && numeric > 0;
  }

  private parseSaleNumber(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
      if (!cleaned.trim()) {
        return null;
      }
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private saleDateHasIssue(value: unknown): boolean {
    const str = this.coerceString(value);
    if (!str) return true;
    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) {
      return true;
    }
    return parsed.getTime() < Date.now();
  }

  /** ---------- utils ---------- */
  private toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  private toYMD(d: Date) { const pad = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  // Build local end date string with timezone offset, e.g., 2025-09-20T23:59:59+07:00
  private toLocalEndDateString(ymd: string): string {
    // ymd in format YYYY-MM-DD from input[type=date]
    const local = new Date(`${ymd}T23:59:59`);
    const offMin = new Date().getTimezoneOffset(); // UTC - Local
    const sign = offMin <= 0 ? '+' : '-';
    const abs = Math.abs(offMin);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    const offset = `${sign}${hh}:${mm}`;
    const y = local.getFullYear();
    const m = String(local.getMonth() + 1).padStart(2, '0');
    const d = String(local.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T23:59:59${offset}`;
  }


  private scheduleDraftSave(): void {
    if (this.restoringDraft) return;
    if (this.draftSaveHandle) {
      clearTimeout(this.draftSaveHandle);
    }
    this.draftSaveHandle = setTimeout(() => {
      this.draftSaveHandle = null;
      this.persistDraft();
    }, 200);
  }

  private markStateChanged(): void {
    if (this.restoringDraft) return;
    this.pendingCategoryIds = this.categories.filter(c => c.selected).map(c => c.id);
    this.scheduleDraftSave();
  }

  private persistDraft(): void {
    if (this.restoringDraft) return;
    if (this.skipNextPersist) {
      this.skipNextPersist = false;
      return;
    }
    const raw = this.form.getRawValue();
    const draft: EventDraft = {
      form: {
        endDate: raw.endDate ?? '',
        name: raw.name ?? '',
        isFav: !!raw.isFav
      },
      selectedCategoryIds: this.categories.filter(c => c.selected).map(c => c.id)
    };
    try {
      localStorage.setItem(this.draftStorageKey, JSON.stringify(draft));
    } catch (error) {
      console.warn('Unable to persist draft', error);
    }
  }

  private restoreDraft(): void {
    const stored = localStorage.getItem(this.draftStorageKey);
    if (!stored) return;
    try {
      const draft = JSON.parse(stored) as EventDraft;
      this.restoringDraft = true;
      if (draft.form) {
        this.form.reset({
          endDate: draft.form.endDate ?? '',
          name: draft.form.name ?? '',
          isFav: !!draft.form.isFav
        });
        this.form.markAsPristine();
      }
      this.pendingCategoryIds = Array.isArray(draft.selectedCategoryIds) ? draft.selectedCategoryIds : [];
      this.applyPendingCategorySelection();
    } catch (error) {
      console.error('Failed to restore draft', error);
      this.clearDraft();
    } finally {
      this.restoringDraft = false;
    }
  }

  private applyPendingCategorySelection(): void {
    if (!this.categories.length) return;
    if (!this.pendingCategoryIds.length) return;
    const set = new Set(this.pendingCategoryIds);
    this.categories = this.categories.map(cat => ({ ...cat, selected: set.has(cat.id) }));
    this.pendingCategoryIds = this.categories.filter(c => c.selected).map(c => c.id);
  }

  private clearDraft(): void {
    localStorage.removeItem(this.draftStorageKey);
    this.pendingCategoryIds = [];
    this.skipNextPersist = true;
  }

  private flushDraftSave(): void {
    if (this.draftSaveHandle) {
      clearTimeout(this.draftSaveHandle);
      this.draftSaveHandle = null;
    }
    this.persistDraft();
  }
  logout(): void {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    this.router.navigate(['/Login']);
  }

  @HostListener('window:beforeunload')
  handleBeforeUnload(): void {
    this.flushDraftSave();
  }

  // success modal helpers
  showModal(message: string) {
    this.modalMessage = message;
    this.modalOpen = true;
  }
  closeModal() {
    this.modalOpen = false;
    this.modalMessage = '';
    this.router.navigate(['/manage-events']);
  }

  // toast helpers
  showToast(message: string) {
    this.toastMessage = message;
    this.toastOpen = true;
    setTimeout(() => {
      this.toastOpen = false;
      this.router.navigate(['/manage-events']);
    }, 1500);
  }

  // cleanup
  ngOnDestroy(): void {
    this.formChangesSub?.unsubscribe();
    this.flushDraftSave();
    [this.frontComponents, this.backComponents].forEach(list => {
      list.forEach(inst => this.revokeAllObjectUrls(inst));
    });
    if (this.bannerObjectUrl) { URL.revokeObjectURL(this.bannerObjectUrl); this.bannerObjectUrl = undefined; }
  }
}








































































































