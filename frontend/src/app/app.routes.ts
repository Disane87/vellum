import { Routes } from '@angular/router';
import { accountGuard } from './core/guards/account.guard';

export const routes: Routes = [
  {
    path: 'welcome',
    loadComponent: () =>
      import('./features/onboarding/welcome.component').then((m) => m.WelcomeComponent),
  },
  {
    path: 'setup',
    loadComponent: () =>
      import('./features/settings/account-form.component').then(
        (m) => m.AccountFormComponent,
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then((m) => m.SettingsComponent),
    canActivate: [accountGuard],
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/layout/shell.component').then((m) => m.ShellComponent),
    canActivate: [accountGuard],
    children: [
      { path: '', redirectTo: 'INBOX', pathMatch: 'full' },
      {
        path: ':mailbox',
        loadComponent: () =>
          import('./features/message-list/message-list.component').then(
            (m) => m.MessageListComponent,
          ),
      },
    ],
  },
];
