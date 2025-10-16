import { Component, OnDestroy, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { EventService } from '../../domain/event.service';
import { EventpService } from '../../domain/eventp.service';
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
import { FormTemplateTextEvent, FormTemplateImageEvent } from '../form-template-node/form-template-node.component';
import { SaleTextEvent, SaleDateChangeEvent } from '../sale-node/sale-node.component';

/** ---------- Local helper types ---------- */
type Category = { id: number; name: string; selected: boolean };

// ?????? event ??? GridTwoColumn node
type GridImageEvent = { path: number[]; side: 'left' | 'right' };
type ImageField = 'display_picture' | 'leftImage' | 'rightImage' | 'popupImage' | 'formComponentImage' | GridFourImageField;
type TextField  = 'display_text' | 'leftText' | 'rightText' | 'title' | 'textDesc' | 'textTopic' | 'topic' | 'leftTitle' | 'rightTitle' | 'leftTextDesc' | 'rightTextDesc' | 'text' | 'componentText' | 'promoPrice' | 'price' | 'endDate' | 'textFooter';

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
type FileEntry = { key: string; file: File };

type EventDraft = {
  form?: { endDate?: string; name?: string; isFav?: boolean };
  selectedCategoryIds?: number[];
};

type AboutImageField = 'hero' | 'left' | 'right';

const IMAGE_ONLY_FILE_MESSAGE = 'Please upload only image file (jpg, jpeg, png)';

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
  formTextComponentTarget: FormComponentTemplateDto | null = null;
  buttonConfigTarget: CompInstance | null = null;
  twoTopicButtonTarget: { inst: CompInstance; side: TwoTopicSide } | null = null;
  gridTwoUrlTarget: CompInstance | null = null;

  imagePickerTarget: { inst: CompInstance; field: ImageField; formComponent?: FormComponentTemplateDto } | null = null;
  private formComponentImageSerial = 0;
  @ViewChild('componentImageInput') componentImageInput?: ElementRef<HTMLInputElement>;

  private readonly textConfigDefaultValidators = [Validators.maxLength(500)];
  private readonly priceFieldPattern = /^(?:\d+(?:\.\d+)?)?$/;

  private readonly textFieldLabels: Record<TextField, string> = {
    display_text: 'ข้อความ',
    leftText: 'ข้อความด้านซ้าย',
    rightText: 'ข้อความด้านขวา',
    title: 'หัวข้อ',
    textDesc: 'รายละเอียด',
    textTopic: 'หัวข้อย่อย',
    topic: 'หัวข้อฟอร์ม',
    leftTitle: 'หัวข้อด้านซ้าย',
    rightTitle: 'หัวข้อด้านขวา',
    leftTextDesc: 'รายละเอียดด้านซ้าย',
    rightTextDesc: 'รายละเอียดด้านขวา',
    text: 'ข้อความ',
    componentText: 'ข้อความฟอร์ม',
    promoPrice: 'ราคาโปรโมชั่น',
    price: 'ราคาปกติ',
    endDate: 'วันสิ้นสุด',
    textFooter: 'ข้อความส่วนท้าย'
  };

  private readonly formComponentTextLabels: Record<FormComponentTemplateDto['componentType'], string> = {
    singleSelection: 'คำถามแบบเลือกคำตอบ',
    textField: 'คำถามแบบข้อความ',
    date: 'คำถามช่องวันที่',
    birthDate: 'ป้ายชื่อวันเกิด',
    imageUpload: 'ข้อความอัปโหลดรูป',
    imageUploadWithImageContent: 'คำอธิบายรูปภาพ',
    formButton: 'ข้อความปุ่มแบบฟอร์ม'
  };


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

  private draftStorageKey = 'create-event-draft';
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
    private eventp: EventpService,
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

  // à¸‹à¹ˆà¸­à¸™à¸Šà¹ˆà¸­à¸‡à¸à¸£à¸­à¸à¸•à¸­à¸™à¹€à¸›à¸´à¸” (à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹‚à¸Šà¸§à¹Œà¸ˆà¸™à¸à¸§à¹ˆà¸²à¸ˆà¸°à¸à¸” +)
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

  // reset & à¸‹à¹ˆà¸­à¸™ input à¹€à¸ªà¸¡à¸­
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

    // reset à¸Šà¹ˆà¸­à¸‡à¸à¸£à¸­à¸ à¹à¸¥à¸°à¸‹à¹ˆà¸­à¸™
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
    const current = ((target.props as any)[field] as string | undefined) || '';
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
  onOpenFormTemplateImage(ev: FormTemplateImageEvent): void {
    const target = this.getNodeAtPath(ev.path);
    if (!target) return;
    this.imagePickerTarget = { inst: target, field: 'formComponentImage', formComponent: ev.component };
    this.componentImageInput?.nativeElement?.click();
  }

  onOpenFormTemplateText(ev: FormTemplateTextEvent): void {
    const target = this.getNodeAtPath(ev.path);
    if (!target) return;
    this.buttonConfigTarget = null;
    const field = (ev.field === 'componentText' ? 'componentText' : ev.field) as TextField;
    const props = (target.props ??= {} as ComponentProps);

    let current = '';
    if (field === 'componentText') {
      const component = ev.component ?? null;
      this.formTextComponentTarget = component ?? null;
      if (component) {
        if (component.componentType === 'date' || component.date) {
          component.date ??= { text: '' };
          current = this.coerceString(component.date?.text);
        } else if (component.componentType === 'birthDate' || component.birthDate) {
          component.birthDate ??= { label: '' };
          current = this.coerceString(component.birthDate?.label);
        } else if (component.componentType === 'imageUpload' || component.imageUpload) {
          component.imageUpload ??= { text: '' };
          current = this.coerceString(component.imageUpload?.text);
        } else if (component.componentType === 'imageUploadWithImageContent' || component.imageUploadWithImageContent) {
          component.imageUploadWithImageContent ??= { textDesc: '', image: '' };
          current = this.coerceString(component.imageUploadWithImageContent?.textDesc);
        } else if (component.componentType === 'formButton' || component.formButton) {
          component.formButton ??= { textOnButton: 'Button', isActive: true, url: '' };
          current = this.coerceString(component.formButton?.textOnButton);
        } else {
          component.textField ??= { text: '' };
          current = this.coerceString(component.textField?.text);
        }
      } else {
        current = this.coerceString((props as any).componentText);
      }
    } else {
      this.formTextComponentTarget = null;
      current = this.coerceString((props as any)[field]);
    }

    this.configureTextConfigControl('display_text', current);
    this.textConfigTarget = { inst: target, field };
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

  get textConfigTitle(): string {
    const field = this.textConfigTarget?.field ?? null;
    if (!field) {
      return 'แก้ไขข้อความ';
    }

    if (field === 'componentText') {
      const component = this.formTextComponentTarget;
      if (component) {
        const label = this.formComponentTextLabels[component.componentType];
        if (label) {
          return label;
        }
      }
    }

    return this.textFieldLabels[field] ?? 'แก้ไขข้อความ';
  }

  get textConfigDialogLabel(): string {
    return this.textConfigTitle;
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
    this.formTextComponentTarget = null;
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

    if (field === 'componentText') {
      const component = this.formTextComponentTarget;
      if (component) {
        if (component.componentType === 'date' || component.date) {
          component.date ??= { text: '' };
          component.date.text = text;
        } else if (component.componentType === 'birthDate' || component.birthDate) {
          component.birthDate ??= { label: '' };
          component.birthDate.label = text;
        } else if (component.componentType === 'imageUpload' || component.imageUpload) {
          component.imageUpload ??= { text: '' };
          component.imageUpload.text = text;
        } else if (component.componentType === 'formButton' || component.formButton) {
          component.formButton ??= { textOnButton: 'Button', isActive: true, url: '' };
          component.formButton.textOnButton = text;
        } else if (component.componentType === 'imageUploadWithImageContent' || component.imageUploadWithImageContent) {
          component.imageUploadWithImageContent ??= { textDesc: '', image: '' };
          component.imageUploadWithImageContent.textDesc = text;
        } else {
          component.textField ??= { text: '' };
          component.textField.text = text;
        }
      }
      (props as any).componentText = text;
      this.closeTextConfig();
      return;
    }

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
          display_text: '',
          display_button: { label: '', link: '', active: true }
        };
      case 'textbox':
        return { display_text: '' };
      case 'imagewithcaption':
        return { display_picture: { src: '' }, display_text: '' };
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
            leftImage: '', leftText: '', leftUrl: '',
            rightImage: '', rightText: '', rightUrl: ''
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
          textOnButton: '',
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
      const dto: EventComponentDto = {
        id: inst.comp?.componentId ?? 0,
        componentType,
        sortOrder: idx + 1,
        isOutPage: false,
        ...blocks,
      };

      const children = inst.props?.children;
      const normalized = this.normalizeType(componentType);
      if (normalized === 'section') {
        const nested = Array.isArray(children) && children.length ? this.buildPreviewTree(children) : [];
        dto.section = { components: nested };
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
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      if (input) input.value = '';
      this.imagePickerTarget = null;
      return;
    }

    const isAllowedImage = this.isAllowedImageType(file);

    if (target.field === 'formComponentImage') {
      if (!isAllowedImage) {
        this.setFormComponentImageError(target.formComponent, 'invalidType');
        if (input) input.value = '';
        this.imagePickerTarget = null;
        return;
      }
    } else if (target.field === 'popupImage') {
      if (!isAllowedImage) {
        this.setFormTemplatePopupImageError(target.inst, IMAGE_ONLY_FILE_MESSAGE);
        if (input) input.value = '';
        this.imagePickerTarget = null;
        return;
      }
    } else if (!file.type.startsWith('image/')) {
      alert(IMAGE_ONLY_FILE_MESSAGE);
      if (input) input.value = '';
      this.imagePickerTarget = null;
      return;
    }

    this.assignImageToInst(target.inst, target.field, file, target.formComponent);
    if (input) input.value = '';
    this.imagePickerTarget = null;
  }

  private assignImageToInst(inst: CompInstance, field: ImageField, file: File, formComponent?: FormComponentTemplateDto): void {
    if (!file.type.startsWith('image/')) return;
    if (field === 'formComponentImage') {
      if (formComponent) {
        this.updateFormComponentImage(formComponent, file);
      }
      return;
    }
    inst.props ??= {} as ComponentProps;
    if (field === 'popupImage') {
      this.setFormTemplatePopupImageError(inst, null);
    }

    if (field === 'display_picture') {
      inst._file = file;
      if (inst.imgObjectUrl) URL.revokeObjectURL(inst.imgObjectUrl);
      const url = URL.createObjectURL(file);
      inst.imgObjectUrl = url;
      inst.props.display_picture ??= { src: '' };
      inst.props.display_picture.src = url;
      (inst.props as ComponentProps).imageTopic = url;
      if (this.isAboutUInst(inst)) {
        this.setAboutUImageError(inst, 'hero', null);
      }
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
          if (this.isAboutUInst(inst)) {
            this.setAboutUImageError(inst, 'left', null);
          }
        } else {
          inst.props.gridTwoColumn.rightImage = url;
          (inst.props as ComponentProps).rightImage = url;
          if (this.isAboutUInst(inst)) {
            this.setAboutUImageError(inst, 'right', null);
          }
        }
      } else {
        (inst.props as Record<string, string | undefined>)[field] = url;
      }
    }
  }

  private setFormTemplatePopupImageError(inst: CompInstance, message: string | null): void {
    inst.props ??= {} as ComponentProps;
    const props = inst.props as Record<string, unknown>;
    if (message) {
      props['popupImageError'] = message;
    } else if ("popupImageError" in props) {
      delete props['popupImageError'];
    }
  }

  private setAboutUImageError(inst: CompInstance, field: AboutImageField, message: string | null): void {
    inst.props ??= {} as ComponentProps;
    const props = inst.props as Record<string, unknown>;
    const key = field === 'hero'
      ? 'aboutHeroError'
      : field === 'left'
        ? 'aboutLeftError'
        : 'aboutRightError';
    if (message) {
      props[key] = message;
    } else if (key in props) {
      delete props[key];
    }
  }

  private updateFormComponentImage(formComponent: FormComponentTemplateDto, file: File): void {
    formComponent.imageUploadWithImageContent ??= { textDesc: '', image: '' };
    const model = formComponent.imageUploadWithImageContent as { image?: string; __imageError?: string | null; __pendingId?: number };
    this.setFormComponentImageError(formComponent, null);
    const runId = ++this.formComponentImageSerial;
    model.image = '';
    (model as any).__pendingId = runId;
    this.toBase64(file)
      .then(dataUrl => {
        if ((model as any).__pendingId !== runId) return;
        model.image = dataUrl;
        delete (model as any).__pendingId;
      })
      .catch(() => {
        if ((model as any).__pendingId === runId) {
          delete (model as any).__pendingId;
        }
        model.image = '';
        this.setFormComponentImageError(formComponent, 'invalidType');
      });
  }

  private setFormComponentImageError(component: FormComponentTemplateDto | undefined, reason: 'invalidType' | 'missing' | null): void {
    if (!component) return;
    component.imageUploadWithImageContent ??= { textDesc: '', image: '' };
    const state = component.imageUploadWithImageContent as { __imageError?: string | null; __pendingId?: number };
    if (reason) {
      state.__imageError = reason;
      if ((state as any).__pendingId != null) {
        delete (state as any).__pendingId;
      }
    } else if (state.__imageError) {
      delete state.__imageError;
    }
  }

  private serializeFormComponents(list: FormComponentTemplateDto[] | null | undefined): FormComponentTemplateDto[] {
    if (!Array.isArray(list)) {
      return [];
    }
    const result: FormComponentTemplateDto[] = [];
    for (const comp of list) {
      if (!comp) continue;
      const clone: FormComponentTemplateDto = { ...comp };
      if (comp.imageUploadWithImageContent) {
        const source = comp.imageUploadWithImageContent;
        clone.imageUploadWithImageContent = {
          textDesc: source.textDesc ?? '',
          image: typeof source.image === 'string' ? source.image : '',
        };
      }
      if (comp.formButton) {
        const btn = comp.formButton;
        clone.formButton = {
          textOnButton: btn.textOnButton ?? 'Button',
          isActive: btn.isActive ?? true,
          url: btn.url ?? '',
        };
      }
      if (comp.imageUpload) {
        clone.imageUpload = { ...comp.imageUpload };
      }
      result.push(clone);
    }
    return result;
  }

  private validateFormTemplateImages(): boolean {
    let hasError = false;
    const inspect = (list: CompInstance[]) => {
      for (const inst of list) {
        const comps = inst.props?.formComponents;
        if (!Array.isArray(comps)) continue;
        for (const comp of comps) {
          if (!comp || comp.isDelete) continue;
          if (comp.componentType !== 'imageUploadWithImageContent' && !comp.imageUploadWithImageContent) continue;
          comp.imageUploadWithImageContent ??= { textDesc: '', image: '' };
          const state = comp.imageUploadWithImageContent as { image?: string; __imageError?: string | null };
          if (state.__imageError === 'invalidType') {
            hasError = true;
            continue;
          }
          const image = typeof state.image === 'string' ? state.image.trim() : '';
          if (!image) {
            this.setFormComponentImageError(comp, 'missing');
            hasError = true;
          } else if (state.__imageError) {
            this.setFormComponentImageError(comp, null);
          }
        }
      }
    };
    inspect(this.frontComponents);
    inspect(this.backComponents);
    return hasError;
  }

  private validateAboutUImages(): boolean {
    let hasError = false;
    const inspect = (list: CompInstance[] | null | undefined) => {
      if (!Array.isArray(list)) return;
      for (const inst of list) {
        if (this.isAboutUInst(inst)) {
          const hero = this.resolveAboutUImage(inst, 'hero');
          if (!hero) {
            this.setAboutUImageError(inst, 'hero', IMAGE_ONLY_FILE_MESSAGE);
            hasError = true;
          } else {
            this.setAboutUImageError(inst, 'hero', null);
          }

          const left = this.resolveAboutUImage(inst, 'left');
          if (!left) {
            this.setAboutUImageError(inst, 'left', IMAGE_ONLY_FILE_MESSAGE);
            hasError = true;
          } else {
            this.setAboutUImageError(inst, 'left', null);
          }

          const right = this.resolveAboutUImage(inst, 'right');
          if (!right) {
            this.setAboutUImageError(inst, 'right', IMAGE_ONLY_FILE_MESSAGE);
            hasError = true;
          } else {
            this.setAboutUImageError(inst, 'right', null);
          }
        }

        const children = inst.props?.children as CompInstance[] | undefined;
        if (children && children.length) {
          inspect(children);
        }
      }
    };
    inspect(this.frontComponents);
    inspect(this.backComponents);
    return hasError;
  }

  private isAllowedImageType(file: File): boolean {
    const type = (file.type || '').toLowerCase();
    if (type && ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(type)) {
      return true;
    }
    const name = (file.name || '').toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].some(ext => name.endsWith(ext));
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
            .map((comp: FormComponentTemplateDto) => {
              const normalizedType = this.normalizeType(comp.componentType);
              return { ...comp, componentType: normalizedType as FormComponentTemplateDto['componentType'] };
            })
        : [];
      blocks.formTemplate = {
        topic: this.coerceString(p.topic),
        textOnButton: this.coerceString(p.textOnButton),
        popupImage: this.coerceString(p.popupImage),
        popupText: this.coerceString(p.popupText),
        components
      };
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
      blocks.section = { components: [] };
    }

    return { blocks, componentType: t };
  }


  private async serializeListForSchema(list: CompInstance[], isOutPage: boolean, baseKey: string, startIndex = 0): Promise<{ components: EventComponentDto[]; files: FileEntry[] }> {
    const components: EventComponentDto[] = [];
    const files: FileEntry[] = [];
    if (!Array.isArray(list) || !list.length) {
      return { components, files };
    }

    for (let i = 0; i < list.length; i++) {
      const prefix = `${baseKey}[${startIndex + i}]`;
      const { dto, files: collected } = await this.serializeOneForSchema(list[i], i + 1, isOutPage, prefix);
      components.push(dto);
      files.push(...collected);
    }

    return { components, files };
  }

  private async serializeOneForSchema(inst: CompInstance, sortOrder: number, isOutPage: boolean, keyPrefix: string): Promise<{ dto: EventComponentDto; files: FileEntry[] }> {
    const { blocks, componentType } = this.buildComponentBlocks(inst);
    const normalizedComponentType = (componentType || '').toLowerCase();
    const dto: EventComponentDto = {
      id: inst.comp?.componentId ?? 0,
      componentType: normalizedComponentType,
      sortOrder,
      isOutPage,
      ...blocks
    };

    const files: FileEntry[] = [];

    if (normalizedComponentType === 'section') {
      const children = (inst.props?.children ?? []) as CompInstance[];
      const { components: nested, files: nestedFiles } = await this.serializeListForSchema(children, isOutPage, `${keyPrefix}.section.components`);
      dto.section = { components: nested };
      files.push(...nestedFiles);
    }

    files.push(...this.collectFilesForComponent(inst, normalizedComponentType, keyPrefix, dto));
    this.stripBlobUrlsFromDto(dto);

    return { dto, files };
  }


  private collectFilesForComponent(inst: CompInstance, type: string, keyPrefix: string, dto: EventComponentDto): FileEntry[] {
    const entries: FileEntry[] = [];
    if (inst._file) {
      const suffix = this.resolvePrimaryImageKey(type);
      if (suffix) {
        this.clearDtoImageValue(dto, suffix);
        entries.push({ key: `${keyPrefix}.${suffix}`, file: inst._file });
      }
    }
    if (inst._fileMap) {
      for (const [field, file] of Object.entries(inst._fileMap)) {
        const suffix = this.resolveMappedImageKey(type, field);
        if (!suffix) continue;
        this.clearDtoImageValue(dto, suffix);
        entries.push({ key: `${keyPrefix}.${suffix}`, file });
      }
    }
    return entries;
  }

  private resolvePrimaryImageKey(type: string): string | null {
    switch (type) {
      case 'banner': return 'banner.image';
      case 'imagewithcaption': return 'imageWithCaption.image';
      case 'imagedesc': return 'imageDesc.image';
      case 'onetopicimagecaptionbutton': return 'oneTopicImageCaptionButton.image';
      case 'aboutu': return 'aboutU.imageTopic';
      default: return null;
    }
  }

  private resolveMappedImageKey(type: string, field: string): string | null {
    switch (field) {
      case 'leftImage':
        if (type === 'gridtwocolumn') return 'gridTwoColumn.leftImage';
        if (type === 'twotopicimagecaptionbutton') return 'twoTopicImageCaptionButton.leftImage';
        if (type === 'sale') return 'sale.leftImage';
        if (type === 'aboutu') return 'aboutU.leftImage';
        return null;
      case 'rightImage':
        if (type === 'gridtwocolumn') return 'gridTwoColumn.rightImage';
        if (type === 'twotopicimagecaptionbutton') return 'twoTopicImageCaptionButton.rightImage';
        if (type === 'sale') return 'sale.rightImage';
        if (type === 'aboutu') return 'aboutU.rightImage';
        return null;
      case 'image1':
        return type === 'gridfourimage' ? 'gridFourImage.image1' : null;
      case 'image2':
        return type === 'gridfourimage' ? 'gridFourImage.image2' : null;
      case 'image3':
        return type === 'gridfourimage' ? 'gridFourImage.image3' : null;
      case 'image4':
        return type === 'gridfourimage' ? 'gridFourImage.image4' : null;
      case 'popupImage':
        return type === 'formtemplate' ? 'formTemplate.popupImage' : null;
      default:
        return null;
    }
  }

  private clearDtoImageValue(dto: EventComponentDto, path: string): void {
    const segments = path.split('.');
    let target: any = dto;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (typeof target[seg] !== 'object' || target[seg] === null) {
        target[seg] = {};
      }
      target = target[seg];
    }
    const last = segments[segments.length - 1];
    const current = target[last];
    if (typeof current === 'string' && current.startsWith('blob:')) {
      target[last] = '';
    } else if (current == null) {
      target[last] = '';
    }
  }

  private stripBlobUrlsFromDto(value: unknown): void {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(item => this.stripBlobUrlsFromDto(item));
      return;
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        const current = record[key];
        if (typeof current === 'string' && current.startsWith('blob:')) {
          record[key] = '';
        } else {
          this.stripBlobUrlsFromDto(current);
        }
      }
    }
  }

  private sanitizeImageValue(value: string | null | undefined): string {
    if (!value) return '';
    return value.startsWith('blob:') ? '' : value;
  }

  /** ---------- SAVE ---------- */
  async save() {
    this.submitAttempted = true;
    this.errors = {};
    const name = this.form.value.name?.trim() || '';
    const endDate = this.form.value.endDate || '';
    const isFav = !!this.form.value.isFav;

    const requiredMessage = 'Please Complete all required fields';
    const aboutUInvalid = this.validateAboutUImages();

    if (!endDate) this.errors.endDate = requiredMessage;
    else if (endDate < this.todayStr) this.errors.endDate = 'End date cannot be in the past.';
    if (!name) this.errors.eventName = requiredMessage;

    if (this.errors.endDate || this.errors.eventName) {
      setTimeout(() => document.querySelector('.field.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }

    if (aboutUInvalid) {
      setTimeout(() => document.querySelector('.about__error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }

    if (this.hasInvalidSaleComponents()) {
      setTimeout(() => document.querySelector('.sale-editor__field.is-invalid, .sale-editor__error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }


    if (this.validateFormTemplateImages()) {
      setTimeout(() => document.querySelector('.form-template__field-error, .form-template__plain-field--error, .form-template__popup-image--error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }

    this.submitting = true;

    const frontResult = await this.serializeListForSchema(this.frontComponents, false, 'components');
    const backResult = await this.serializeListForSchema(this.backComponents, true, 'components', frontResult.components.length);
    const components: EventComponentDto[] = [...frontResult.components, ...backResult.components];
    const fileEntries: FileEntry[] = [...frontResult.files, ...backResult.files];

    const dtoJson: EventCreateDto = {
      name,
      isFavorite: isFav,
      fileImage: this.bannerFile ? '' : this.sanitizeImageValue(this.bannerUrl),
      endDate: this.toLocalEndDateString(endDate),
      categoryIds: this.categories.filter(c => c.selected).map(c => c.id),
      components
    };

    const formData = new FormData();
    formData.append('eventDto', JSON.stringify(dtoJson));
    if (this.bannerFile) {
      formData.append('event.fileImage', this.bannerFile, this.bannerFile.name);
    }
    for (const { key, file } of fileEntries) {
      formData.append(key, file, file.name);
    }

    this.eventp.createFull(formData).subscribe({
      next: () => {
        this.submitting = false;
        this.clearDraft();
        this.submitAttempted = false;
        this.showToast('Created event successfully');
      },
      error: (err: unknown) => {
        this.submitting = false;
        const message = (err as { error?: string })?.error ?? 'Create failed';
        alert(message);
      }
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

  private isAboutUInst(inst: CompInstance): boolean {
    return this.normalizeType((inst.comp as any)?.tagName ?? (inst.comp as any)?.componentType) === 'aboutu';
  }

  private resolveAboutUImage(inst: CompInstance, field: AboutImageField): string {
    const props = (inst.props ?? {}) as ComponentProps;
    if (field === 'hero') {
      const direct = typeof props.imageTopic === 'string' ? props.imageTopic : '';
      const fallback = typeof props.display_picture?.src === 'string' ? props.display_picture.src : '';
      return this.coerceString(direct || fallback);
    }

    const flatKey = field === 'left' ? 'leftImage' : 'rightImage';
    const flatCandidate = (props as Record<string, unknown>)[flatKey];
    const grid = props.gridTwoColumn ?? {};
    const nestedCandidate = (grid as Record<string, unknown>)[flatKey];

    const value = typeof flatCandidate === 'string' && flatCandidate.trim().length
      ? flatCandidate
      : typeof nestedCandidate === 'string'
        ? nestedCandidate
        : '';
    return this.coerceString(value);
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






