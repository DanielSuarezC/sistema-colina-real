import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { SyncService } from '../../services/sync.service';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './layout.component.html'
})
export class LayoutComponent {
    isDarkMode = signal(false);
    isSidebarOpen = signal(false);
    themeService = inject(ThemeService);
    syncService = inject(SyncService);
    
    toggleSidebar(): void {
        this.isSidebarOpen.update(value => !value);
    }

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
