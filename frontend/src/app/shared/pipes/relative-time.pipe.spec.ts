import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  const pipe = new RelativeTimePipe();

  it('should return "Gerade eben" for recent dates', () => {
    const now = new Date();
    expect(pipe.transform(now.toISOString())).toBe('Gerade eben');
  });

  it('should return minutes for recent past', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(pipe.transform(fiveMinAgo)).toBe('5m');
  });

  it('should return hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(pipe.transform(threeHoursAgo)).toBe('3h');
  });

  it('should return days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(pipe.transform(twoDaysAgo)).toBe('2d');
  });

  it('should return date for old dates', () => {
    const oldDate = new Date('2025-01-15').toISOString();
    const result = pipe.transform(oldDate);
    expect(result).toContain('15');
  });

  it('should accept Date objects', () => {
    const date = new Date();
    expect(pipe.transform(date)).toBe('Gerade eben');
  });
});
