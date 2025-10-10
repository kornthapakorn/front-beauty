import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { EventpService } from '../../domain/eventp.service';
import { EventService } from '../../domain/event.service'; // << เพิ่ม
import { EventDto } from '../../models/event.model';        // << เพิ่ม
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-full-event',
  standalone: true,
  templateUrl: './create-full-event.component.component.html',
  styleUrls: ['./create-full-event.component.component.css'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class CreateFullEventComponent implements OnInit {
  coverFile: File | null = null;
  bannerFile: File | null = null;

  // << เพิ่ม: เก็บรายการ event สำหรับ list ด้านล่าง
  events: EventDto[] = [];
  // base ของไฟล์รูป (ถ้า ev.fileImage เป็น "/uploads/xxx.jpg")
  readonly fileBase = 'https://localhost:7091';

  form = this.fb.group({
    name: ['', Validators.required],
    endDate: [''],
    isFavorite: [false],
    banner_textDesc: [''],
    banner_textOnButton: [''],
    banner_isActive: [true],
    banner_urlButton: ['']
  });

  isSubmitting = false;
  resultMsg = '';

  constructor(
    private fb: FormBuilder,
    private api: EventpService,
    private eventsSvc: EventService // << เพิ่ม
  ) {}

  ngOnInit(): void {
    this.loadEvents(); // โหลดรายการครั้งแรก
  }

  // === helper ของไฟล์ ===
  onCoverSelected(ev: Event) {
    const input = ev.target as HTMLInputElement | null;
    this.coverFile = input?.files?.[0] ?? null;
  }

  onBannerSelected(ev: Event) {
    const input = ev.target as HTMLInputElement | null;
    this.bannerFile = input?.files?.[0] ?? null;
  }

  // === แปลง URL ให้เต็ม ===
  imgUrl(ev: EventDto): string {
    // ถ้า ev.fileImage มี /uploads/... ก็ prefix domain ให้ครบ
    if (!ev?.fileImage) return '';
    return ev.fileImage.startsWith('/')
      ? `${this.fileBase}${ev.fileImage}`
      : ev.fileImage;
  }

  // โหลดรายการทั้งหมด
  loadEvents(): void {
    this.eventsSvc.getAll().subscribe({
      next: xs => this.events = xs ?? [],
      error: _ => this.events = []
    });
  }

onImgErr(e: Event) {
  const img = e.target as HTMLImageElement;

  // กัน loop: ใช้ dataset แบบ bracket notation
  if (img.dataset && img.dataset['fallbackSet'] === '1') return;
  if (img.dataset) img.dataset['fallbackSet'] = '1';

  // อีกวิธีกัน loopได้เช่นกัน
  img.onerror = null;

  img.src =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              font-family="Arial" font-size="14" fill="#9ca3af">no image</text>
      </svg>`
    );
}


  submit(): void {
    if (this.form.invalid) {
      this.resultMsg = 'กรอกชื่อ Event อย่างน้อยหนึ่งช่อง';
      return;
    }
    const v = this.form.value;

    const eventDto = {
      name: v.name as string,
      isFavorite: Boolean(v.isFavorite),
      fileImage: '',
      endDate: v.endDate ? String(v.endDate) : null,
      categoryIds: [] as number[],
      components: [
        {
          id: 0,
          componentType: 'banner',
          sortOrder: 1,
          isOutPage: false,
          banner: {
            image: '',
            textDesc: v.banner_textDesc as string,
            textOnButton: v.banner_textOnButton as string,
            isActive: Boolean(v.banner_isActive),
            urlButton: v.banner_urlButton as string
          }
        }
      ]
    };

    const fd = new FormData();
    fd.append('eventDto', JSON.stringify(eventDto));
    if (this.coverFile)  fd.append('event.fileImage', this.coverFile, this.coverFile.name);
    if (this.bannerFile) fd.append('components[0].banner.image', this.bannerFile, this.bannerFile.name);

    this.isSubmitting = true;
    this.resultMsg = '';

    this.api.createFull(fd).subscribe({
      next: res => {
        this.isSubmitting = false;
        this.resultMsg = `สร้างสำเร็จ! eventId = ${res.eventId}`;
        this.form.reset({ isFavorite: false, banner_isActive: true });
        this.coverFile = null;
        this.bannerFile = null;
        this.loadEvents(); // << รีเฟรชลิสต์ด้านล่าง
      },
      error: err => {
        this.isSubmitting = false;
        this.resultMsg = 'ผิดพลาด: ' + (err?.error?.message || err.statusText || 'unknown');
      }
    });
  }
}
