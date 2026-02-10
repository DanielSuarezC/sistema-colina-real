import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgxSonnerToaster],
  template: `
    <ngx-sonner-toaster position="top-right" richColors />
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  title = 'sistema-colina-real';
}
