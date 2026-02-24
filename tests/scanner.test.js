// Set up location mock before requiring scanner
delete window.location;
window.location = new URL('https://example.com/page/index.html');

const scanner = require('../content/scanner');
const { resolveUrl, filenameFromUrl, extensionFromUrl, isPageNavigation, isImageUrl, parseSrcset } = scanner;

describe('scanner.js helpers', () => {
  describe('resolveUrl', () => {
    test('resolves absolute URLs', () => {
      expect(resolveUrl('https://example.com/file.pdf')).toBe('https://example.com/file.pdf');
    });

    test('resolves relative URLs against location', () => {
      expect(resolveUrl('/images/photo.jpg')).toBe('https://example.com/images/photo.jpg');
    });

    test('resolves relative path URLs', () => {
      expect(resolveUrl('photo.jpg')).toBe('https://example.com/page/photo.jpg');
    });

    test('returns null for empty/falsy input', () => {
      expect(resolveUrl(null)).toBeNull();
      expect(resolveUrl(undefined)).toBeNull();
      expect(resolveUrl('')).toBeNull();
    });

    test('returns null for javascript: URLs', () => {
      expect(resolveUrl('javascript:void(0)')).toBeNull();
    });

    test('returns null for data: URLs', () => {
      expect(resolveUrl('data:image/png;base64,abc')).toBeNull();
    });

    test('returns null for blob: URLs', () => {
      expect(resolveUrl('blob:https://example.com/uuid')).toBeNull();
    });

    test('handles protocol-relative URLs', () => {
      const result = resolveUrl('//cdn.example.com/file.js');
      expect(result).toBe('https://cdn.example.com/file.js');
    });
  });

  describe('filenameFromUrl', () => {
    test('extracts filename from URL', () => {
      expect(filenameFromUrl('https://example.com/path/to/file.pdf')).toBe('file.pdf');
    });

    test('handles URL-encoded filenames', () => {
      expect(filenameFromUrl('https://example.com/path/my%20file.pdf')).toBe('my file.pdf');
    });

    test('returns "file" for root path', () => {
      expect(filenameFromUrl('https://example.com/')).toBe('file');
    });

    test('handles URLs with query strings', () => {
      // URL pathname strips query strings
      expect(filenameFromUrl('https://example.com/file.pdf?v=1')).toBe('file.pdf');
    });

    test('returns "file" for invalid URLs', () => {
      expect(filenameFromUrl('not-a-url')).toBe('file');
    });
  });

  describe('extensionFromUrl', () => {
    test('extracts common file extensions', () => {
      expect(extensionFromUrl('https://example.com/file.pdf')).toBe('pdf');
      expect(extensionFromUrl('https://example.com/photo.JPG')).toBe('jpg');
      expect(extensionFromUrl('https://example.com/video.mp4')).toBe('mp4');
    });

    test('returns empty string for no extension', () => {
      expect(extensionFromUrl('https://example.com/file')).toBe('');
      expect(extensionFromUrl('https://example.com/')).toBe('');
    });

    test('handles extensions up to 10 chars', () => {
      // appimage is 8 chars — within the 1-10 limit
      expect(extensionFromUrl('https://example.com/file.appimage')).toBe('appimage');
      expect(extensionFromUrl('https://example.com/file.flatpak')).toBe('flatpak');
      // 11+ chars should not match
      expect(extensionFromUrl('https://example.com/file.verylongext1')).toBe('');
    });

    test('returns empty string for invalid URLs', () => {
      expect(extensionFromUrl('not-a-url')).toBe('');
    });
  });

  describe('isPageNavigation', () => {
    test('identifies same-page anchor links', () => {
      expect(isPageNavigation('https://example.com/page/index.html#section1')).toBe(true);
    });

    test('allows links to different pages', () => {
      expect(isPageNavigation('https://example.com/other-page')).toBe(false);
    });

    test('allows links to different origins', () => {
      expect(isPageNavigation('https://other.com/page')).toBe(false);
    });

    test('returns true for invalid URLs', () => {
      expect(isPageNavigation(':::invalid')).toBe(true);
    });
  });

  describe('isImageUrl', () => {
    test('identifies common image extensions', () => {
      expect(isImageUrl('https://example.com/photo.jpg')).toBe(true);
      expect(isImageUrl('https://example.com/photo.jpeg')).toBe(true);
      expect(isImageUrl('https://example.com/photo.png')).toBe(true);
      expect(isImageUrl('https://example.com/photo.gif')).toBe(true);
      expect(isImageUrl('https://example.com/photo.webp')).toBe(true);
      expect(isImageUrl('https://example.com/photo.svg')).toBe(true);
      expect(isImageUrl('https://example.com/photo.avif')).toBe(true);
    });

    test('returns false for non-image URLs', () => {
      expect(isImageUrl('https://example.com/file.pdf')).toBe(false);
      expect(isImageUrl('https://example.com/video.mp4')).toBe(false);
      expect(isImageUrl('https://example.com/page')).toBe(false);
    });
  });

  describe('parseSrcset', () => {
    test('parses simple srcset', () => {
      const result = parseSrcset('image-480w.jpg 480w, image-800w.jpg 800w');
      expect(result).toEqual(['image-480w.jpg', 'image-800w.jpg']);
    });

    test('parses srcset with pixel density descriptors', () => {
      const result = parseSrcset('image.jpg 1x, image@2x.jpg 2x');
      expect(result).toEqual(['image.jpg', 'image@2x.jpg']);
    });

    test('handles single entry', () => {
      const result = parseSrcset('image.jpg 480w');
      expect(result).toEqual(['image.jpg']);
    });

    test('handles empty string', () => {
      const result = parseSrcset('');
      expect(result).toEqual([]);
    });

    test('handles extra whitespace', () => {
      const result = parseSrcset('  image1.jpg  480w ,  image2.jpg  800w  ');
      expect(result).toEqual(['image1.jpg', 'image2.jpg']);
    });
  });
});
