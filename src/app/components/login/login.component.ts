import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html'
})
export class LoginComponent {
    authService = inject(AuthService);
    router = inject(Router);

    email = '';
    password = '';
    loading = false;
    errorMessage = '';

    async onSubmit() {
        if (!this.email || !this.password) {
            this.errorMessage = 'Por favor ingrese sus credenciales';
            return;
        }

        this.loading = true;
        this.errorMessage = '';

        try {
            await this.authService.signIn(this.email, this.password);
            this.router.navigate(['/dashboard']);
        } catch (error: any) {
            this.errorMessage = error.message || 'Error al iniciar sesión';
        } finally {
            this.loading = false;
        }
    }
}
