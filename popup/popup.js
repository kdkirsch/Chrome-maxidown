document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  // Button handlers
  $('grabLinks').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: MSG.OPEN_SELECTOR, mode: 'links' });
    window.close();
  });

  $('grabMedia').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: MSG.OPEN_SELECTOR, mode: 'media' });
    window.close();
  });

  $('openManager').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: MSG.OPEN_MANAGER });
    window.close();
  });

  // Load current download stats
  function refresh() {
    chrome.runtime.sendMessage({ action: MSG.GET_DOWNLOADS }, (res) => {
      if (!res || !res.downloads) return;
      const dls = res.downloads;

      $('activeCount').textContent = dls.filter(d => d.state === DOWNLOAD_STATES.DOWNLOADING).length;
      $('queuedCount').textContent = dls.filter(d => d.state === DOWNLOAD_STATES.QUEUED).length;
      $('completeCount').textContent = dls.filter(d => d.state === DOWNLOAD_STATES.COMPLETE).length;

      // Show active downloads
      const active = dls.filter(d =>
        d.state === DOWNLOAD_STATES.DOWNLOADING || d.state === DOWNLOAD_STATES.QUEUED
      ).slice(0, 5);

      const container = $('activeDownloads');
      container.innerHTML = active.map(d => `
        <div class="dl-item">
          <span class="dl-name" title="${escHtml(d.filename)}">${escHtml(d.filename)}</span>
          <div class="dl-progress">
            <div class="dl-progress-bar" style="width:${d.progress}%"></div>
          </div>
          <span class="dl-percent">${d.progress}%</span>
        </div>
      `).join('');
    });
  }

  refresh();

  // Listen for updates
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === MSG.DOWNLOAD_UPDATE) {
      refresh();
    }
  });
});

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
