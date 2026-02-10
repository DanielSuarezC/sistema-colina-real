import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SalesFormComponent } from './components/sales-form/sales-form.component';
import { RefacilFormComponent } from './components/refacil-form/refacil-form.component';
import { ExpenseFormComponent } from './components/expense-form/expense-form.component';
import { InvestmentComponent } from './components/investment/investment.component';
import { LiquidationComponent } from './components/liquidation/liquidation.component';
import { AuditLogComponent } from './components/audit-log/audit-log.component';
import { ReportsComponent } from './components/reports/reports.component';
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
        path: 'expenses',
        component: ExpenseFormComponent,
        canActivate: [authGuard]
    },
    {
        path: 'investments',
        component: InvestmentComponent,
        canActivate: [authGuard]
    },
    {
        path: 'liquidations',
        component: LiquidationComponent,
        canActivate: [authGuard]
    },
    {
        path: 'audit',
        component: AuditLogComponent,
        canActivate: [authGuard]
    },
    {
        path: 'reports',
        component: ReportsComponent,
        canActivate: [authGuard]
    },
    {
        path: '**',
        redirectTo: '/dashboard'
    }
];
