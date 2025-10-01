import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-section-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './section-node.component.html',
  styleUrls: ['./section-node.component.css']
})
export class SectionNodeComponent {
  @Input() path: number[] = [];
  @Input() frozen = false;
  @Input() hasChildren = false;

  @Output() addChild = new EventEmitter<number[]>();

  onAddChild(): void {
    this.addChild.emit(this.path);
  }
}
