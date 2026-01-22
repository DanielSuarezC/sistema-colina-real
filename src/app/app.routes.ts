import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TransactionFormComponent } from './components/transaction-form/transaction-form.component';
import { SettlementReportComponent } from './components/settlement-report/settlement-report.component';

export const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            {
                path: '',
                component: DashboardComponent
            },
            {
                path: 'transactions/new',
                component: TransactionFormComponent
            },
            {
                path: 'settlement',
                component: SettlementReportComponent
            }
        ]
    }
];
