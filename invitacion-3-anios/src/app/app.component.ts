import { NgComponentOutlet } from '@angular/common';
import { Component, HostListener, Type } from '@angular/core';
import { InvitationComponent } from './invitation/invitation.component';
import { AdminComponent } from './invitation/admin.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `<ng-container *ngComponentOutlet="vistaActual"></ng-container>`
})
export class AppComponent {
  vistaActual: Type<unknown> = this.obtenerVista();

  @HostListener('window:hashchange')
  actualizarVista(): void {
    this.vistaActual = this.obtenerVista();
  }

  private obtenerVista(): Type<unknown> {
    return window.location.hash === '#/organizacion' ? AdminComponent : InvitationComponent;
  }
}
