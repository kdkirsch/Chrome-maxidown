document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  // ── Parse URL params ───────────────────────────────────────────────────
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') || 'links';
  const tabUrl = params.get('tabUrl') || '';
  let scanData = { links: [], media: [] };

  try {
    scanData = JSON.parse(decodeURIComponent(params.get('data') || '{}'));
  } catch (e) {
    console.error('Failed to parse scan data:', e);
  }

  $('pageTitle').textContent = scanData.pageTitle || tabUrl;

  // ── State ──────────────────────────────────────────────────────────────
  let currentTab = mode === 'media' ? 'media' : 'links';
  let activeFilters = new Set();
  let customFilterText = '';
  let items = []; // current visible items with .selected property

  // ── Build filter chips ─────────────────────────────────────────────────
  function buildFilterChips() {
    const container = $('filterChips');
    container.innerHTML = '';

    const currentItems = currentTab === 'links' ? scanData.links : scanData.media;

    for (const [key, filter] of Object.entries(FILTERS)) {
      const count = currentItems.filter(item =>
        filter.extensions.includes(item.type)
      ).length;

      if (count === 0) continue;

      const chip = document.createElement('button');
      chip.className = `chip ${activeFilters.has(key) ? 'active' : ''}`;
      chip.dataset.filter = key;
      chip.innerHTML = `${filter.icon} ${filter.label} <span class="chip-count">(${count})</span>`;
      chip.addEventListener('click', () => {
        if (activeFilters.has(key)) {
          activeFilters.delete(key);
        } else {
          activeFilters.add(key);
        }
        chip.classList.toggle('active');
        renderItems();
      });
      container.appendChild(chip);
    }
  }

  // ── Filter logic ───────────────────────────────────────────────────────
  function getFilteredItems() {
    const source = currentTab === 'links' ? scanData.links : scanData.media;

    let filtered = source;

    // Apply type filters (OR logic: show items matching ANY active filter)
    if (activeFilters.size > 0) {
      const allowedExts = new Set();
      for (const key of activeFilters) {
        if (FILTERS[key]) {
          FILTERS[key].extensions.forEach(ext => allowedExts.add(ext));
        }
      }
      filtered = filtered.filter(item => allowedExts.has(item.type));
    }

    // Apply custom filter
    if (customFilterText) {
      const filterText = customFilterText.trim();

      // Check if it's a regex: /pattern/flags
      const regexMatch = filterText.match(/^\/(.+)\/([gimsuy]*)$/);
      if (regexMatch) {
        try {
          const regex = new RegExp(regexMatch[1], regexMatch[2]);
          filtered = filtered.filter(item =>
            regex.test(item.url) || regex.test(item.filename)
          );
        } catch {
          // Invalid regex — ignore
        }
      } else {
        // Wildcard filter: *.pdf,*.doc
        const patterns = filterText.split(',').map(p => p.trim()).filter(Boolean);
        filtered = filtered.filter(item => {
          return patterns.some(pattern => {
            const regex = wildcardToRegex(pattern);
            return regex.test(item.url) || regex.test(item.filename);
          });
        });
      }
    }

    return filtered.map(item => ({ ...item, selected: true }));
  }

  function wildcardToRegex(pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const withWildcards = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(withWildcards, 'i');
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function renderItems() {
    items = getFilteredItems();
    const container = $('fileList');

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#128269;</div>
          <p>No ${currentTab} found${activeFilters.size > 0 || customFilterText ? ' matching filters' : ''}.</p>
        </div>
      `;
      updateCounts();
      return;
    }

    container.innerHTML = items.map((item, idx) => {
      const icon = getItemIcon(item);
      const showThumb = currentTab === 'media' && item.source === 'image';
      return `
        <div class="file-item ${item.selected ? 'selected' : ''}" data-idx="${idx}">
          <input type="checkbox" ${item.selected ? 'checked' : ''} data-idx="${idx}">
          ${showThumb
            ? `<img class="file-thumb" src="${escAttr(item.url)}" loading="lazy" onerror="this.style.display='none'">`
            : `<span class="file-icon">${icon}</span>`
          }
          <div class="file-info">
            <div class="file-name">${escHtml(item.filename)}</div>
            <div class="file-url" title="${escAttr(item.url)}">${escHtml(item.url)}</div>
            ${item.text ? `<div class="file-text">${escHtml(item.text.substring(0, 100))}</div>` : ''}
          </div>
          ${item.type ? `<span class="file-type">${escHtml(item.type)}</span>` : ''}
        </div>
      `;
    }).join('');

    // Attach events
    container.querySelectorAll('.file-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        const idx = parseInt(el.dataset.idx);
        items[idx].selected = !items[idx].selected;
        const cb = el.querySelector('input[type="checkbox"]');
        cb.checked = items[idx].selected;
        el.classList.toggle('selected', items[idx].selected);
        updateCounts();
      });
    });

    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = parseInt(cb.dataset.idx);
        items[idx].selected = cb.checked;
        cb.closest('.file-item').classList.toggle('selected', cb.checked);
        updateCounts();
      });
    });

    updateCounts();
  }

  function updateCounts() {
    const selected = items.filter(i => i.selected).length;
    $('selectedCount').textContent = selected;
    $('itemCount').textContent = `${items.length} items`;
    $('filterInfo').textContent = activeFilters.size > 0 || customFilterText
      ? `(filtered from ${(currentTab === 'links' ? scanData.links : scanData.media).length} total)`
      : '';
  }

  function getItemIcon(item) {
    for (const filter of Object.values(FILTERS)) {
      if (filter.extensions.includes(item.type)) {
        return filter.icon;
      }
    }
    if (item.source === 'image') return '\u{1F5BC}';
    if (item.source === 'video') return '\u{1F3AC}';
    if (item.source === 'audio') return '\u{1F3B5}';
    return '\u{1F517}';
  }

  // ── Tab switching ──────────────────────────────────────────────────────
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      activeFilters.clear();
      customFilterText = '';
      $('customFilter').value = '';
      buildFilterChips();
      renderItems();
    });
  });

  // Set initial active tab
  if (mode === 'media') {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab[data-tab="media"]').classList.add('active');
  }

  // ── Selection tools ────────────────────────────────────────────────────
  $('selectAll').addEventListener('click', () => {
    items.forEach(i => i.selected = true);
    renderItems();
  });

  $('selectNone').addEventListener('click', () => {
    items.forEach(i => i.selected = false);
    renderItems();
  });

  $('selectInvert').addEventListener('click', () => {
    items.forEach(i => i.selected = !i.selected);
    renderItems();
  });

  // ── Custom filter ──────────────────────────────────────────────────────
  $('applyFilter').addEventListener('click', () => {
    customFilterText = $('customFilter').value;
    renderItems();
  });

  $('clearFilter').addEventListener('click', () => {
    customFilterText = '';
    $('customFilter').value = '';
    renderItems();
  });

  $('customFilter').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      customFilterText = $('customFilter').value;
      renderItems();
    }
  });

  // ── Download selected ──────────────────────────────────────────────────
  $('downloadSelected').addEventListener('click', () => {
    const selected = items.filter(i => i.selected);
    if (selected.length === 0) return;

    const subfolder = $('subfolder').value.trim();

    const downloadItems = selected.map(item => ({
      url: item.url,
      filename: item.filename,
      referrer: item.referrer || tabUrl,
      subfolder: subfolder
    }));

    chrome.runtime.sendMessage({
      action: MSG.START_DOWNLOADS,
      items: downloadItems
    }, (res) => {
      if (res && res.ok) {
        // Open manager and close selector
        chrome.runtime.sendMessage({ action: MSG.OPEN_MANAGER });
        window.close();
      }
    });
  });

  // ── Init ───────────────────────────────────────────────────────────────
  buildFilterChips();
  renderItems();
});

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escAttr(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
