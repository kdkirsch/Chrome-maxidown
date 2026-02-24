const { FILTERS, DOWNLOAD_STATES, DEFAULT_SETTINGS, MSG } = require('../common/constants');

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
        'RETRY_DOWNLOAD', 'REMOVE_DOWNLOAD'
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
});
