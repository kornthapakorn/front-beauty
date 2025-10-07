import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentThumbComponent, ThumbItem } from './component-thumb.component';
import { ComponentDto } from '../../models/component.model';

@Component({
  selector: 'app-component-list',
  standalone: true,
  imports: [CommonModule, ComponentThumbComponent],
  template: `
    <div class="component-list">
      <div class="list-header">
        <h3>Add a component</h3>
        <p>Select a block to insert into the page.</p>
      </div>
      <div class="thumb-list" role="list">
        <app-component-thumb
          role="listitem"
          *ngFor="let it of displayItems; index as i; trackBy: trackByType"
          [item]="it"
          (select)="choose(it, i)">
        </app-component-thumb>
      </div>
    </div>
  `,
  styles: [
    `
      .component-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .list-header h3 {
        margin: 0;
        font-family: 'Judson', serif;
        font-size: 1.4rem;
        font-weight: 700;
        color: #0f172a;
      }
      .list-header p {
        margin: 0;
        color: #64748b;
        font-size: 0.95rem;
      }
      .thumb-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
      }
      @media (max-width: 1024px) {
        .thumb-list {
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 16px;
        }
      }
      @media (max-width: 768px) {
        .thumb-list {
          grid-template-columns: repeat(2, minmax(150px, 1fr));
          gap: 14px;
        }
      }
      @media (max-width: 520px) {
        .component-list {
          gap: 12px;
        }
        .thumb-list {
          grid-template-columns: repeat(2, minmax(140px, 1fr));
          gap: 12px;
        }
      }
      @media (max-width: 420px) {
        .thumb-list {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class ComponentListComponent {
  @Input() selectMode = true;
  @Input() allowSection = true;
  @Output() selected = new EventEmitter<ComponentDto>();

  readonly items: ThumbItem[] = [
    { id: 1, componentType: 'section', name: 'Section'  },
    { id: 2, componentType: 'banner', name: 'Banner'},
    { id: 3, componentType: 'textbox', name: 'Text Box' },
    { id: 4, componentType: 'imagewithcaption', name: 'Image With Caption' },
    { id: 6, componentType: 'gridtwocolumn', name: 'Grid Two Column' },
    { id: 5, componentType: 'imagedesc', name: 'Image With Description' },
    { id: 7, componentType: 'gridfourimage', name: 'Grid Four Image' },
    { id: 12, componentType: 'tablewithtopicanddesc', name: 'Table With Topic & Desc' },
    { id: 10, componentType: 'onetopicimagecaptionbutton', name: 'One Topic Image + Button' },
    { id: 11, componentType: 'twotopicimagecaptionbutton', name: 'Two Topic Image + Button' },
    { id: 14, componentType: 'sale', name: 'Sale' },
    { id: 9, componentType: 'formtemplate', name: 'Form Template' },
    { id: 8, componentType: 'button', name: 'Button' },
    { id: 13, componentType: 'aboutu', name: 'About Us' },
  ];

  get displayItems(): ThumbItem[] {
    if (this.allowSection) return this.items;
    return this.items.filter((it: ThumbItem) => (it.componentType || '').toLowerCase() !== 'section');
  }

  trackByType = (_: number, item: ThumbItem) => item.componentType;

  choose(it: ThumbItem, index: number) {
    if (!this.selectMode) return;
    const componentId = typeof it.id === 'number' ? it.id : index + 1;
    const dto: ComponentDto = {
      componentId,
      name: it.name || it.componentType,
      tagName: it.componentType,
    };
    this.selected.emit(dto);
  }
}



