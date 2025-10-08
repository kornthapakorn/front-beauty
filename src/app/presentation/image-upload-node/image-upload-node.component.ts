import { CommonModule } from "@angular/common"
import { Component, EventEmitter, Input, type OnChanges, Output, type SimpleChanges } from "@angular/core"

import type { FormComponentTemplateDto } from "../../models/form-component"

@Component({
  selector: "app-image-upload-node",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./image-upload-node.component.html",
  styleUrls: ["./image-upload-node.component.css"],
})
export class ImageUploadNodeComponent implements OnChanges {
  @Input({ required: true }) component!: FormComponentTemplateDto
  @Input() frozen = false

  @Output() edit = new EventEmitter<FormComponentTemplateDto>()
  @Output() remove = new EventEmitter<FormComponentTemplateDto>()

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["component"] && this.component) {
      this.ensureImageUpload()
    }
  }

  get displayText(): string {
    return this.component?.imageUpload?.text ?? ""
  }

  openEdit(): void {
    if (this.frozen) return
    this.ensureImageUpload()
    this.edit.emit(this.component)
  }

  onRemove(event: Event): void {
    event.stopPropagation()
    event.preventDefault()
    if (this.frozen) return
    this.remove.emit(this.component)
  }

  private ensureImageUpload(): void {
    if (!this.component.imageUpload) {
      this.component.imageUpload = { text: "" }
    }
  }
}
