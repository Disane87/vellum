import { FileSizePipe } from './file-size.pipe';

describe('FileSizePipe', () => {
  const pipe = new FileSizePipe();

  it('should format zero bytes', () => {
    expect(pipe.transform(0)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(pipe.transform(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(pipe.transform(1024)).toBe('1.0 KB');
    expect(pipe.transform(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(pipe.transform(1048576)).toBe('1.0 MB');
  });

  it('should format gigabytes', () => {
    expect(pipe.transform(1073741824)).toBe('1.0 GB');
  });
});
