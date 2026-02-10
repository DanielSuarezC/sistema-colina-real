import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { User } from '@supabase/supabase-js';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private userSignal = signal<User | null>(null);
    private loadingSignal = signal<boolean>(true);

    public user = this.userSignal.asReadonly();
    public loading = this.loadingSignal.asReadonly();
    public isAuthenticated = computed(() => this.userSignal() !== null);

    constructor(
        private supabase: SupabaseService,
        private router: Router
    ) {
        this.initializeAuth();
    }

    private async initializeAuth() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            this.userSignal.set(session?.user ?? null);

            // Check if session has expired based on our custom 1-day rule
            if (session) {
                this.checkSessionExpiration();
            }
        } catch (error) {
            console.error('Auth initialization error', error);
        } finally {
            this.loadingSignal.set(false);
            this.setupAuthListener();
        }
    }

    private checkSessionExpiration() {
        // Supabase sessions persist by default. 
        // If we want a strict 1-day limit, we can check a timestamp in localStorage
        const loginTime = localStorage.getItem('last_login_time');
        if (loginTime) {
            const oneDay = 24 * 60 * 60 * 1000;
            const timePassed = Date.now() - parseInt(loginTime);
            if (timePassed > oneDay) {
                this.signOut();
            }
        }
    }

    private setupAuthListener() {
        this.supabase.auth.onAuthStateChange((event, session) => {
            this.userSignal.set(session?.user ?? null);

            if (event === 'SIGNED_OUT') {
                this.router.navigate(['/login']);
            }
        });
    }

    async signIn(email: string, password: string) {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        localStorage.setItem('last_login_time', Date.now().toString());
        this.userSignal.set(data.user);
        return data;
    }

    async signUp(email: string, password: string) {
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password
        });

        if (error) throw error;
        return data;
    }

    async signOut() {
        const { error } = await this.supabase.auth.signOut();
        localStorage.removeItem('last_login_time');
        if (error) throw error;

        this.userSignal.set(null);
        this.router.navigate(['/login']);
    }

    async resetPassword(email: string) {
        const { error } = await this.supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
    }
}
