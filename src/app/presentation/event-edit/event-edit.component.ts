import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { CreateEventComponent } from '../event-create/event-create.component';

@Component({
  selector: 'app-event-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, CreateEventComponent],
  templateUrl: './event-edit.component.html',
  styleUrls: ['./event-edit.component.css'],
})
export class EventEditComponent {
  eventId: number | null;

  constructor(private readonly route: ActivatedRoute) {
    this.eventId = this.parseId(this.route.snapshot.paramMap.get('id'));
  }

  private parseId(value: string | null): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }
}
