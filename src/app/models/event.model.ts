import { ContactDto } from './contact.model';
import { EventComponentDto } from './event-component.model';

export interface EventCreateDto {
  name: string;
  isFavorite: boolean;
  fileImage: string;
  endDate?: string; 
  categoryIds: number[];
  components: EventComponentDto[];
}

export interface EventDto {
  id: number;
  name: string;
  isFavorite: boolean;
  fileImage: string;
  startDate: string;
  endDate: string;
}
