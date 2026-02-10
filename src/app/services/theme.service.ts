import { Injectable, signal, effect } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private readonly THEME_KEY = 'sistema-colina-real-theme';
    isDarkMode = signal<boolean>(false);

    constructor() {
        // Load initial theme
        const savedTheme = localStorage.getItem(this.THEME_KEY);
        const darkModeEnabled = savedTheme === 'dark' || 
            (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        this.isDarkMode.set(darkModeEnabled);
        this.applyTheme(darkModeEnabled);

        // React to signal changes
        effect(() => {
            this.applyTheme(this.isDarkMode());
        });
    }

    toggleTheme() {
        this.isDarkMode.update(v => !v);
    }

    private applyTheme(isDark: boolean) {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem(this.THEME_KEY, 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem(this.THEME_KEY, 'light');
        }
    }
}
