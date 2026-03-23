import { TruncatePipe } from './truncate.pipe';

describe('TruncatePipe', () => {
  const pipe = new TruncatePipe();

  it('should return short strings unchanged', () => {
    expect(pipe.transform('Hello', 100)).toBe('Hello');
  });

  it('should truncate long strings', () => {
    const long = 'a'.repeat(200);
    const result = pipe.transform(long, 50);
    expect(result.length).toBe(51); // 50 chars + ellipsis
    expect(result.endsWith('…')).toBe(true);
  });

  it('should handle empty string', () => {
    expect(pipe.transform('', 10)).toBe('');
  });

  it('should use default limit of 100', () => {
    const long = 'a'.repeat(200);
    const result = pipe.transform(long);
    expect(result.length).toBe(101);
  });
});
