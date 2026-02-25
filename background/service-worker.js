if (typeof importScripts === 'function') {
  importScripts('../common/constants.js');
}
if (typeof require !== 'undefined') {
  const c = require('../common/constants.js');
  var FILTERS = c.FILTERS;
  var DOWNLOAD_STATES = c.DOWNLOAD_STATES;
  var DEFAULT_SETTINGS = c.DEFAULT_SETTINGS;
  var MSG = c.MSG;
  var PathUtils = c.PathUtils;
}

// ── State ────────────────────────────────────────────────────────────────────
let downloads = [];   // { id, url, filename, subfolder, state, downloadId, progress, speed, error, addedAt }
let settings = { ...DEFAULT_SETTINGS };
let nextId = 1;
let recentPaths = [];

// ── Init ─────────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['settings', 'nextId', 'recentPaths'], (res) => {
    if (res.settings) settings = { ...DEFAULT_SETTINGS, ...res.settings };
    if (res.nextId) nextId = res.nextId;
    if (res.recentPaths) recentPaths = res.recentPaths;
  });
  createContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['settings', 'nextId', 'recentPaths'], (res) => {
    if (res.settings) settings = { ...DEFAULT_SETTINGS, ...res.settings };
    if (res.nextId) nextId = res.nextId;
    if (res.recentPaths) recentPaths = res.recentPaths;
  });
});

// ── Context Menus ────────────────────────────────────────────────────────────
function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'maxidown-link',
      title: 'Download link with MaxiDown',
      contexts: ['link']
    });
    chrome.contextMenus.create({
      id: 'maxidown-image',
      title: 'Download image with MaxiDown',
      contexts: ['image']
    });
    chrome.contextMenus.create({
      id: 'maxidown-page-links',
      title: 'MaxiDown \u2014 Grab all links',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'maxidown-page-media',
      title: 'MaxiDown \u2014 Grab all media',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'maxidown-selection-links',
      title: 'MaxiDown \u2014 Grab links in selection',
      contexts: ['selection']
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'maxidown-link') {
    addDownloads([{ url: info.linkUrl, referrer: tab.url }]);
  } else if (info.menuItemId === 'maxidown-image') {
    addDownloads([{ url: info.srcUrl, referrer: tab.url }]);
  } else if (info.menuItemId === 'maxidown-page-links') {
    openSelector(tab, 'links');
  } else if (info.menuItemId === 'maxidown-page-media') {
    openSelector(tab, 'media');
  } else if (info.menuItemId === 'maxidown-selection-links') {
    openSelector(tab, 'selection');
  }
});

// ── Open selector / manager pages ────────────────────────────────────────────
function openSelector(tab, mode) {
  function openSelectorTab(data) {
    const encoded = encodeURIComponent(JSON.stringify(data));
    const url = chrome.runtime.getURL(
      `selector/selector.html?mode=${mode}&tabUrl=${encodeURIComponent(tab.url)}&data=${encoded}`
    );
    chrome.tabs.create({ url });
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content/scanner.js']
  }, () => {
    if (chrome.runtime.lastError) {
      // Injection failed (e.g., chrome:// page) — open selector with empty data
      openSelectorTab({ links: [], media: [], pageUrl: tab.url, pageTitle: tab.title || '' });
      return;
    }
    chrome.tabs.sendMessage(tab.id, { action: MSG.SCAN_PAGE }, (result) => {
      if (chrome.runtime.lastError || !result) {
        // Scan failed — open selector with empty data instead of silently failing
        openSelectorTab({ links: [], media: [], pageUrl: tab.url, pageTitle: tab.title || '' });
        return;
      }
      openSelectorTab(result);
    });
  });
}

function openManager() {
  const url = chrome.runtime.getURL('manager/manager.html');
  chrome.tabs.query({ url }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      chrome.tabs.create({ url });
    }
  });
}

// ── Download Queue ───────────────────────────────────────────────────────────
function addDownloads(items) {
  let batchSubfolder = '';
  for (const item of items) {
    const filename = filenameFromUrl(item.url);
    const rawSubfolder = item.subfolder || settings.defaultPath;
    const subfolder = PathUtils.sanitize(rawSubfolder);
    if (subfolder) batchSubfolder = subfolder;
    downloads.push({
      id: nextId++,
      url: item.url,
      filename: item.filename || filename,
      referrer: item.referrer || '',
      subfolder,
      state: settings.autoStart ? DOWNLOAD_STATES.QUEUED : DOWNLOAD_STATES.PAUSED,
      downloadId: null,
      progress: 0,
      bytesReceived: 0,
      totalBytes: 0,
      speed: 0,
      error: null,
      addedAt: Date.now()
    });
  }
  // Track recently used paths
  if (batchSubfolder) {
    recentPaths = [batchSubfolder, ...recentPaths.filter(p => p !== batchSubfolder)].slice(0, 10);
    chrome.storage.local.set({ recentPaths });
  }
  chrome.storage.local.set({ nextId });
  processQueue();
  broadcastUpdate();
  return downloads.slice(-items.length);
}

