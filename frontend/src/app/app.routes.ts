import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/layout/shell.component').then((m) => m.ShellComponent),
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
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then((m) => m.SettingsComponent),
  },
  {
    path: 'setup',
    loadComponent: () =>
      import('./features/settings/account-form.component').then(
        (m) => m.AccountFormComponent,
      ),
  },
];
