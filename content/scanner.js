const _maxidownScanner = (() => {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === 'scanPage') {
        const result = scanPage();
        sendResponse(result);
      }
      return true;
    });
  }

  function scanPage() {
    const links = new Map();
    const media = new Map();
    const pageUrl = location.href;
    const baseUrl = location.origin;

    // ── Scan <a> links ─────────────────────────────────────────────────────
    document.querySelectorAll('a[href]').forEach(a => {
      const url = resolveUrl(a.href);
      if (!url || isPageNavigation(url)) return;
      if (links.has(url)) return;
      links.set(url, {
        url,
        filename: filenameFromUrl(url),
        text: (a.textContent || '').trim().substring(0, 200),
        type: extensionFromUrl(url),
        source: 'link',
        referrer: pageUrl
      });
    });

    // ── Scan <img> ─────────────────────────────────────────────────────────
    document.querySelectorAll('img[src], img[data-src]').forEach(img => {
      const src = img.src || img.dataset.src;
      const url = resolveUrl(src);
      if (!url) return;
      if (media.has(url)) return;

      // Try to find full-size version
      let fullUrl = url;
      const parent = img.closest('a[href]');
      if (parent) {
        const parentUrl = resolveUrl(parent.href);
        if (parentUrl && isImageUrl(parentUrl)) {
          fullUrl = parentUrl;
        }
      }

      media.set(fullUrl, {
        url: fullUrl,
        filename: filenameFromUrl(fullUrl),
        text: img.alt || img.title || '',
        type: extensionFromUrl(fullUrl),
        source: 'image',
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0,
        referrer: pageUrl
      });

      // Also add srcset entries
      if (img.srcset) {
        parseSrcset(img.srcset).forEach(entry => {
          const u = resolveUrl(entry);
          if (u && !media.has(u)) {
            media.set(u, {
              url: u,
              filename: filenameFromUrl(u),
              text: img.alt || '',
              type: extensionFromUrl(u),
              source: 'image',
              referrer: pageUrl
            });
          }
        });
      }
    });

    // ── Scan <picture> <source> ────────────────────────────────────────────
    document.querySelectorAll('picture source[srcset]').forEach(source => {
      parseSrcset(source.srcset).forEach(entry => {
        const url = resolveUrl(entry);
        if (url && !media.has(url)) {
          media.set(url, {
            url,
            filename: filenameFromUrl(url),
            text: '',
            type: extensionFromUrl(url),
            source: 'image',
            referrer: pageUrl
          });
        }
      });
    });

    // ── Scan <video> ───────────────────────────────────────────────────────
    document.querySelectorAll('video[src], video source[src]').forEach(el => {
      const url = resolveUrl(el.src);
      if (!url || media.has(url)) return;
      media.set(url, {
        url,
        filename: filenameFromUrl(url),
        text: '',
        type: extensionFromUrl(url),
        source: 'video',
        referrer: pageUrl
      });
    });

    // ── Scan <audio> ───────────────────────────────────────────────────────
    document.querySelectorAll('audio[src], audio source[src]').forEach(el => {
      const url = resolveUrl(el.src);
      if (!url || media.has(url)) return;
      media.set(url, {
        url,
        filename: filenameFromUrl(url),
        text: '',
        type: extensionFromUrl(url),
        source: 'audio',
        referrer: pageUrl
      });
    });

    // ── Scan <embed>, <object> ─────────────────────────────────────────────
    document.querySelectorAll('embed[src], object[data]').forEach(el => {
      const url = resolveUrl(el.src || el.data);
      if (!url || media.has(url)) return;
      media.set(url, {
        url,
        filename: filenameFromUrl(url),
        text: '',
        type: extensionFromUrl(url),
        source: 'embed',
        referrer: pageUrl
      });
    });

    // ── Scan CSS background images ─────────────────────────────────────────
    const bgElements = document.querySelectorAll('*');
    const bgLimit = Math.min(bgElements.length, 2000); // cap for performance
    for (let i = 0; i < bgLimit; i++) {
      const style = getComputedStyle(bgElements[i]);
      const bg = style.backgroundImage;
      if (bg && bg !== 'none') {
        const urls = bg.match(/url\(["']?([^"')]+)["']?\)/g);
        if (urls) {
          urls.forEach(match => {
            const raw = match.replace(/url\(["']?/, '').replace(/["']?\)$/, '');
            const url = resolveUrl(raw);
            if (url && !media.has(url) && !url.startsWith('data:')) {
              media.set(url, {
                url,
                filename: filenameFromUrl(url),
                text: 'Background image',
                type: extensionFromUrl(url),
                source: 'css-bg',
                referrer: pageUrl
              });
            }
          });
        }
      }
    }

    return {
      links: Array.from(links.values()),
      media: Array.from(media.values()),
      pageUrl,
      pageTitle: document.title
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function resolveUrl(url) {
    if (!url) return null;
    try {
      const resolved = new URL(url, location.href).href;
      if (resolved.startsWith('javascript:') || resolved.startsWith('data:') || resolved.startsWith('blob:')) {
        return null;
      }
      return resolved;
    } catch {
      return null;
    }
  }

  function filenameFromUrl(url) {
    try {
      const pathname = new URL(url).pathname;
      const parts = pathname.split('/');
      const last = parts[parts.length - 1];
      return decodeURIComponent(last) || 'file';
    } catch {
      return 'file';
    }
  }

  function extensionFromUrl(url) {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.([a-zA-Z0-9]{1,10})$/);
      return match ? match[1].toLowerCase() : '';
    } catch {
      return '';
    }
  }

  function isPageNavigation(url) {
    try {
      const u = new URL(url);
      // Same-page anchors
      if (u.origin === location.origin && u.pathname === location.pathname && u.hash) {
        return true;
      }
      // javascript: links already filtered
      return false;
    } catch {
      return true;
    }
  }

  function isImageUrl(url) {
    const ext = extensionFromUrl(url);
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'avif', 'tiff', 'tif', 'ico'].includes(ext);
  }

  function parseSrcset(srcset) {
    return srcset.split(',').map(entry => entry.trim().split(/\s+/)[0]).filter(Boolean);
  }

  return { resolveUrl, filenameFromUrl, extensionFromUrl, isPageNavigation, isImageUrl, parseSrcset, scanPage };
})();

if (typeof module !== 'undefined') {
  module.exports = _maxidownScanner;
}