function processQueue() {
  const active = downloads.filter(d => d.state === DOWNLOAD_STATES.DOWNLOADING);
  const queued = downloads.filter(d => d.state === DOWNLOAD_STATES.QUEUED);

  const slotsAvailable = settings.maxConcurrent - active.length;
  const toStart = queued.slice(0, Math.max(0, slotsAvailable));

  for (const item of toStart) {
    startDownload(item);
  }
}

function startDownload(item) {
  item.state = DOWNLOAD_STATES.DOWNLOADING;
  item.error = null;

  const subfolder = PathUtils.sanitize(item.subfolder);

  const options = {
    url: item.url,
    conflictAction: settings.conflictAction
  };

  if (subfolder && item.filename) {
    options.filename = `${subfolder}/${item.filename}`;
  } else if (item.filename) {
    options.filename = item.filename;
  }

  chrome.downloads.download(options, (downloadId) => {
    if (chrome.runtime.lastError) {
      item.state = DOWNLOAD_STATES.ERROR;
      item.error = chrome.runtime.lastError.message;
      processQueue();
      broadcastUpdate();
      return;
    }
    item.downloadId = downloadId;
    broadcastUpdate();
  });
}

// ── Chrome Downloads Events ──────────────────────────────────────────────────
chrome.downloads.onChanged.addListener((delta) => {
  const item = downloads.find(d => d.downloadId === delta.id);
  if (!item) return;

  if (delta.state) {
    if (delta.state.current === 'complete') {
      item.state = DOWNLOAD_STATES.COMPLETE;
      item.progress = 100;
      processQueue();
    } else if (delta.state.current === 'interrupted') {
      item.state = DOWNLOAD_STATES.ERROR;
      item.error = delta.error?.current || 'Download interrupted';
      processQueue();
    }
  }

  if (delta.paused) {
    if (delta.paused.current === true) {
      item.state = DOWNLOAD_STATES.PAUSED;
    } else if (delta.paused.current === false) {
      item.state = DOWNLOAD_STATES.DOWNLOADING;
    }
  }

  if (delta.error) {
    item.error = delta.error.current;
  }

  broadcastUpdate();
});

// Poll progress for active downloads
setInterval(() => {
  const active = downloads.filter(d => d.state === DOWNLOAD_STATES.DOWNLOADING && d.downloadId);
  if (active.length === 0) return;

  const ids = active.map(d => d.downloadId);
  chrome.downloads.search({ id: ids[0] }, () => {}); // keep service worker alive

  for (const item of active) {
    chrome.downloads.search({ id: item.downloadId }, (results) => {
      if (!results || results.length === 0) return;
      const dl = results[0];
      const prevBytes = item.bytesReceived;
      item.bytesReceived = dl.bytesReceived || 0;
      item.totalBytes = dl.totalBytes || 0;
      item.progress = item.totalBytes > 0
        ? Math.round((item.bytesReceived / item.totalBytes) * 100)
        : 0;
      item.speed = Math.max(0, item.bytesReceived - prevBytes); // bytes per interval
    });
  }
  broadcastUpdate();
}, 1000);

