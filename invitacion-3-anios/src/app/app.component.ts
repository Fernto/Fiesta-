import { Component } from '@angular/core';
import { InvitationComponent } from './invitation/invitation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [InvitationComponent],
  template: `<app-invitation></app-invitation>`
})
export class AppComponent {}
