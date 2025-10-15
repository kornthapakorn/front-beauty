import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';

import { HostNode } from '../../models/host-node.model';
import { GridColumnSide, GridTwoColumnEvent } from '../grid-two-column-node/grid-two-column-node.component';

export type SaleTextField =
  | 'title'
  | 'text'
  | 'promoPrice'
  | 'price'
  | 'textDesc'
  | 'textFooter'
  | 'leftText'
  | 'rightText';

export interface SaleTextEvent {
  path: number[];
  field: SaleTextField;
}

export interface SaleDateChangeEvent {
  path: number[];
  value: string;
}

@Component({
  selector: 'app-sale-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sale-node.component.html',
  styleUrls: ['./sale-node.component.css']
})
export class SaleNodeComponent implements OnInit, OnDestroy, OnChanges {
  @Input() node!: HostNode;
  @Input() path: number[] = [];
  @Input() frozen = false;

  /**
   * ถ้า parent อยากให้โชว์ error ตอนกด Save ให้ส่ง true มา
   * เช่น <app-sale-node [showErrors]="submitAttempted"></app-sale-node>
   */
  @Input() showErrors = false;

  @Output() openTextForField = new EventEmitter<SaleTextEvent>();
  @Output() openBtnCfgForNode = new EventEmitter<number[]>();
  @Output() openImageForSide = new EventEmitter<GridTwoColumnEvent>();
  @Output() openUrlConfig = new EventEmitter<number[]>();
  @Output() endDateChange = new EventEmitter<SaleDateChangeEvent>();

  @ViewChild('saleDateInput') saleDateInput?: ElementRef<HTMLInputElement>;

  // placeholders
  readonly fallbackTitle = '\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E15\u0E2D\u0E19\u0E19\u0E35!';
  readonly fallbackSubtitle = '\u0E04\u0E48\u0E32\u0E2A\u0E21\u0E31\u0E04\u0E23';
  readonly fallbackButton = '\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19 !!';
  readonly fallbackFooter = '\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21';
  readonly countdownLabel = '\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E43\u0E19';
  readonly fallbackLogoText = 'Text here';

  // countdown
  countdownParts = { days: '00', hours: '00', minutes: '00', seconds: '00' };
  countdownRunning = false;
  private promoExpired = false;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  // touched flags (ควบคุม error ให้เกิดหลังผู้ใช้แตะ/แก้)
  promoTouched = false;
  priceTouched = false;
  dateTouched = false;

