import { Routes } from '@angular/router';

import { HomeComponent } from './presentation/home/home.component';
import { EventDetailComponent } from './presentation/event-detail/event-detail.component';
import { LoginEventComponent } from './presentation/login-event/login-event.component';
import { CreateEventComponent } from './presentation/event-create/event-create.component';
//import { EventListComponent } from './presentation/event-list/event-list.component';
import { ManageEventComponent } from './presentation/manage-event/manage-event.component';
import { authGuard } from './core/guards/auth.guard';
import { CreateFullEventComponent } from './presentation/create-full-event.component/create-full-event.component.component';
import { EventEditComponent } from './presentation/event-edit/event-edit.component';


export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full', canActivate: [authGuard] },

  { path: 'login-event', component: LoginEventComponent },
  { path: 'Login', component: LoginEventComponent },
  { path: 'event-create', component: CreateEventComponent, canActivate: [authGuard] },
  { path: 'create-event', component: CreateEventComponent, canActivate: [authGuard] },

  { path: 'event-create-full', component: CreateFullEventComponent},

 // { path: 'events', component: EventListComponent },
  { path: 'events/:id/edit', component: EventEditComponent, canActivate: [authGuard] },
  { path: 'events/:id', component: EventDetailComponent, canActivate: [authGuard] },
  { path: 'manage-events', component: ManageEventComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: '' }
];
