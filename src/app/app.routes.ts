import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SalesFormComponent } from './components/sales-form/sales-form.component';
import { RefacilFormComponent } from './components/refacil-form/refacil-form.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [authGuard]
    },
    {
        path: 'sales',
        component: SalesFormComponent,
        canActivate: [authGuard]
    },
    {
        path: 'recargas',
        component: RefacilFormComponent,
        canActivate: [authGuard]
    },
    {
        path: '**',
        redirectTo: '/dashboard'
    }
];
