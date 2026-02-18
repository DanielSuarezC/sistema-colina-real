import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './layout.component.html'
})
export class LayoutComponent {
    isDarkMode = signal(false);
    themeService = inject(ThemeService);
    

    constructor() {
        // Load theme preference from localStorage
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            this.isDarkMode.set(true);
        }
    }

    toggleDarkMode(): void {
        this.isDarkMode.update(value => !value);
        localStorage.setItem('theme', this.isDarkMode() ? 'dark' : 'light');
    }
}
