import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SalesFormComponent } from './components/sales-form/sales-form.component';
import { RefacilFormComponent } from './components/refacil-form/refacil-form.component';
import { ExpenseFormComponent } from './components/expense-form/expense-form.component';
import { InvestmentComponent } from './components/investment/investment.component';
import { LiquidationComponent } from './components/liquidation/liquidation.component';
import { ReportsComponent } from './components/reports/reports.component';
import { SuggestionsComponent } from './components/suggestions/suggestions.component';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
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
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                component: DashboardComponent
            },
            {
                path: 'sales',
                component: SalesFormComponent
            },
            {
                path: 'recargas',
                component: RefacilFormComponent
            },
            {
                path: 'expenses',
                component: ExpenseFormComponent
            },
            {
                path: 'investments',
                component: InvestmentComponent
            },
            {
                path: 'liquidations',
                component: LiquidationComponent
            },
            {
                path: 'profile',
                loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent)
            },
            {
                path: 'reports',
                component: ReportsComponent
            },
            {
                path: 'suggestions',
                component: SuggestionsComponent
            }
        ]
    },
    {
        path: '**',
        redirectTo: '/dashboard'
    }
];
