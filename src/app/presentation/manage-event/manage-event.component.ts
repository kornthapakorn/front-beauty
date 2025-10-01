import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { EventService } from '../../domain/event.service';
import { EventDto } from '../../models/event.model';
import { ContactService } from '../../domain/contact.service';
import {
  ContactDto,
  ContactId,
  ContactPictureDto,
  ContactUserView,
  ContactUserViewLink,
} from '../../models/contact.model';

type ContactPicForm = FormGroup<{
  id: FormControl<ContactId | null>;
  imageId: FormControl<string>;
  url: FormControl<string>;
  localFile: FormControl<File | null>;
}>;

@Component({
  selector: 'app-manage-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './manage-event.component.html',
  styleUrls: ['./manage-event.component.css'],
})
export class ManageEventComponent implements OnInit {
  // ===== Events =====
  events: (EventDto & { isHidden?: boolean })[] = [];
  filteredEvents: (EventDto & { isHidden?: boolean })[] = [];

  // ===== Contact Dock (User view) =====
  dock: ContactUserView = { id: null, contactId: null, title: '', links: [] };

  // ===== Contact (Admin form in modal) =====
  private readonly STORAGE_KEY = 'contact_id';
  CONTACT_ID: ContactId | null = this.restoreContactId();
  private readonly missingContactIds = new Set<string>();

  contactModalOpen = false;
  contactLoading = false;
  contactSaving = false;
  contactError = '';
  contactSaveError = '';
  contactDeleteIndex: number | null = null;

  readonly contactValidationErrorMessage = 'กรุณากรอกข้อมูลให้ครบถ้วนก่อนบันทึก';
  readonly contactSaveErrorMessage = 'เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล ลองใหม่อีกครั้ง';
  readonly contactSaveSuccessMessage = 'บันทึกช่องทางติดต่อเรียบร้อยแล้ว';
  readonly contactLinkLabel = 'เปิดลิงก์ช่องทางติดต่อ';

  contactTitle = this.fb.control<string>('', [Validators.required, Validators.maxLength(100)]);
  contactPics = new FormArray<ContactPicForm>([]);

  // ===== Misc UI =====
  search = this.fb.control('');
  modalMessage = '';
  modalOpen = false;
  modalType: 'success' | 'error' | '' = '';
  drawerOpen = false;
  openMenuId: number | null = null;
  menuPosition: 'down' | 'up' = 'down';
  deleteConfirm = { open: false, target: null as (EventDto & { isHidden?: boolean }) | null };

