const FILTERS = {
  images: {
    label: 'Images',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff', 'tif', 'avif'],
    icon: '\u{1F5BC}'
  },
  videos: {
    label: 'Videos',
    extensions: ['mp4', 'webm', 'avi', 'mkv', 'mov', 'flv', 'wmv', 'mpg', 'mpeg', 'm4v', 'ogv', '3gp'],
    icon: '\u{1F3AC}'
  },
  audio: {
    label: 'Audio',
    extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a', 'opus', 'mid', 'midi'],
    icon: '\u{1F3B5}'
  },
  documents: {
    label: 'Documents',
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'txt', 'csv', 'epub'],
    icon: '\u{1F4C4}'
  },
  archives: {
    label: 'Archives',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'zst', 'cab', 'iso', 'dmg'],
    icon: '\u{1F4E6}'
  },
  programs: {
    label: 'Programs',
    extensions: ['exe', 'msi', 'deb', 'rpm', 'apk', 'appimage', 'snap', 'flatpak', 'jar', 'dmg'],
    icon: '\u{2699}'
  }
};

const DOWNLOAD_STATES = {
  QUEUED: 'queued',
  DOWNLOADING: 'downloading',
  PAUSED: 'paused',
  COMPLETE: 'complete',
  ERROR: 'error',
  CANCELLED: 'cancelled',
  DUPLICATE: 'duplicate'
};

const DEFAULT_SETTINGS = {
  maxConcurrent: 4,
  defaultPath: '',
  showNotifications: true,
  autoStart: true,
  conflictAction: 'uniquify',
  duplicateAction: 'ask',
  minFileSize: 0,
  maxFileSize: 0
};

const MSG = {
  SCAN_PAGE: 'scanPage',
  SCAN_RESULT: 'scanResult',
  START_DOWNLOADS: 'startDownloads',
  PAUSE_DOWNLOAD: 'pauseDownload',
  RESUME_DOWNLOAD: 'resumeDownload',
  CANCEL_DOWNLOAD: 'cancelDownload',
  PAUSE_ALL: 'pauseAll',
  RESUME_ALL: 'resumeAll',
  CLEAR_COMPLETE: 'clearComplete',
  GET_DOWNLOADS: 'getDownloads',
  GET_SETTINGS: 'getSettings',
  SAVE_SETTINGS: 'saveSettings',
  DOWNLOAD_UPDATE: 'downloadUpdate',
  OPEN_SELECTOR: 'openSelector',
  OPEN_MANAGER: 'openManager',
  OPEN_MANAGER_SIDE_PANEL: 'openManagerSidePanel',
  RETRY_DOWNLOAD: 'retryDownload',
  REMOVE_DOWNLOAD: 'removeDownload',
  GET_RECENT_PATHS: 'getRecentPaths',
  RESOLVE_DUPLICATE: 'resolveDuplicate',
  REORDER_DOWNLOADS: 'reorderDownloads'
};

const PathUtils = {
  validate(path) {
    if (!path || !path.trim()) return { valid: true, error: null };
    const p = path.trim();
    if (p.length > 200) return { valid: false, error: 'Path too long (max 200 characters)' };
    if (/[<>:"|?*]/.test(p)) return { valid: false, error: 'Path contains invalid characters: < > : " | ? *' };
    if (/\.\.[\\/]/.test(p) || p === '..') return { valid: false, error: 'Path traversal (..) is not allowed' };
    if (/^[/\\]/.test(p) || /^[a-zA-Z]:/.test(p)) return { valid: false, error: 'Absolute paths are not allowed' };
    return { valid: true, error: null };
  },

  sanitize(path) {
    if (!path) return '';
    let p = path.trim();
    p = p.replace(/\\/g, '/');
    p = p.replace(/[<>:"|?*]/g, '');
    p = p.replace(/\.\.\/|\.\.$/g, '');
    p = p.replace(/\/+/g, '/');
    p = p.replace(/^\/|\/$/g, '');
    return p;
  },

  buildPreview(subfolder, filename) {
    const parts = ['Downloads'];
    if (subfolder && subfolder.trim()) parts.push(subfolder.trim());
    if (filename) parts.push(filename);
    return parts.join(' / ');
  }
};

if (typeof module !== 'undefined') {
  module.exports = { FILTERS, DOWNLOAD_STATES, DEFAULT_SETTINGS, MSG, PathUtils };
}
