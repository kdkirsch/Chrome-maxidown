document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  let downloads = [];
  let currentFilter = 'all';
  let settings = { ...DEFAULT_SETTINGS };

  // ── Load initial data ──────────────────────────────────────────────────
  chrome.runtime.sendMessage({ action: MSG.GET_DOWNLOADS }, (res) => {
    if (res && res.downloads) {
      downloads = res.downloads;
      render();
    }
  });

  chrome.runtime.sendMessage({ action: MSG.GET_SETTINGS }, (res) => {
    if (res && res.settings) {
      settings = res.settings;
      loadSettings();
    }
  });

  // ── Listen for updates ─────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === MSG.DOWNLOAD_UPDATE) {
      downloads = msg.downloads;
      render();
    }
  });

  // ── Global actions ─────────────────────────────────────────────────────
  $('pauseAll').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: MSG.PAUSE_ALL });
  });

  $('resumeAll').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: MSG.RESUME_ALL });
  });

  $('clearComplete').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: MSG.CLEAR_COMPLETE });
  });

  // ── Settings ───────────────────────────────────────────────────────────
  $('toggleSettings').addEventListener('click', () => {
    const panel = $('settingsPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  // Validate path input in settings
  $('settDefaultPath').addEventListener('input', () => {
    const val = $('settDefaultPath').value.trim();
    const result = PathUtils.validate(val);
    const errorEl = $('settPathError');
    const hintEl = $('settPathHint');
    if (!result.valid) {
      errorEl.textContent = result.error;
      errorEl.classList.add('visible');
      hintEl.style.display = 'none';
      $('settDefaultPath').classList.add('input-error');
    } else {
      errorEl.classList.remove('visible');
      hintEl.style.display = '';
      $('settDefaultPath').classList.remove('input-error');
    }
  });

  $('saveSettings').addEventListener('click', () => {
    const pathVal = $('settDefaultPath').value.trim();
    const validation = PathUtils.validate(pathVal);
    if (!validation.valid) return; // don't save with invalid path
    settings.maxConcurrent = parseInt($('settMaxConcurrent').value) || 4;
    settings.defaultPath = pathVal;
    settings.conflictAction = $('settConflictAction').value;
    settings.autoStart = $('settAutoStart').checked;
    chrome.runtime.sendMessage({ action: MSG.SAVE_SETTINGS, settings });
    $('settingsPanel').style.display = 'none';
  });

  function loadSettings() {
    $('settMaxConcurrent').value = settings.maxConcurrent;
    $('settDefaultPath').value = settings.defaultPath || '';
    $('settConflictAction').value = settings.conflictAction;
    $('settAutoStart').checked = settings.autoStart;
  }

  // ── Filter bar ─────────────────────────────────────────────────────────
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  // ── Render ─────────────────────────────────────────────────────────────
  function render() {
    updateStats();

    let filtered = downloads;
    if (currentFilter !== 'all') {
      filtered = downloads.filter(d => d.state === currentFilter);
    }

    const container = $('downloadList');

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state" id="emptyState">
          <div class="empty-icon">&#128229;</div>
          <p>${currentFilter === 'all' ? 'No downloads yet.' : `No ${currentFilter} downloads.`}</p>
          <p class="empty-hint">Use the toolbar icon to grab links and media from any page.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(d => renderItem(d)).join('');

    // Attach action handlers
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id = parseInt(btn.dataset.id);
        chrome.runtime.sendMessage({ action, id });
      });
    });
  }

  function renderItem(d) {
    const statusIcon = getStatusIcon(d.state);
    const actions = getActions(d);
    const progressClass = d.state === DOWNLOAD_STATES.COMPLETE ? 'complete'
      : d.state === DOWNLOAD_STATES.PAUSED ? 'paused'
      : d.state === DOWNLOAD_STATES.ERROR ? 'error'
      : 'downloading';

    const eta = formatEta(d);

    return `
      <div class="dl-item">
        <div class="dl-row">
          <div class="dl-status-icon ${d.state}">${statusIcon}</div>
          <div class="dl-info">
            <div class="dl-filename" title="${escAttr(d.filename)}">
              ${d.subfolder ? `<span class="dl-subfolder-icon">&#128193;</span> <span class="dl-subfolder">${escHtml(d.subfolder)}/</span>` : ''}${escHtml(d.filename)}
            </div>
            <div class="dl-url" title="${escAttr(d.url)}">${escHtml(d.url)}</div>
            <div class="dl-meta">
              ${d.state === DOWNLOAD_STATES.DOWNLOADING
                ? `<span class="dl-percent">${d.progress}%</span>` : ''}
              ${d.state === DOWNLOAD_STATES.DOWNLOADING && d.speed > 0
                ? `<span class="dl-speed">${formatSpeed(d.speed)}</span>` : ''}
              ${d.totalBytes > 0
                ? `<span class="dl-size">${formatBytes(d.bytesReceived)} / ${formatBytes(d.totalBytes)}</span>`
                : d.bytesReceived > 0 ? `<span class="dl-size">${formatBytes(d.bytesReceived)}</span>` : ''}
              ${eta ? `<span class="dl-eta">${eta}</span>` : ''}
              ${d.state === DOWNLOAD_STATES.COMPLETE
                ? `<span style="color:var(--success)">Complete</span>${d.totalBytes > 0 ? ` <span class="dl-size">(${formatBytes(d.totalBytes)})</span>` : ''}` : ''}
              ${d.state === DOWNLOAD_STATES.QUEUED ? '<span style="color:var(--warning)">Queued</span>' : ''}
              ${d.error ? `<span class="dl-error-msg">${escHtml(d.error)}</span>` : ''}
            </div>
          </div>
          <div class="dl-actions">${actions}</div>
        </div>
        ${d.state !== DOWNLOAD_STATES.COMPLETE && d.state !== DOWNLOAD_STATES.ERROR && d.state !== DOWNLOAD_STATES.CANCELLED ? `
        <div class="dl-progress-bar">
          <div class="dl-progress-fill ${progressClass}" style="width:${d.progress}%"></div>
        </div>
        ` : d.state === DOWNLOAD_STATES.COMPLETE ? `
        <div class="dl-progress-bar">
          <div class="dl-progress-fill complete" style="width:100%"></div>
        </div>
        ` : ''}
      </div>
    `;
  }

  function getStatusIcon(state) {
    switch (state) {
      case DOWNLOAD_STATES.DOWNLOADING: return '&#11015;';
      case DOWNLOAD_STATES.QUEUED: return '&#9201;';
      case DOWNLOAD_STATES.PAUSED: return '&#9646;&#9646;';
      case DOWNLOAD_STATES.COMPLETE: return '&#10003;';
      case DOWNLOAD_STATES.ERROR: return '&#10007;';
      case DOWNLOAD_STATES.CANCELLED: return '&#10007;';
      default: return '?';
    }
  }

  function getActions(d) {
    const btns = [];
    if (d.state === DOWNLOAD_STATES.DOWNLOADING) {
      btns.push(`<button class="btn" data-action="${MSG.PAUSE_DOWNLOAD}" data-id="${d.id}">Pause</button>`);
      btns.push(`<button class="btn" data-action="${MSG.CANCEL_DOWNLOAD}" data-id="${d.id}">Cancel</button>`);
    } else if (d.state === DOWNLOAD_STATES.PAUSED) {
      btns.push(`<button class="btn" data-action="${MSG.RESUME_DOWNLOAD}" data-id="${d.id}">Resume</button>`);
      btns.push(`<button class="btn" data-action="${MSG.CANCEL_DOWNLOAD}" data-id="${d.id}">Cancel</button>`);
    } else if (d.state === DOWNLOAD_STATES.QUEUED) {
      btns.push(`<button class="btn" data-action="${MSG.PAUSE_DOWNLOAD}" data-id="${d.id}">Pause</button>`);
      btns.push(`<button class="btn" data-action="${MSG.REMOVE_DOWNLOAD}" data-id="${d.id}">Remove</button>`);
    } else if (d.state === DOWNLOAD_STATES.ERROR || d.state === DOWNLOAD_STATES.CANCELLED) {
      btns.push(`<button class="btn" data-action="${MSG.RETRY_DOWNLOAD}" data-id="${d.id}">Retry</button>`);
      btns.push(`<button class="btn" data-action="${MSG.REMOVE_DOWNLOAD}" data-id="${d.id}">Remove</button>`);
    } else if (d.state === DOWNLOAD_STATES.COMPLETE) {
      btns.push(`<button class="btn" data-action="${MSG.REMOVE_DOWNLOAD}" data-id="${d.id}">Remove</button>`);
    }
    return btns.join('');
  }

  function updateStats() {
    const active = downloads.filter(d => d.state === DOWNLOAD_STATES.DOWNLOADING);
    const queued = downloads.filter(d => d.state === DOWNLOAD_STATES.QUEUED);
    const totalSpeed = active.reduce((sum, d) => sum + (d.speed || 0), 0);

    $('activeLabel').textContent = active.length;
    $('queuedLabel').textContent = queued.length;
    $('totalSpeed').textContent = formatSpeed(totalSpeed);
  }

  // ── Formatting (delegating to module-level functions) ──────────────────
  function formatBytes(bytes) { return _formatBytes(bytes); }
  function formatSpeed(bytesPerSec) { return _formatSpeed(bytesPerSec); }
  function formatEta(d) { return _formatEta(d); }
  function escHtml(str) { return _escHtml(str); }
  function escAttr(str) { return _escAttr(str); }
});

// ── Exported utility functions ────────────────────────────────────────────
function _formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function _formatSpeed(bytesPerSec) {
  return _formatBytes(bytesPerSec) + '/s';
}

function _formatEta(d) {
  if (d.state !== 'downloading' || !d.speed || d.speed <= 0 || !d.totalBytes) return '';
  const remaining = d.totalBytes - d.bytesReceived;
  if (remaining <= 0) return '';
  const seconds = Math.ceil(remaining / d.speed);
  if (seconds < 60) return `${seconds}s left`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s left`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m left`;
}

function _escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function _escAttr(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

if (typeof module !== 'undefined') {
  module.exports = { formatBytes: _formatBytes, formatSpeed: _formatSpeed, formatEta: _formatEta, escHtml: _escHtml, escAttr: _escAttr };
}