  readonly API_BASE = 'https://localhost:7091';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private eventService: EventService,
    private contactService: ContactService,
  ) {}

  ngOnInit(): void {
    this.fetchEvents();
    void this.loadDock();
  }

  // ===== Helpers =====
  trackByIndex(i: number): number { return i; }
  get picControls(): ContactPicForm[] { return this.contactPics.controls as ContactPicForm[]; }

  toImg(src?: string | null): string {
    if (!src) { return ''; }
    if (/^https?:\/\//i.test(src)) { return src; }
    if (/^(data|blob):/i.test(src)) { return src; }
    if (src.startsWith('/')) { return this.API_BASE + src; }
    return `${this.API_BASE}/${src}`;
  }

  toLink(url?: string | null): string {
    if (!url) { return '#'; }
    if (/^https?:\/\//i.test(url)) { return url; }
    const origin = typeof window !== 'undefined' ? window.location.origin : this.API_BASE;
    if (url.startsWith('/')) { return `${origin}${url}`; }
    return `https://${url}`;
  }

  openContactLink(url?: string | null): void {
    const href = this.toLink(url ?? '');
    if (!href || href === '#') {
      this.openContactModal();
      return;
    }
    window.open(href, '_blank', 'noopener');
  }

  private restoreContactId(): ContactId | null {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(this.STORAGE_KEY) : null;
    if (!stored || stored === 'null') { return null; }
    const maybeNumber = Number(stored);
    if (!Number.isNaN(maybeNumber) && stored.trim() !== '') { return maybeNumber; }
    return stored;
  }

  private persistContactId(id?: ContactId | null): void {
    if (id === undefined || id === null || id === '') {
      this.clearContactId();
      return;
    }
    if (this.CONTACT_ID === id) { return; }
    this.missingContactIds.delete(String(id));
    this.CONTACT_ID = id;
    localStorage.setItem(this.STORAGE_KEY, String(id));
  }

  private clearContactId(): void {
    this.CONTACT_ID = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private createPicGroup(pic?: Partial<ContactPictureDto>): ContactPicForm {
    return this.fb.group({
      id: this.fb.control<ContactId | null>(pic?.id ?? null),
      imageId: this.fb.control<string>(pic?.imageId ?? '', [Validators.required]),
      url: this.fb.control<string>(pic?.url ?? '', [
        Validators.required,
        Validators.maxLength(300),
        Validators.pattern(/^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(\/\S*)?$/i),
      ]),
      localFile: this.fb.control<File | null>(null),
    }) as ContactPicForm;
  }

  private async uploadContactImage(contactId: ContactId, group: ContactPicForm): Promise<void> {
    const file = group.controls.localFile.value;
    if (!file) { return; }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('url', group.controls.url.value);

    const uploadUrl = `${this.contactService.apiUrl}/UploadPicture/${contactId}`;
    const res: any = await firstValueFrom(this.contactService.uploadPicture(uploadUrl, formData));
    if (res?.image) {
      group.controls.imageId.setValue(String(res.image).replace(this.API_BASE, ''));
      group.controls.localFile.setValue(null);
    }
  }

  private async fetchContactDto(): Promise<ContactDto | null> {
    let candidateId = this.CONTACT_ID ?? this.dock.contactId ?? this.dock.id ?? null;
    if (!candidateId) {
      await this.loadDock();
      candidateId = this.CONTACT_ID ?? this.dock.contactId ?? this.dock.id ?? null;
      if (!candidateId) { return null; }
    }

    try {
      const dto = await firstValueFrom(this.contactService.getById(candidateId));
      this.persistContactId(dto.id ?? candidateId);
      return dto;
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      if (httpError?.status === 404) {
        console.warn('Contact record missing, switching to create flow.');
        this.missingContactIds.add(String(candidateId));
        this.clearContactId();
        this.dock = { ...this.dock, contactId: null, id: null };
      } else {
        console.error('Failed to load contact details', error);
      }
      return null;
    }
  }

  private async loadDock(): Promise<void> {
    try {
      const response = await firstValueFrom(this.contactService.getAll());
      const rawContactId = response?.contactId ?? response?.id ?? null;
      const safeContactId = rawContactId !== null && !this.missingContactIds.has(String(rawContactId)) ? rawContactId : null;
      this.dock = {
        id: safeContactId,
        contactId: safeContactId,
        title: response?.title ?? '',
        links: (response?.links ?? []).map((link: ContactUserViewLink) => ({
          id: link?.id ?? null,
          image: link?.image ?? '',
          url: link?.url ?? '',
        })),
      };
    } catch (error) {
      console.error('Failed to load dock', error);
      this.dock = { id: null, contactId: null, title: '', links: [] };
    }
  }

  async openContactModal(): Promise<void> {
    this.contactModalOpen = true;
    this.contactLoading = true;
    this.contactError = '';
    this.contactSaveError = '';

    try {
      const dto = await this.fetchContactDto();
      if (!dto) { throw new Error('no contact dto'); }
      this.contactTitle.setValue(dto.title ?? '');
      this.contactPics.clear();
      (dto.pictures ?? []).forEach((p) => this.contactPics.push(this.createPicGroup(p)));
      if (this.contactPics.length === 0) {
        this.contactPics.push(this.createPicGroup());
      }
    } catch (error) {
      console.warn('Falling back to dock data for contact modal', error);
      this.contactTitle.setValue(this.dock.title || '');
      this.contactPics.clear();
      const keepIds = Boolean(this.CONTACT_ID);
      if (this.dock.links?.length) {
        this.dock.links.forEach((l: ContactUserViewLink) => {
          const initial = keepIds ? { id: l.id ?? null, imageId: l.image, url: l.url } : { imageId: l.image, url: l.url };
          this.contactPics.push(this.createPicGroup(initial));
        });
      } else {
        this.contactPics.push(this.createPicGroup());
      }
    } finally {
      this.contactLoading = false;
    }
  }

  closeContactModal(): void {
    this.contactModalOpen = false;
  }

  addContactPic(): void {
    this.contactPics.push(this.createPicGroup());
  }

  requestDeleteContact(index: number): void {
    this.contactDeleteIndex = index;
  }

  cancelDeleteContactRequest(): void {
    this.contactDeleteIndex = null;
  }

  confirmDeleteContact(): void {
    if (this.contactDeleteIndex === null) { return; }
    this.contactPics.removeAt(this.contactDeleteIndex);
    if (this.contactPics.length === 0) {
      this.contactPics.push(this.createPicGroup());
    }
    this.contactDeleteIndex = null;
  }

  onContactImagePicked(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) { return; }

    const group = this.contactPics.at(index) as ContactPicForm;
    group.controls.localFile.setValue(file);
    group.markAsDirty();

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        group.controls.imageId.setValue(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async saveContacts(): Promise<void> {
    this.contactTitle.markAsTouched();
    this.contactPics.markAllAsTouched();
    if (this.contactTitle.invalid || this.contactPics.invalid) {
      this.contactSaveError = this.contactValidationErrorMessage;
      return;
    }

    this.contactSaveError = '';
    this.contactSaving = true;

    try {
      const pendingUploads: ContactPicForm[] = [];
      const activeContactId = this.CONTACT_ID;

      for (const group of this.picControls) {
        const file = group.controls.localFile.value;
        if (!file) { continue; }
        if (!activeContactId) {
          pendingUploads.push(group);
          continue;
        }
        await this.uploadContactImage(activeContactId, group);
      }

      const payload: ContactDto = {
        id: this.CONTACT_ID ?? undefined,
        title: this.contactTitle.value?.trim() ?? '',
        pictures: this.picControls.map((g) => ({
          id: g.controls.id.value ?? null,
          imageId: g.controls.imageId.value ?? '',
          url: g.controls.url.value ?? '',
        })),
      };

      if (this.CONTACT_ID) {
        await firstValueFrom(this.contactService.update(this.CONTACT_ID, payload));
        this.persistContactId(this.CONTACT_ID);
      } else {
        const res: any = await firstValueFrom(this.contactService.create(payload));
        this.persistContactId(res?.id ?? res?.contactId ?? null);
      }

      const finalContactId = this.CONTACT_ID;
      if (pendingUploads.length && finalContactId) {
        for (const group of pendingUploads) {
          await this.uploadContactImage(finalContactId, group);
        }
      }

      await this.loadDock();
      this.closeContactModal();
      this.showModal(this.contactSaveSuccessMessage);
    } catch (error) {
      console.error('Failed to save contacts', error);
      this.contactSaveError = this.contactSaveErrorMessage;
    } finally {
      this.contactSaving = false;
    }
  }

  openEditFromDock(): void {
    void this.openContactModal();
  }

  fetchEvents(): void {
    this.eventService.getAll().subscribe({
      next: (data) => {
        this.events = data.map((event) => ({ ...event, isHidden: false }));
        this.filteredEvents = this.events;
      },
      error: () => {
        this.modalType = 'error';
        this.modalMessage = 'บังจุบันหนึ่งกิจกรรม';
        this.modalOpen = true;
      },
    });
  }

  toggleMenu(): void {
    this.drawerOpen = !this.drawerOpen;
  }

  @HostListener('document:click')
  closeAllMenus(): void {
    this.openMenuId = null;
  }

  toggleActionMenu(eventDto: EventDto, ev: MouseEvent): void {
    ev.stopPropagation();
    if (this.openMenuId === eventDto.id) {
      this.openMenuId = null;
      return;
    }

    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this.openMenuId = eventDto.id;
    setTimeout(() => {
      const menuEl = document.querySelector('.action-menu') as HTMLElement;
      if (!menuEl) { return; }
      const menuHeight = menuEl.scrollHeight;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      this.menuPosition = spaceBelow < menuHeight && spaceAbove > menuHeight ? 'up' : 'down';
    });
  }

  onSearch(): void {
    const query = (this.search.value ?? '').trim().toLowerCase();
    this.filteredEvents = query ? this.events.filter((e) => e.name.toLowerCase().includes(query)) : this.events;
  }

  addEvent(): void {
    this.router.navigate(['/create-event']);
  }

  editEvent(eventDto: EventDto): void {
    console.log('Edit', eventDto);
    this.openMenuId = null;
  }

  viewForm(eventDto: EventDto): void {
    console.log('View form data of', eventDto);
    this.openMenuId = null;
  }

  copyLink(eventDto: EventDto): void {
    const link = `${location.origin}/event/${eventDto.id}`;
    navigator.clipboard?.writeText(link);
    this.openMenuId = null;
  }

  duplicateEvent(eventDto: EventDto): void {
    this.eventService.duplicate(eventDto.id).subscribe({
      next: (copy) => {
        this.events = [...this.events, { ...copy, isHidden: false }];
        this.onSearch();
        this.openMenuId = null;
        this.showModal('คัดลอกกิจกรรมเรียบร้อยแล้ว');
      },
      error: () => {
        this.openMenuId = null;
        this.showModal('ไม่สามารถคัดลอกกิจกรรมได้');
      },
    });
  }

  showModal(message: string): void {
    this.modalMessage = message;
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.modalMessage = '';
  }

  toggleHidden(eventDto: EventDto & { isHidden?: boolean }): void {
    eventDto.isHidden = !eventDto.isHidden;
    this.openMenuId = null;
  }

  confirmDelete(eventDto: EventDto): void {
    this.deleteConfirm = { open: true, target: eventDto };
    this.openMenuId = null;
  }

  doDelete(): void {
    const target = this.deleteConfirm.target;
    if (!target) { return; }

    this.eventService.delete(target.id).subscribe({
      next: () => {
        this.events = this.events.filter((event) => event.id !== target.id);
        this.onSearch();
        this.deleteConfirm = { open: false, target: null };
        this.showModal('ลบกิจกรรมเรียบร้อยแล้ว');
      },
      error: () => {
        this.deleteConfirm = { open: false, target: null };
        this.showModal('ไม่สามารถลบกิจกรรมได้');
      },
    });
  }

  cancelDelete(): void {
    this.deleteConfirm = { ...this.deleteConfirm, open: false, target: null };
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    this.router.navigate(['/Login']);
  }
}



