import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { effect } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Use take(1) to wait until auth is not loading
    return toObservable(authService.loading).pipe(
        filter(loading => !loading),
        take(1),
        map(() => {
            if (authService.isAuthenticated()) {
                return true;
            }
            router.navigate(['/login']);
            return false;
        })
    );
};