  ngOnInit(): void {
    this.restartCountdown();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['node'] || changes['path']) {
      this.restartCountdown();
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  /** ใช้ตอน parent อยากสั่งให้ฟิลด์ทั้งหมดเป็น touched (เช่นตอนกด Save แล้วเจอ error) */
  public markAllTouched(): void {
    this.promoTouched = true;
    this.priceTouched = true;
    this.dateTouched = true;
  }

  // ====== Datetime min: กันเลือกอดีต ======
  get minDateForPicker(): string {
    const now = new Date();
    now.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  // ====== Text getters ======
  get title(): string {
    return this.textOrFallback((this.props as any).title, this.fallbackTitle);
  }
  get titlePlaceholder(): boolean {
    return !this.hasText((this.props as any).title);
  }
  get subtitle(): string {
    return this.textOrFallback((this.props as any).text, this.fallbackSubtitle);
  }
  get subtitlePlaceholder(): boolean {
    return !this.hasText((this.props as any).text);
  }

  // ====== Prices ======
  get promoPriceDisplay(): string {
    return this.formatCurrency(this.promoPriceValue);
  }
  get priceDisplay(): string {
    return this.formatCurrency(this.priceValue);
  }
  get promoPricePlaceholder(): boolean {
    return !this.hasValue((this.props as any).promoPrice);
  }
  get pricePlaceholder(): boolean {
    return !this.hasValue((this.props as any).price);
  }

  // ====== Error states (logic) ======
  get isPromoMissing(): boolean {
    const v = this.promoPriceValue;
    return v === null || v <= 0;
  }
  get isPriceMissing(): boolean {
    const v = this.priceValue;
    return v === null || v <= 0;
  }
  get isDateMissing(): boolean {
    return !this.endDateValue || !this.tryParseDate(this.endDateValue);
  }
  get isDateInPast(): boolean {
    const d = this.tryParseDate(this.endDateValue);
    if (!d) return false;
    return d.getTime() < Date.now();
  }

  // ====== Error states (UI triggers): แสดงเมื่อ touched หรือ showErrors ======
  get showPromoError(): boolean {
    return (this.promoTouched || this.showErrors) && this.isPromoMissing;
  }
  get showPriceError(): boolean {
    return (this.priceTouched || this.showErrors) && this.isPriceMissing;
  }
  get showDateMissingError(): boolean {
    return (this.dateTouched || this.showErrors) && this.isDateMissing;
  }
  get showDatePastError(): boolean {
    return (this.dateTouched || this.showErrors) && !this.isDateMissing && this.isDateInPast;
  }

  // ====== Promo visibility ======
  get hasPromo(): boolean {
    const promo = this.promoPriceValue;
    const price = this.priceValue;
    if (promo === null || price === null) return false;
    if (!(promo > 0 && price > 0 && promo < price)) return false;
    return !this.promoExpired && !this.isDateMissing && !this.isDateInPast;
  }
  get hasCountdown(): boolean {
    return this.hasPromo && this.countdownRunning;
  }
  get countdownText(): string {
    return `${this.countdownParts.days} : ${this.countdownParts.hours} : ${this.countdownParts.minutes} : ${this.countdownParts.seconds}`;
  }

  // ====== Deadline ======
  get deadlineText(): string {
    const explicit = this.coerceString((this.props as any).textDesc);
    if (explicit) return explicit;
    return this.fallbackLogoText;
  }
  get deadlinePlaceholder(): boolean {
    return !this.hasText((this.props as any).textDesc);
  }


  // ====== Footer & Button ======
  get footerText(): string {
    return this.textOrFallback((this.props as any).textFooter, this.fallbackFooter);
  }
  get footerPlaceholder(): boolean {
    return !this.hasText((this.props as any).textFooter);
  }
  get buttonLabel(): string {
    return this.textOrFallback((this.props as any).textOnButton, this.fallbackButton);
  }
  get buttonPlaceholder(): boolean {
    return !this.hasText((this.props as any).textOnButton);
  }
  get buttonActive(): boolean {
    const raw = (this.props as any).isActive;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') {
      const lower = raw.trim().toLowerCase();
      return ['true', '1', 'yes', 'y', 'on'].includes(lower);
    }
    return true;
  }

  // ====== Logos / Grid ======
  get leftLogo(): string {
    return this.resolveColumn('leftImage');
  }
  get rightLogo(): string {
    return this.resolveColumn('rightImage');
  }
  get leftTextLabel(): string {
    const text = this.resolveColumn('leftText').trim();
    return text.length ? text : this.fallbackLogoText;
  }
  get leftTextPlaceholder(): boolean {
    return this.resolveColumn('leftText').trim().length === 0;
  }
  get rightTextLabel(): string {
    const text = this.resolveColumn('rightText').trim();
    return text.length ? text : this.fallbackLogoText;
  }
  get rightTextPlaceholder(): boolean {
    return this.resolveColumn('rightText').trim().length === 0;
  }
  get logosTitle(): string {
    return this.footerText;
  }

  // ====== Date input value ======
  get endDateInputValue(): string {
    return this.toDatetimeLocalValue(this.endDateValue);
  }

  // ====== UI handlers ======
  onEdit(field: SaleTextField): void {
    if (this.frozen) return;
    if (field === 'promoPrice') this.promoTouched = true;
    if (field === 'price') this.priceTouched = true;
    this.openTextForField.emit({ path: this.path, field });
  }

  onOpenDate(): void {
    if (this.frozen) return;
    const input = this.saleDateInput?.nativeElement;
    if (!input) return;
    const maybePicker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof maybePicker.showPicker === 'function') {
      maybePicker.showPicker();
    } else {
      input.click();
    }
    // ไม่ mark touched ที่นี่ เพื่อไม่ให้แดงทันทีตอนแค่เปิด picker
  }

  onDateChange(event: Event): void {
    if (this.frozen) return;
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    // mark touched เมื่อมีการเลือกจริง
    this.dateTouched = true;

    const picked = (input.value ?? '').trim();
    if (picked && picked < this.minDateForPicker) {
      // กันเลือกอดีต: reset และไม่ตั้ง endDate
      input.value = '';
      const props = (this.node.props ??= {} as Record<string, unknown>);
      (props as any).endDate = '';
      this.endDateChange.emit({ path: [...this.path], value: '' });
      this.restartCountdown();
      return;
    }

    const props = (this.node.props ??= {} as Record<string, unknown>);
    (props as any).endDate = picked;
    this.endDateChange.emit({ path: [...this.path], value: picked });
    this.restartCountdown();
  }

