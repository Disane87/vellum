import { Address } from '../models/contact';

export function formatAddress(addr: Address): string {
  if (addr.name) {
    return `${addr.name} <${addr.address}>`;
  }
  return addr.address;
}

export function formatAddressList(addresses: Address[]): string {
  return addresses.map(formatAddress).join(', ');
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function normalizeSubject(subject: string): string {
  let result = subject;
  let prev: string;
  do {
    prev = result;
    result = result.replace(/^(re|fwd?|aw|wg):\s*/i, '');
  } while (result !== prev);
  return result.trim();
}

export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
