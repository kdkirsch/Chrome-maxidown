// Must load before service-worker since it uses importScripts
const { DOWNLOAD_STATES, DEFAULT_SETTINGS, MSG } = require('../common/constants');

// Provide constants as globals (simulates importScripts behavior)
global.DOWNLOAD_STATES = DOWNLOAD_STATES;
global.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
global.MSG = MSG;

// Suppress setInterval (the progress poller)
jest.useFakeTimers();

const sw = require('../background/service-worker');

describe('service-worker.js', () => {
  beforeEach(() => {
    // Reset state between tests
    sw.downloads = [];
    sw.settings = { ...DEFAULT_SETTINGS };
    sw.nextId = 1;
    jest.clearAllMocks();

    // Default: chrome.downloads.download succeeds
    chrome.downloads.download.mockImplementation((opts, cb) => cb && cb(100));
    chrome.runtime.lastError = null;
  });

  describe('filenameFromUrl', () => {
    test('extracts filename from URL path', () => {
      expect(sw.filenameFromUrl('https://example.com/path/file.pdf')).toBe('file.pdf');
    });

    test('decodes URL-encoded filenames', () => {
      expect(sw.filenameFromUrl('https://example.com/my%20file.pdf')).toBe('my file.pdf');
    });

    test('returns "download" for root URL', () => {
      expect(sw.filenameFromUrl('https://example.com/')).toBe('download');
    });

    test('returns "download" for invalid URL', () => {
      expect(sw.filenameFromUrl('not-a-url')).toBe('download');
    });
  });

  describe('sanitizeDownload', () => {
    test('returns only safe properties', () => {
      const input = {
        id: 1,
        url: 'https://example.com/file.pdf',
        filename: 'file.pdf',
        state: DOWNLOAD_STATES.QUEUED,
        progress: 0,
        bytesReceived: 0,
        totalBytes: 0,
        speed: 0,
        error: null,
        addedAt: 123456,
        downloadId: 100,      // internal — should not leak
        referrer: 'https://ref.com',  // internal
        subfolder: 'path'     // internal
      };
      const result = sw.sanitizeDownload(input);
      expect(result).toEqual({
        id: 1,
        url: 'https://example.com/file.pdf',
        filename: 'file.pdf',
        state: DOWNLOAD_STATES.QUEUED,
        progress: 0,
        bytesReceived: 0,
        totalBytes: 0,
        speed: 0,
        error: null,
        addedAt: 123456
      });
      expect(result).not.toHaveProperty('downloadId');
      expect(result).not.toHaveProperty('referrer');
      expect(result).not.toHaveProperty('subfolder');
    });
  });

  describe('addDownloads', () => {
    test('adds items to the download queue', () => {
      const result = sw.addDownloads([
        { url: 'https://example.com/file1.pdf', referrer: 'https://example.com' },
        { url: 'https://example.com/file2.pdf', referrer: 'https://example.com' }
      ]);
      expect(result).toHaveLength(2);
      expect(sw.downloads).toHaveLength(2);
    });

    test('assigns incremental IDs', () => {
      sw.addDownloads([
        { url: 'https://example.com/a.pdf' },
        { url: 'https://example.com/b.pdf' }
      ]);
      expect(sw.downloads[0].id).toBe(1);
      expect(sw.downloads[1].id).toBe(2);
    });

    test('sets initial state to QUEUED (then immediately processes queue) when autoStart is true', () => {
      sw.settings.autoStart = true;
      sw.addDownloads([{ url: 'https://example.com/file.pdf' }]);
      // addDownloads sets QUEUED, then processQueue immediately starts it
      // so by the time addDownloads returns, the item is DOWNLOADING
      expect(sw.downloads[0].state).toBe(DOWNLOAD_STATES.DOWNLOADING);
    });

    test('sets initial state to PAUSED when autoStart is false', () => {
      sw.settings.autoStart = false;
      sw.addDownloads([{ url: 'https://example.com/file.pdf' }]);
      expect(sw.downloads[0].state).toBe(DOWNLOAD_STATES.PAUSED);
    });

    test('uses provided filename or extracts from URL', () => {
      sw.addDownloads([
        { url: 'https://example.com/file.pdf', filename: 'custom.pdf' },
        { url: 'https://example.com/path/original.zip' }
      ]);
      expect(sw.downloads[0].filename).toBe('custom.pdf');
      expect(sw.downloads[1].filename).toBe('original.zip');
    });

    test('uses default subfolder from settings', () => {
      sw.settings.defaultPath = 'my-downloads';
      sw.addDownloads([{ url: 'https://example.com/file.pdf' }]);
      expect(sw.downloads[0].subfolder).toBe('my-downloads');
    });

    test('uses provided subfolder over default', () => {
      sw.settings.defaultPath = 'default';
      sw.addDownloads([{ url: 'https://example.com/file.pdf', subfolder: 'custom' }]);
      expect(sw.downloads[0].subfolder).toBe('custom');
    });

    test('persists nextId to chrome storage', () => {
      sw.addDownloads([{ url: 'https://example.com/file.pdf' }]);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ nextId: expect.any(Number) });
    });
  });

  describe('processQueue', () => {
    test('starts queued downloads up to maxConcurrent', () => {
      sw.settings.maxConcurrent = 2;
      sw.addDownloads([
        { url: 'https://example.com/1.pdf' },
        { url: 'https://example.com/2.pdf' },
        { url: 'https://example.com/3.pdf' }
      ]);
      // addDownloads calls processQueue, which starts up to 2
      const downloading = sw.downloads.filter(d => d.state === DOWNLOAD_STATES.DOWNLOADING);
      expect(downloading.length).toBeLessThanOrEqual(2);
    });

    test('does not start more downloads than slots available', () => {
      sw.settings.maxConcurrent = 1;
      // Manually set up a downloading item
      sw.downloads = [
        { id: 1, state: DOWNLOAD_STATES.DOWNLOADING, downloadId: 50 },
        { id: 2, state: DOWNLOAD_STATES.QUEUED, url: 'https://example.com/2.pdf', filename: '2.pdf' }
      ];
      sw.processQueue();
      // Item 2 should remain queued because slot is full
      expect(sw.downloads[1].state).toBe(DOWNLOAD_STATES.QUEUED);
    });
  });

  describe('startDownload', () => {
    test('calls chrome.downloads.download with correct options', () => {
      const item = {
        id: 1,
        url: 'https://example.com/file.pdf',
        filename: 'file.pdf',
        subfolder: '',
        state: DOWNLOAD_STATES.QUEUED,
        error: null
      };
      sw.startDownload(item);
      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/file.pdf',
          conflictAction: 'uniquify'
        }),
        expect.any(Function)
      );
      expect(item.state).toBe(DOWNLOAD_STATES.DOWNLOADING);
    });

    test('sets subfolder/filename path when subfolder is provided', () => {
      const item = {
        id: 1,
        url: 'https://example.com/file.pdf',
        filename: 'file.pdf',
        subfolder: 'my-folder',
        state: DOWNLOAD_STATES.QUEUED,
        error: null
      };
      sw.startDownload(item);
      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'my-folder/file.pdf'
        }),
        expect.any(Function)
      );
    });

    test('handles download error from Chrome API', () => {
      chrome.downloads.download.mockImplementation((opts, cb) => {
        chrome.runtime.lastError = { message: 'Network error' };
        cb(undefined);
        chrome.runtime.lastError = null;
      });
      const item = {
        id: 1,
        url: 'https://example.com/file.pdf',
        filename: 'file.pdf',
        subfolder: '',
        state: DOWNLOAD_STATES.QUEUED,
        error: null
      };
      sw.startDownload(item);
      expect(item.state).toBe(DOWNLOAD_STATES.ERROR);
      expect(item.error).toBe('Network error');
    });

    test('assigns downloadId on success', () => {
      chrome.downloads.download.mockImplementation((opts, cb) => cb(42));
      const item = {
        id: 1,
        url: 'https://example.com/file.pdf',
        filename: 'file.pdf',
        subfolder: '',
        state: DOWNLOAD_STATES.QUEUED,
        error: null
      };
      sw.startDownload(item);
      expect(item.downloadId).toBe(42);
    });
  });

  describe('broadcastUpdate', () => {
    test('sends download update message', () => {
      sw.downloads = [{
        id: 1,
        url: 'https://example.com/file.pdf',
        filename: 'file.pdf',
        state: DOWNLOAD_STATES.DOWNLOADING,
        progress: 50,
        bytesReceived: 500,
        totalBytes: 1000,
        speed: 100,
        error: null,
        addedAt: 123
      }];
      // Mock sendMessage to return a resolved promise
      chrome.runtime.sendMessage.mockReturnValue(Promise.resolve());
      sw.broadcastUpdate();
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: MSG.DOWNLOAD_UPDATE,
          downloads: expect.any(Array)
        })
      );
    });
  });

  describe('openManager', () => {
    test('creates new tab if no manager tab exists', () => {
      chrome.tabs.query.mockImplementation((q, cb) => cb([]));
      sw.openManager();
      expect(chrome.tabs.create).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining('manager/manager.html') })
      );
    });

    test('activates existing manager tab if one exists', () => {
      chrome.tabs.query.mockImplementation((q, cb) => cb([{ id: 5 }]));
      sw.openManager();
      expect(chrome.tabs.update).toHaveBeenCalledWith(5, { active: true });
    });
  });
});
