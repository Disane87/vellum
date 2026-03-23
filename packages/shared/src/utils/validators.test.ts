import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidHostname, isValidPort, isNonEmptyString } from './validators';

describe('validators', () => {
  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('user.name@sub.domain.com')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
    });
  });

  describe('isValidHostname', () => {
    it('should accept valid hostnames', () => {
      expect(isValidHostname('imap.example.com')).toBe(true);
      expect(isValidHostname('mail.icloud.com')).toBe(true);
      expect(isValidHostname('localhost')).toBe(true);
      expect(isValidHostname('my-server')).toBe(true);
    });

    it('should reject invalid hostnames', () => {
      expect(isValidHostname('')).toBe(false);
      expect(isValidHostname('-invalid')).toBe(false);
      expect(isValidHostname('invalid-')).toBe(false);
      expect(isValidHostname('has space.com')).toBe(false);
    });
  });

  describe('isValidPort', () => {
    it('should accept valid ports', () => {
      expect(isValidPort(1)).toBe(true);
      expect(isValidPort(993)).toBe(true);
      expect(isValidPort(65535)).toBe(true);
    });

    it('should reject invalid ports', () => {
      expect(isValidPort(0)).toBe(false);
      expect(isValidPort(-1)).toBe(false);
      expect(isValidPort(65536)).toBe(false);
      expect(isValidPort(3.5)).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('should accept non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString(' a ')).toBe(true);
    });

    it('should reject empty or non-string values', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
    });
  });
});
