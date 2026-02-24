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
  CANCELLED: 'cancelled'
};

const DEFAULT_SETTINGS = {
  maxConcurrent: 4,
  defaultPath: '',
  showNotifications: true,
  autoStart: true,
  conflictAction: 'uniquify',
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
  RETRY_DOWNLOAD: 'retryDownload',
  REMOVE_DOWNLOAD: 'removeDownload'
};

if (typeof module !== 'undefined') {
  module.exports = { FILTERS, DOWNLOAD_STATES, DEFAULT_SETTINGS, MSG };
}
