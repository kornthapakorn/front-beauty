import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventService } from '../../domain/event.service';
import { EventDto } from '../../models/event.model';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.css'
})
export class EventDetailComponent implements OnInit {
  event?: EventDto;
  loading = true;
  error?: string;

  constructor(private route: ActivatedRoute, private eventService: EventService) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid event id';
      this.loading = false;
      return;
    }
    this.eventService.getById(id).subscribe({
      next: (ev: EventDto) => { this.event = ev; this.loading = false; },
      error: (err: unknown) => { this.error = 'Failed to load event'; this.loading = false; console.error(err); }
    });
  }
}

