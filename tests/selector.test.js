const { wildcardToRegex, escHtml, escAttr } = require('../selector/selector');

describe('selector.js', () => {
  describe('wildcardToRegex', () => {
    test('converts * wildcard to match any characters', () => {
      const regex = wildcardToRegex('*.pdf');
      expect(regex.test('document.pdf')).toBe(true);
      expect(regex.test('file.PDF')).toBe(true); // case insensitive
      expect(regex.test('file.txt')).toBe(false);
    });

    test('converts ? wildcard to match single character', () => {
      const regex = wildcardToRegex('file?.txt');
      expect(regex.test('file1.txt')).toBe(true);
      expect(regex.test('fileA.txt')).toBe(true);
      expect(regex.test('file12.txt')).toBe(false);
    });

    test('escapes regex special characters', () => {
      const regex = wildcardToRegex('file[1].txt');
      expect(regex.test('file[1].txt')).toBe(true);
      expect(regex.test('file1.txt')).toBe(false);
    });

    test('handles complex patterns', () => {
      const regex = wildcardToRegex('image_*_thumb.jpg');
      expect(regex.test('image_001_thumb.jpg')).toBe(true);
      expect(regex.test('image__thumb.jpg')).toBe(true);
      expect(regex.test('image_thumb.jpg')).toBe(false);
    });

    test('is case insensitive', () => {
      const regex = wildcardToRegex('*.PDF');
      expect(regex.test('file.pdf')).toBe(true);
      expect(regex.test('file.PDF')).toBe(true);
      expect(regex.test('file.Pdf')).toBe(true);
    });

    test('handles dot in extension pattern', () => {
      const regex = wildcardToRegex('*.tar.gz');
      expect(regex.test('archive.tar.gz')).toBe(true);
      expect(regex.test('file.targz')).toBe(false);
    });
  });

  describe('escHtml', () => {
    test('escapes HTML special characters', () => {
      expect(escHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert("xss")&lt;/script&gt;'
      );
    });

    test('escapes ampersands', () => {
      expect(escHtml('a & b')).toBe('a &amp; b');
    });

    test('handles empty/null input', () => {
      expect(escHtml('')).toBe('');
      expect(escHtml(null)).toBe('');
      expect(escHtml(undefined)).toBe('');
    });

    test('preserves normal text', () => {
      expect(escHtml('hello world')).toBe('hello world');
    });
  });

  describe('escAttr', () => {
    test('escapes double quotes', () => {
      expect(escAttr('say "hello"')).toBe('say &quot;hello&quot;');
    });

    test('escapes single quotes', () => {
      expect(escAttr("it's")).toBe('it&#39;s');
    });

    test('escapes angle brackets and ampersands', () => {
      expect(escAttr('<b>bold & strong</b>')).toBe('&lt;b&gt;bold &amp; strong&lt;/b&gt;');
    });

    test('handles empty/null input', () => {
      expect(escAttr('')).toBe('');
      expect(escAttr(null)).toBe('');
      expect(escAttr(undefined)).toBe('');
    });
  });
});