// ── Message Handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.action) {
    case MSG.START_DOWNLOADS:
      const added = addDownloads(msg.items);
      sendResponse({ ok: true, count: added.length });
      break;

    case MSG.PAUSE_DOWNLOAD: {
      const item = downloads.find(d => d.id === msg.id);
      if (item && item.downloadId) {
        chrome.downloads.pause(item.downloadId);
        item.state = DOWNLOAD_STATES.PAUSED;
      } else if (item) {
        item.state = DOWNLOAD_STATES.PAUSED;
      }
      broadcastUpdate();
      sendResponse({ ok: true });
      break;
    }

    case MSG.RESUME_DOWNLOAD: {
      const item = downloads.find(d => d.id === msg.id);
      if (item && item.downloadId) {
        chrome.downloads.resume(item.downloadId);
        item.state = DOWNLOAD_STATES.DOWNLOADING;
      } else if (item && item.state === DOWNLOAD_STATES.PAUSED) {
        item.state = DOWNLOAD_STATES.QUEUED;
        processQueue();
      }
      broadcastUpdate();
      sendResponse({ ok: true });
      break;
    }

    case MSG.CANCEL_DOWNLOAD: {
      const item = downloads.find(d => d.id === msg.id);
      if (item && item.downloadId) {
        chrome.downloads.cancel(item.downloadId);
      }
      if (item) {
        item.state = DOWNLOAD_STATES.CANCELLED;
      }
      processQueue();
      broadcastUpdate();
      sendResponse({ ok: true });
      break;
    }

    case MSG.RETRY_DOWNLOAD: {
      const item = downloads.find(d => d.id === msg.id);
      if (item) {
        item.state = DOWNLOAD_STATES.QUEUED;
        item.downloadId = null;
        item.progress = 0;
        item.bytesReceived = 0;
        item.totalBytes = 0;
        item.speed = 0;
        item.error = null;
        processQueue();
      }
      broadcastUpdate();
      sendResponse({ ok: true });
      break;
    }

    case MSG.REMOVE_DOWNLOAD: {
      const idx = downloads.findIndex(d => d.id === msg.id);
      if (idx >= 0) {
        const item = downloads[idx];
        if (item.downloadId && item.state === DOWNLOAD_STATES.DOWNLOADING) {
          chrome.downloads.cancel(item.downloadId);
        }
        downloads.splice(idx, 1);
      }
      processQueue();
      broadcastUpdate();
      sendResponse({ ok: true });
      break;
    }

    case MSG.PAUSE_ALL:
      for (const item of downloads) {
        if (item.state === DOWNLOAD_STATES.DOWNLOADING && item.downloadId) {
          chrome.downloads.pause(item.downloadId);
          item.state = DOWNLOAD_STATES.PAUSED;
        } else if (item.state === DOWNLOAD_STATES.QUEUED) {
          item.state = DOWNLOAD_STATES.PAUSED;
        }
      }
      broadcastUpdate();
      sendResponse({ ok: true });
      break;

    case MSG.RESUME_ALL:
      for (const item of downloads) {
        if (item.state === DOWNLOAD_STATES.PAUSED) {
          if (item.downloadId) {
            chrome.downloads.resume(item.downloadId);
            item.state = DOWNLOAD_STATES.DOWNLOADING;
          } else {
            item.state = DOWNLOAD_STATES.QUEUED;
          }
        }
      }
      processQueue();
      broadcastUpdate();
      sendResponse({ ok: true });
      break;

    case MSG.CLEAR_COMPLETE:
      downloads = downloads.filter(d =>
        d.state !== DOWNLOAD_STATES.COMPLETE &&
        d.state !== DOWNLOAD_STATES.CANCELLED
      );
      broadcastUpdate();
      sendResponse({ ok: true });
      break;

    case MSG.GET_DOWNLOADS:
      sendResponse({ downloads: downloads.map(sanitizeDownload) });
      break;

    case MSG.GET_SETTINGS:
      sendResponse({ settings });
      break;

    case MSG.SAVE_SETTINGS:
      settings = { ...settings, ...msg.settings };
      chrome.storage.local.set({ settings });
      sendResponse({ ok: true });
      break;

    case MSG.OPEN_SELECTOR: {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) openSelector(tabs[0], msg.mode || 'links');
      });
      sendResponse({ ok: true });
      break;
    }

    case MSG.OPEN_MANAGER:
      openManager();
      sendResponse({ ok: true });
      break;

    case MSG.OPEN_MANAGER_SIDE_PANEL: {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.sidePanel.open({ tabId: tabs[0].id });
        }
      });
      sendResponse({ ok: true });
      break;
    }

    case MSG.GET_RECENT_PATHS:
      sendResponse({ recentPaths });
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }
  return true; // keep channel open for async
});

// ── Broadcast ────────────────────────────────────────────────────────────────
function broadcastUpdate() {
  const data = { action: MSG.DOWNLOAD_UPDATE, downloads: downloads.map(sanitizeDownload) };
  chrome.runtime.sendMessage(data).catch(() => {});
}

function sanitizeDownload(d) {
  return {
    id: d.id,
    url: d.url,
    filename: d.filename,
    subfolder: d.subfolder || '',
    state: d.state,
    progress: d.progress,
    bytesReceived: d.bytesReceived,
    totalBytes: d.totalBytes,
    speed: d.speed,
    error: d.error,
    addedAt: d.addedAt
  };
}

// ── Utilities ────────────────────────────────────────────────────────────────
function filenameFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    const last = parts[parts.length - 1];
    return decodeURIComponent(last) || 'download';
  } catch {
    return 'download';
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    addDownloads,
    processQueue,
    startDownload,
    filenameFromUrl,
    sanitizeDownload,
    broadcastUpdate,
    openManager,
    get downloads() { return downloads; },
    set downloads(val) { downloads = val; },
    get settings() { return settings; },
    set settings(val) { settings = val; },
    get nextId() { return nextId; },
    set nextId(val) { nextId = val; }
  };
}
