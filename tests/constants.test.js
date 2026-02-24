const { FILTERS, DOWNLOAD_STATES, DEFAULT_SETTINGS, MSG, PathUtils } = require('../common/constants');

describe('constants.js', () => {
  describe('FILTERS', () => {
    test('defines all expected filter categories', () => {
      expect(Object.keys(FILTERS)).toEqual(
        expect.arrayContaining(['images', 'videos', 'audio', 'documents', 'archives', 'programs'])
      );
    });

    test('each filter has required properties', () => {
      for (const [key, filter] of Object.entries(FILTERS)) {
        expect(filter).toHaveProperty('label');
        expect(filter).toHaveProperty('extensions');
        expect(filter).toHaveProperty('icon');
        expect(Array.isArray(filter.extensions)).toBe(true);
        expect(filter.extensions.length).toBeGreaterThan(0);
      }
    });

    test('images filter contains common image extensions', () => {
      expect(FILTERS.images.extensions).toContain('jpg');
      expect(FILTERS.images.extensions).toContain('png');
      expect(FILTERS.images.extensions).toContain('gif');
      expect(FILTERS.images.extensions).toContain('webp');
    });

    test('videos filter contains common video extensions', () => {
      expect(FILTERS.videos.extensions).toContain('mp4');
      expect(FILTERS.videos.extensions).toContain('webm');
      expect(FILTERS.videos.extensions).toContain('avi');
    });

    test('no duplicate extensions within a single filter', () => {
      for (const [key, filter] of Object.entries(FILTERS)) {
        const unique = new Set(filter.extensions);
        expect(unique.size).toBe(filter.extensions.length);
      }
    });
  });

  describe('DOWNLOAD_STATES', () => {
    test('defines all expected states', () => {
      expect(DOWNLOAD_STATES.QUEUED).toBe('queued');
      expect(DOWNLOAD_STATES.DOWNLOADING).toBe('downloading');
      expect(DOWNLOAD_STATES.PAUSED).toBe('paused');
      expect(DOWNLOAD_STATES.COMPLETE).toBe('complete');
      expect(DOWNLOAD_STATES.ERROR).toBe('error');
      expect(DOWNLOAD_STATES.CANCELLED).toBe('cancelled');
    });

    test('all values are unique strings', () => {
      const values = Object.values(DOWNLOAD_STATES);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
      values.forEach(v => expect(typeof v).toBe('string'));
    });
  });

  describe('DEFAULT_SETTINGS', () => {
    test('has expected default values', () => {
      expect(DEFAULT_SETTINGS.maxConcurrent).toBe(4);
      expect(DEFAULT_SETTINGS.defaultPath).toBe('');
      expect(DEFAULT_SETTINGS.showNotifications).toBe(true);
      expect(DEFAULT_SETTINGS.autoStart).toBe(true);
      expect(DEFAULT_SETTINGS.conflictAction).toBe('uniquify');
      expect(DEFAULT_SETTINGS.minFileSize).toBe(0);
      expect(DEFAULT_SETTINGS.maxFileSize).toBe(0);
    });
  });

  describe('MSG', () => {
    test('defines all expected message types', () => {
      const expectedKeys = [
        'SCAN_PAGE', 'SCAN_RESULT', 'START_DOWNLOADS',
        'PAUSE_DOWNLOAD', 'RESUME_DOWNLOAD', 'CANCEL_DOWNLOAD',
        'PAUSE_ALL', 'RESUME_ALL', 'CLEAR_COMPLETE',
        'GET_DOWNLOADS', 'GET_SETTINGS', 'SAVE_SETTINGS',
        'DOWNLOAD_UPDATE', 'OPEN_SELECTOR', 'OPEN_MANAGER',
        'RETRY_DOWNLOAD', 'REMOVE_DOWNLOAD', 'GET_RECENT_PATHS'
      ];
      for (const key of expectedKeys) {
        expect(MSG).toHaveProperty(key);
        expect(typeof MSG[key]).toBe('string');
      }
    });

    test('all message values are unique', () => {
      const values = Object.values(MSG);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });
  });

  describe('PathUtils', () => {
    describe('validate', () => {
      test('accepts empty/null paths', () => {
        expect(PathUtils.validate('').valid).toBe(true);
        expect(PathUtils.validate(null).valid).toBe(true);
        expect(PathUtils.validate(undefined).valid).toBe(true);
      });

      test('accepts valid subfolder paths', () => {
        expect(PathUtils.validate('photos').valid).toBe(true);
        expect(PathUtils.validate('photos/vacation').valid).toBe(true);
        expect(PathUtils.validate('my-downloads').valid).toBe(true);
        expect(PathUtils.validate('2024/January').valid).toBe(true);
      });

      test('rejects paths with invalid characters', () => {
        expect(PathUtils.validate('path<name').valid).toBe(false);
        expect(PathUtils.validate('path>name').valid).toBe(false);
        expect(PathUtils.validate('path:name').valid).toBe(false);
        expect(PathUtils.validate('path"name').valid).toBe(false);
        expect(PathUtils.validate('path|name').valid).toBe(false);
        expect(PathUtils.validate('path?name').valid).toBe(false);
        expect(PathUtils.validate('path*name').valid).toBe(false);
      });

      test('rejects path traversal attempts', () => {
        expect(PathUtils.validate('../etc').valid).toBe(false);
        expect(PathUtils.validate('foo/../bar').valid).toBe(false);
        expect(PathUtils.validate('..').valid).toBe(false);
      });

      test('rejects absolute paths', () => {
        expect(PathUtils.validate('/usr/local').valid).toBe(false);
        expect(PathUtils.validate('C:\\Users').valid).toBe(false);
        expect(PathUtils.validate('\\\\server').valid).toBe(false);
      });

      test('rejects paths over 200 characters', () => {
        const longPath = 'a'.repeat(201);
        expect(PathUtils.validate(longPath).valid).toBe(false);
      });

      test('returns error message on failure', () => {
        const result = PathUtils.validate('../bad');
        expect(result.valid).toBe(false);
        expect(result.error).toBeTruthy();
        expect(typeof result.error).toBe('string');
      });
    });

    describe('sanitize', () => {
      test('returns empty string for null/empty', () => {
        expect(PathUtils.sanitize('')).toBe('');
        expect(PathUtils.sanitize(null)).toBe('');
        expect(PathUtils.sanitize(undefined)).toBe('');
      });

      test('trims whitespace', () => {
        expect(PathUtils.sanitize('  photos  ')).toBe('photos');
      });

      test('normalizes backslashes to forward slashes', () => {
        expect(PathUtils.sanitize('photos\\vacation')).toBe('photos/vacation');
      });

      test('strips invalid characters', () => {
        expect(PathUtils.sanitize('photo<s>')).toBe('photos');
      });

      test('removes path traversal sequences', () => {
        expect(PathUtils.sanitize('../etc')).toBe('etc');
        expect(PathUtils.sanitize('foo/../bar')).toBe('foo/bar');
      });

      test('collapses multiple slashes', () => {
        expect(PathUtils.sanitize('photos//vacation///pics')).toBe('photos/vacation/pics');
      });

      test('removes leading and trailing slashes', () => {
        expect(PathUtils.sanitize('/photos/vacation/')).toBe('photos/vacation');
      });
    });

    describe('buildPreview', () => {
      test('shows Downloads prefix with subfolder and filename', () => {
        expect(PathUtils.buildPreview('photos', 'pic.jpg')).toBe('Downloads / photos / pic.jpg');
      });

      test('shows only Downloads and filename when no subfolder', () => {
        expect(PathUtils.buildPreview('', 'file.pdf')).toBe('Downloads / file.pdf');
        expect(PathUtils.buildPreview(null, 'file.pdf')).toBe('Downloads / file.pdf');
      });

      test('shows only Downloads when no subfolder or filename', () => {
        expect(PathUtils.buildPreview('', '')).toBe('Downloads');
      });

      test('handles nested subfolders', () => {
        expect(PathUtils.buildPreview('a/b/c', 'x.txt')).toBe('Downloads / a/b/c / x.txt');
      });
    });
  });
});
