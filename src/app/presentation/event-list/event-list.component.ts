// import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { EventService } from '../../domain/event.service';
// import { EventDto } from '../../models/event.model';
// import { ComponentThumbComponent } from '../component-thumb/component-thumb.component';

// @Component({
//   selector: 'app-event-list',
//   standalone: true,
//   imports: [CommonModule, ComponentThumbComponent],
//   templateUrl: './event-list.component.html',
//   styleUrls: ['./event-list.component.css']
// })
// export class EventListComponent implements OnInit {
//   @Input() selectMode = false;
//   @Input() excludeIsFormTrue = true; 

//   @Output() selected = new EventEmitter<EventDto>();

//   events: EventDto[] = [];
//   loading = false;
//   error = '';

//   constructor(private service: EventService) {}

//   ngOnInit(): void {
//     this.fetch();
//   }

//   private isTrue(v: any): boolean {
//     return v === true || v === 1 || v === '1';
//   }

//   fetch(): void {
//     this.loading = true;
//     this.service.getAll().subscribe({
//       next: data => {
//         const list = this.excludeIsFormTrue
//           ? data.filter(c => !(c as any).isForm)
//           : data;

//         this.events = list;
//         this.loading = false;
//       },
//       error: err => {
//         this.error = String(err?.message ?? err);
//         this.loading = false;
//       }
//     });
//   }

//   onSelect(item: EventDto) {
//     this.selected.emit(item);
//   }

//   trackById(_: number, item: EventDto) {
//     return item.id;
//   }
// }
