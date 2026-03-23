export interface Account {
  id: string;
  name: string;
  email: string;
  imap: ImapConfig;
  smtp: SmtpConfig;
  color?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: AuthCredentials;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: AuthCredentials;
}

export interface AuthCredentials {
  type: 'password' | 'oauth2';
  user: string;
  pass?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface ConnectionTestResult {
  imap: { success: boolean; error?: string };
  smtp: { success: boolean; error?: string };
}

export type AccountCreateDto = Omit<Account, 'id' | 'createdAt'>;
export type AccountUpdateDto = Partial<AccountCreateDto>;
