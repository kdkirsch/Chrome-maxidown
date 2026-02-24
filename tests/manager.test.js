const { formatBytes, formatSpeed, escHtml, escAttr } = require('../manager/manager');

describe('manager.js', () => {
  describe('formatBytes', () => {
    test('formats 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    test('formats bytes', () => {
      expect(formatBytes(500)).toBe('500 B');
    });

    test('formats kilobytes', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    test('formats megabytes', () => {
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(5242880)).toBe('5.0 MB');
    });

    test('formats gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1.0 GB');
    });

    test('formats terabytes', () => {
      expect(formatBytes(1099511627776)).toBe('1.0 TB');
    });

    test('formats fractional values correctly', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(2621440)).toBe('2.5 MB');
    });
  });

  describe('formatSpeed', () => {
    test('appends /s to formatted bytes', () => {
      expect(formatSpeed(0)).toBe('0 B/s');
      expect(formatSpeed(1024)).toBe('1.0 KB/s');
      expect(formatSpeed(1048576)).toBe('1.0 MB/s');
    });
  });

  describe('escHtml', () => {
    test('escapes HTML special characters', () => {
      expect(escHtml('<div>test</div>')).toBe('&lt;div&gt;test&lt;/div&gt;');
    });

    test('escapes ampersands', () => {
      expect(escHtml('foo & bar')).toBe('foo &amp; bar');
    });

    test('handles empty/null input', () => {
      expect(escHtml('')).toBe('');
      expect(escHtml(null)).toBe('');
      expect(escHtml(undefined)).toBe('');
    });
  });

  describe('escAttr', () => {
    test('escapes attribute-unsafe characters', () => {
      expect(escAttr('"quotes" & <angles>')).toBe('&quot;quotes&quot; &amp; &lt;angles&gt;');
    });

    test('escapes single quotes', () => {
      expect(escAttr("it's")).toBe('it&#39;s');
    });

    test('handles empty/null input', () => {
      expect(escAttr('')).toBe('');
      expect(escAttr(null)).toBe('');
    });
  });
});
