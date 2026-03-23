import { MailboxRole } from '../enums/mailbox-role';

export interface Mailbox {
  path: string;
  name: string;
  delimiter: string;
  flags: string[];
  specialUse?: MailboxRole;
  totalMessages: number;
  unseenMessages: number;
  children?: Mailbox[];
  subscribed: boolean;
}

export interface MailboxCreateDto {
  path: string;
}

export interface MailboxRenameDto {
  newPath: string;
}
