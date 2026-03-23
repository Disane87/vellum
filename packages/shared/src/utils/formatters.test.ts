import { describe, it, expect } from 'vitest';
import {
  formatAddress,
  formatAddressList,
  formatFileSize,
  normalizeSubject,
  stripHtmlTags,
} from './formatters';

describe('formatters', () => {
  describe('formatAddress', () => {
    it('should format address with name', () => {
      expect(formatAddress({ name: 'John Doe', address: 'john@example.com' })).toBe(
        'John Doe <john@example.com>',
      );
    });

    it('should format address without name', () => {
      expect(formatAddress({ address: 'john@example.com' })).toBe('john@example.com');
    });
  });

  describe('formatAddressList', () => {
    it('should format multiple addresses', () => {
      const result = formatAddressList([
        { name: 'Alice', address: 'alice@example.com' },
        { address: 'bob@example.com' },
      ]);
      expect(result).toBe('Alice <alice@example.com>, bob@example.com');
    });

    it('should handle empty list', () => {
      expect(formatAddressList([])).toBe('');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(5242880)).toBe('5.0 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
    });
  });

  describe('normalizeSubject', () => {
    it('should strip Re: prefix', () => {
      expect(normalizeSubject('Re: Hello')).toBe('Hello');
      expect(normalizeSubject('RE: Hello')).toBe('Hello');
    });

    it('should strip Fwd: prefix', () => {
      expect(normalizeSubject('Fwd: Hello')).toBe('Hello');
      expect(normalizeSubject('FWD: Hello')).toBe('Hello');
    });

    it('should strip German prefixes', () => {
      expect(normalizeSubject('AW: Hello')).toBe('Hello');
      expect(normalizeSubject('WG: Hello')).toBe('Hello');
    });

    it('should strip multiple prefixes', () => {
      expect(normalizeSubject('Re: Fwd: Re: Hello')).toBe('Hello');
    });

    it('should handle no prefix', () => {
      expect(normalizeSubject('Hello')).toBe('Hello');
    });
  });

  describe('stripHtmlTags', () => {
    it('should strip HTML tags', () => {
      expect(stripHtmlTags('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });

    it('should normalize whitespace', () => {
      expect(stripHtmlTags('<p>Hello</p>  <p>World</p>')).toBe('Hello World');
    });

    it('should handle plain text', () => {
      expect(stripHtmlTags('Just text')).toBe('Just text');
    });

    it('should handle empty string', () => {
      expect(stripHtmlTags('')).toBe('');
    });
  });
});
