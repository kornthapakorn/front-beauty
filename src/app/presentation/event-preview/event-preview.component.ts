import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { EventComponentDto } from '../../models/event-component.model';
import { FormComponentTemplateDto } from '../../models/form-component';

@Component({
  selector: 'app-event-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-preview.component.html',
  styleUrls: ['./event-preview.component.css']
})
export class EventPreviewComponent {
  @Input() bannerUrl: string | null = null;
  @Input() eventName = '';
  @Input() endDate = '';
  @Input() components: EventComponentDto[] = [];

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

  formatPrice(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    if (!Number.isFinite(value)) return '';
    return value.toLocaleString('en-US', { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
  }

  trackBySortOrder(index: number, component: EventComponentDto): number {
    return component?.sortOrder ?? component?.id ?? index;
  }

  formComponents(list: FormComponentTemplateDto[] | null | undefined): FormComponentTemplateDto[] {
    if (!Array.isArray(list)) {
      return [];
    }
    return list.filter((comp): comp is FormComponentTemplateDto => !!comp && comp.isDelete !== true);
  }

  formComponentType(comp: FormComponentTemplateDto | null | undefined): string {
    return (comp?.componentType || '').trim();
  }

  trackFormComponent(index: number, comp: FormComponentTemplateDto): number {
    return comp?.id ?? index;
  }
}