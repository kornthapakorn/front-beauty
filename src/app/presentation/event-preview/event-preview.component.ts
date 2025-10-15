import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';

import { EventComponentDto, SaleDto } from '../../models/event-component.model';
import { FormComponentTemplateDto } from '../../models/form-component';

interface SalePreviewState {
  hasPromo: boolean;
  hasRegular: boolean;
  promoValue: string | null;
  regularValue: string | null;
  showCountdown: boolean;
  countdownParts: string[];
  deadlineText: string;
  expired: boolean;
}

@Component({
  selector: 'app-event-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-preview.component.html',
  styleUrls: ['./event-preview.component.css']
})
export class EventPreviewComponent implements OnInit, OnDestroy {
  @Input() bannerUrl: string | null = null;
  @Input() eventName = '';
  @Input() endDate = '';
  @Input() components: EventComponentDto[] = [];

  readonly saleFallbackTitle = 'สมัครตอนนี้!';
  readonly saleFallbackSubtitle = 'ค่าสมัคร';
  readonly saleFallbackFooter = 'สอบถามเพิ่มเติม';
  readonly saleFallbackLogoText = 'Text here';
  readonly saleCountdownLabel = 'สิ้นสุดใน';
  readonly bahtSymbol = String.fromCharCode(0x0E3F);

  now = Date.now();
  private saleTicker: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startSaleTicker();
  }

  ngOnDestroy(): void {
    this.stopSaleTicker();
  }

  get displayName(): string {
    const trimmed = (this.eventName || '').trim();
    return trimmed || 'Untitled event';
  }

  get endDateText(): string | null {
    const raw = (this.endDate || '').trim();
    if (!raw) return null;
    const numeric = Date.parse(raw);
    if (!Number.isNaN(numeric)) {
      const fmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return fmt.format(new Date(numeric));
    }
    return raw;
  }

  typeOf(comp: EventComponentDto): string {
    return (comp?.componentType || '').trim().toLowerCase();
  }

  hasContent(value: string | null | undefined): boolean {
    return !!value && value.trim().length > 0;
  }

  saleState(sale: SaleDto | null | undefined): SalePreviewState {
    const promoNumber = this.toNumber(sale?.promoPrice);
    const regularNumber = this.toNumber(sale?.price);
    const endDate = this.parseDate(sale?.endDate);
    const diffMs = endDate ? endDate.getTime() - this.now : null;
    const countdownActive = diffMs !== null && diffMs > 0;
    const promoEligible = promoNumber !== null && regularNumber !== null && promoNumber > 0 && regularNumber > 0 && promoNumber < regularNumber;
    const hasPromo = promoEligible && countdownActive;
    const hasRegular = regularNumber !== null;
    const expired = promoEligible && !!endDate && !countdownActive;

    return {
      hasPromo,
      hasRegular,
      promoValue: promoNumber !== null ? this.formatNumber(Math.max(0, promoNumber)) : null,
      regularValue: regularNumber !== null ? this.formatNumber(Math.max(0, regularNumber)) : null,
      showCountdown: hasPromo,
      countdownParts: hasPromo && diffMs !== null ? this.buildCountdownParts(diffMs) : [],
      deadlineText: this.buildDeadlineText(sale),
      expired
    };
  }

  saleHasLogos(sale: SaleDto | null | undefined): boolean {
    if (!sale) return false;
    return [sale.leftImage, sale.rightImage, sale.leftText, sale.rightText].some((value) => this.hasContent(value));
  }

  trackBySortOrder(index: number, component: EventComponentDto): number {
    return component?.sortOrder ?? component?.id ?? index;
  }

  formComponents(list: FormComponentTemplateDto[] | null | undefined): FormComponentTemplateDto[] {
    if (!Array.isArray(list)) {
      return [];
    }
    return list.filter((comp: FormComponentTemplateDto | null | undefined): comp is FormComponentTemplateDto => !!comp && comp.isDelete !== true);
  }

  formComponentType(comp: FormComponentTemplateDto | null | undefined): string {
    return (comp?.componentType || '').trim();
  }

  trackFormComponent(index: number, comp: FormComponentTemplateDto): number {
    return comp?.id ?? index;
  }

  private startSaleTicker(): void {
    this.stopSaleTicker();
    this.saleTicker = setInterval(() => {
      this.now = Date.now();
    }, 1000);
  }

  private stopSaleTicker(): void {
    if (this.saleTicker) {
      clearInterval(this.saleTicker);
      this.saleTicker = null;
    }
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('th-TH').format(value);
  }

  private buildCountdownParts(diffMs: number): string[] {
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
      this.padCountdown(days),
      this.padCountdown(hours),
      this.padCountdown(minutes),
      this.padCountdown(seconds)
    ];
  }

  private padCountdown(value: number): string {
    return Math.max(0, value).toString().padStart(2, '0');
  }

  private buildDeadlineText(sale: SaleDto | null | undefined): string {
    const explicit = (sale?.textDesc || '').trim();
    return explicit;
  }

}




