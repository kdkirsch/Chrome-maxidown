const { formatBytes, formatSpeed, formatEta, escHtml, escAttr } = require('../manager/manager');

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

  describe('formatEta', () => {
    test('returns empty string when not downloading', () => {
      expect(formatEta({ state: 'queued', speed: 100, totalBytes: 1000, bytesReceived: 0 })).toBe('');
      expect(formatEta({ state: 'complete', speed: 100, totalBytes: 1000, bytesReceived: 1000 })).toBe('');
    });

    test('returns empty string when speed is 0', () => {
      expect(formatEta({ state: 'downloading', speed: 0, totalBytes: 1000, bytesReceived: 0 })).toBe('');
    });

    test('returns empty string when totalBytes is unknown', () => {
      expect(formatEta({ state: 'downloading', speed: 100, totalBytes: 0, bytesReceived: 50 })).toBe('');
    });

    test('formats seconds', () => {
      expect(formatEta({ state: 'downloading', speed: 100, totalBytes: 1000, bytesReceived: 700 })).toBe('3s left');
    });

    test('formats minutes and seconds', () => {
      // 9000 remaining, 100/s = 90 seconds = 1m 30s
      expect(formatEta({ state: 'downloading', speed: 100, totalBytes: 10000, bytesReceived: 1000 })).toBe('1m 30s left');
    });

    test('formats hours and minutes', () => {
      // 7200000 remaining, 1000/s = 7200s = 2h 0m
      expect(formatEta({ state: 'downloading', speed: 1000, totalBytes: 7200000, bytesReceived: 0 })).toBe('2h 0m left');
    });

    test('returns empty when download is complete (remaining <= 0)', () => {
      expect(formatEta({ state: 'downloading', speed: 100, totalBytes: 1000, bytesReceived: 1000 })).toBe('');
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
