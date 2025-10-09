import { CommonModule } from "@angular/common"
import { Component, EventEmitter, Input, type OnChanges, Output, type SimpleChanges } from "@angular/core"

import type { FormComponentTemplateDto } from "../../models/form-component"

@Component({
  selector: "app-image-upload-with-content-node",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./image-upload-with-content-node.component.html",
  styleUrls: ["./image-upload-with-content-node.component.css"],
})
export class ImageUploadWithContentNodeComponent implements OnChanges {
  @Input({ required: true }) component!: FormComponentTemplateDto
  @Input() frozen = false
  @Input() showError = false

  @Output() edit = new EventEmitter<FormComponentTemplateDto>()
  @Output() pickImage = new EventEmitter<FormComponentTemplateDto>()
  @Output() remove = new EventEmitter<FormComponentTemplateDto>()

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["component"] && this.component) {
      this.ensureModel()
    }
  }

  get displayText(): string {
    return this.component?.imageUploadWithImageContent?.textDesc ?? ""
  }

  get imageSrc(): string {
    return this.component?.imageUploadWithImageContent?.image ?? ""
  }

  get hasImage(): boolean {
    return !!this.imageSrc
  }

  openTextEdit(): void {
    if (this.frozen) return
    this.ensureModel()
    this.edit.emit(this.component)
  }

  openImagePicker(event?: Event): void {
    event?.stopPropagation()
    event?.preventDefault()
    if (this.frozen) return
    this.ensureModel()
    this.pickImage.emit(this.component)
  }

  onRemove(event: Event): void {
    event.stopPropagation()
    event.preventDefault()
    if (this.frozen) return
    this.remove.emit(this.component)
  }

  private ensureModel(): void {
    if (!this.component.imageUploadWithImageContent) {
      this.component.imageUploadWithImageContent = { textDesc: "", image: "" }
    }
  }
}
