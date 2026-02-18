import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { toast } from 'ngx-sonner';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './profile.component.html'
})
export class ProfileComponent {
    supabase = inject(SupabaseService);
    router = inject(Router);

    userEmail = signal<string>('');
    newPassword = '';
    isUpdating = false;

    constructor() {
        this.loadUser();
    }

    async loadUser() {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user?.email) {
            this.userEmail.set(user.email);
        }
    }

    async signOut() {
        const { error } = await this.supabase.auth.signOut();
        if (error) {
            toast.error('Error al cerrar sesión');
        } else {
            this.router.navigate(['/login']);
        }
    }

    async updatePassword(event: Event) {
        event.preventDefault();
        if (!this.newPassword || this.newPassword.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            this.isUpdating = true;
            const { error } = await this.supabase.auth.updateUser({
                password: this.newPassword
            });

            if (error) throw error;

            toast.success('Contraseña actualizada correctamente');
            this.newPassword = '';
        } catch (error: any) {
            toast.error('Error al actualizar: ' + error.message);
        } finally {
            this.isUpdating = false;
        }
    }
}
