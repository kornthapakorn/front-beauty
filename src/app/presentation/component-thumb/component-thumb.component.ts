import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ThumbItem = {
  id?: number | string;
  componentType: string;
  name?: string;
  description?: string;
};

@Component({
  selector: 'app-component-thumb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './component-thumb.component.html',
  styleUrls: ['./component-thumb.component.css']
})
export class ComponentThumbComponent {
  @Input() item!: ThumbItem;
  @Output() select = new EventEmitter<ThumbItem>();

  private readonly ICONS: Record<string, string> = {
    section: 'assets/icons/section.png',
    banner: 'assets/icons/banner.png',
    textbox: 'assets/icons/textbox.png',
    imagewithcaption: 'assets/icons/iwc.png',
    gridtwocolumn: 'assets/icons/gtw.png',
    imagedesc: 'assets/icons/id.png',
    gridfourimage: 'assets/icons/gfi.png',
    tablewithtopicanddesc: 'assets/icons/twtad.png',
    onetopicimagecaptionbutton: 'assets/icons/oticb.png',
    twotopicimagecaptionbutton: 'assets/icons/tticb.png',
    sale: 'assets/icons/sale.png',
    formtemplate: 'assets/icons/formm.png',
    button: 'assets/icons/button.png',
    aboutu: 'assets/icons/aboutus.png',
    default: 'assets/icons/section.png',
  };

  get icon(): string {
    const key = this.item?.componentType?.toLowerCase() || '';
    return this.ICONS[key] ?? this.ICONS['default'];
  }

  onClick(): void {
    this.select.emit(this.item);
  }
}
