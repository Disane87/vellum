import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SanitizerService } from '../../../src/message/sanitizer.service';

describe('SanitizerService', () => {
  let service: SanitizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SanitizerService],
    }).compile();

    service = module.get<SanitizerService>(SanitizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should allow basic HTML tags', () => {
    const html = '<p>Hello <b>World</b></p>';
    expect(service.sanitize(html)).toBe('<p>Hello <b>World</b></p>');
  });

  it('should strip script tags', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    expect(service.sanitize(html)).toBe('<p>Hello</p>');
  });

  it('should strip event handlers', () => {
    const html = '<img src="photo.jpg" onerror="alert(1)">';
    const result = service.sanitize(html);
    expect(result).not.toContain('onerror');
  });

  it('should strip iframe tags', () => {
    const html = '<iframe src="https://evil.com"></iframe><p>Text</p>';
    expect(service.sanitize(html)).toBe('<p>Text</p>');
  });

  it('should strip javascript: URIs in links', () => {
    const html = '<a href="javascript:alert(1)">Click</a>';
    const result = service.sanitize(html);
    expect(result).not.toContain('javascript:');
  });

  it('should add target=_blank and rel=noopener to links', () => {
    const html = '<a href="https://example.com">Link</a>';
    const result = service.sanitize(html);
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('should allow tables', () => {
    const html = '<table><tr><td>Cell</td></tr></table>';
    expect(service.sanitize(html)).toContain('<table>');
    expect(service.sanitize(html)).toContain('<td>');
  });

  it('should strip form tags', () => {
    const html = '<form action="/steal"><input type="text"></form>';
    const result = service.sanitize(html);
    expect(result).not.toContain('<form');
    expect(result).not.toContain('<input');
  });

  it('should strip object and embed tags', () => {
    const html = '<object data="evil.swf"></object><embed src="evil.swf">';
    expect(service.sanitize(html)).toBe('');
  });

  it('should allow cid: scheme for inline images', () => {
    const html = '<img src="cid:image001@01D12345.67890ABC">';
    const result = service.sanitize(html);
    expect(result).toContain('cid:');
  });

  it('should handle empty string', () => {
    expect(service.sanitize('')).toBe('');
  });

  it('should allow style attributes', () => {
    const html = '<p style="color: red;">Red text</p>';
    const result = service.sanitize(html);
    expect(result).toContain('style');
  });
});
