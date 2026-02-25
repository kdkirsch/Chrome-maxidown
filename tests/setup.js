// Chrome API mocks for Jest
const chrome = {
  runtime: {
    onInstalled: { addListener: jest.fn() },
    onStartup: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() },
    sendMessage: jest.fn((...args) => {
      const cb = args.find(a => typeof a === 'function');
      if (cb) cb();
      return Promise.resolve();
    }),
    lastError: null,
    getURL: jest.fn(path => `chrome-extension://fake-id/${path}`)
  },
  storage: {
    local: {
      get: jest.fn((keys, cb) => cb && cb({})),
      set: jest.fn((obj, cb) => cb && cb())
    }
  },
  downloads: {
    download: jest.fn((options, cb) => cb && cb(100)),
    pause: jest.fn(),
    resume: jest.fn(),
    cancel: jest.fn(),
    search: jest.fn((query, cb) => cb && cb([])),
    onChanged: { addListener: jest.fn() }
  },
  contextMenus: {
    create: jest.fn(),
    removeAll: jest.fn(cb => cb && cb()),
    onClicked: { addListener: jest.fn() }
  },
  scripting: {
    executeScript: jest.fn((opts, cb) => cb && cb())
  },
  tabs: {
    create: jest.fn(),
    update: jest.fn(),
    query: jest.fn((q, cb) => cb && cb([])),
    sendMessage: jest.fn((tabId, msg, cb) => cb && cb())
  },
  sidePanel: {
    open: jest.fn()
  }
};

global.chrome = chrome;

// Mock importScripts for service worker
global.importScripts = jest.fn();