  onConfigureButton(): void {
    if (this.frozen) return;
    this.openBtnCfgForNode.emit(this.path);
  }

  onPick(side: GridColumnSide): void {
    if (this.frozen) return;
    this.openImageForSide.emit({ path: this.path, side });
  }

  onConfigureUrls(): void {
    if (this.frozen) return;
    this.openUrlConfig.emit(this.path);
  }

  // ====== internals ======
  private get props(): Record<string, unknown> {
    return (this.node?.props as Record<string, unknown> | undefined) ?? {};
  }

  private get nested(): Record<string, unknown> {
    const raw = this.props['gridTwoColumn'];
    return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  }

  private get promoPriceValue(): number | null {
    return this.parseNumber((this.props as any).promoPrice);
  }
  private get priceValue(): number | null {
    return this.parseNumber((this.props as any).price);
  }
  private get endDateValue(): string {
    return this.coerceString((this.props as any).endDate);
  }

  private parseNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : null;
    }
    return null;
  }

  private formatCurrency(value: number | null): string {
    const amount = value ?? 0;
    const formatted = new Intl.NumberFormat('th-TH').format(amount);
    const currencySymbol = String.fromCharCode(0x0E3F);
    return `${formatted} ${currencySymbol}`;
  }

  private textOrFallback(raw: unknown, fallback: string): string {
    const text = this.coerceString(raw);
    return text.length ? text : fallback;
  }
  private hasText(raw: unknown): boolean {
    return this.coerceString(raw).length > 0;
  }
  private hasValue(raw: unknown): boolean {
    if (raw === null || raw === undefined) return false;
    if (typeof raw === 'string') return raw.trim().length > 0;
    if (typeof raw === 'number') return !Number.isNaN(raw);
    return false;
  }
  private coerceString(raw: unknown): string {
    return typeof raw === 'string' ? raw.trim() : '';
  }

  private tryParseDate(raw: string): Date | null {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  private toDatetimeLocalValue(raw: string): string {
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return raw;
    const parsed = this.tryParseDate(raw);
    if (!parsed) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = parsed.getFullYear();
    const m = pad(parsed.getMonth() + 1);
    const d = pad(parsed.getDate());
    const h = pad(parsed.getHours());
    const min = pad(parsed.getMinutes());
    return `${y}-${m}-${d}T${h}:${min}`;
  }


  private resolveColumn(field: 'leftImage' | 'rightImage' | 'leftText' | 'rightText'): string {
    const flat = this.props[field];
    if (typeof flat === 'string' && flat.trim().length) return flat;
    const nestedVal = this.nested[field];
    if (typeof nestedVal === 'string' && nestedVal.trim().length) return nestedVal;
    return '';
  }

  private restartCountdown(): void {
    this.stopCountdown();
    const endDate = this.tryParseDate(this.endDateValue);
    if (!endDate) {
      this.promoExpired = false;
      this.resetCountdown();
      return;
    }
    if (endDate.getTime() <= Date.now()) {
      this.promoExpired = true;
      this.resetCountdown();
      return;
    }
    this.promoExpired = false;
    this.updateCountdown();
    if (this.countdownRunning) {
      this.countdownTimer = setInterval(() => this.updateCountdown(), 1000);
    }
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.countdownRunning = false;
  }

  private resetCountdown(): void {
    this.countdownParts = { days: '00', hours: '00', minutes: '00', seconds: '00' };
    this.countdownRunning = false;
  }

  private updateCountdown(): void {
    const endDate = this.tryParseDate(this.endDateValue);
    if (!endDate) {
      this.promoExpired = false;
      this.stopCountdown();
      this.resetCountdown();
      return;
    }
    const diff = endDate.getTime() - Date.now();
    if (diff <= 0) {
      this.promoExpired = true;
      this.stopCountdown();
      this.resetCountdown();
      return;
    }
    this.promoExpired = false;
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    this.countdownParts = {
      days: this.padCountdown(days),
      hours: this.padCountdown(hours),
      minutes: this.padCountdown(minutes),
      seconds: this.padCountdown(seconds)
    };
    this.countdownRunning = true;
  }

  private padCountdown(value: number): string {
    return Math.max(0, value).toString().padStart(2, '0');
  }
}


