// Main application logic
(function() {
  // DOM elements
  const urlInput = document.getElementById('urlInput');
  const fetchBtn = document.getElementById('fetchBtn');
  const previewBox = document.getElementById('previewBox');
  const outputArea = document.getElementById('outputArea');
  const downloadBtn = document.getElementById('downloadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');
  const wordWrapBtn = document.getElementById('wordWrapBtn');
  const charCount = document.getElementById('charCount');
  const wordCount = document.getElementById('wordCount');
  const urlInfo = document.getElementById('urlInfo');
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');
  const themeToggle = document.getElementById('themeToggle');

  // State
  let currentMarkdown = '';
  let lastFetchedUrl = '';
  let currentMode = 'standard';
  let darkTheme = true;

  // Initialize markdown-it
  const md = window.markdownit({
    html: true,
    linkify: true,
    typographer: true
  });

  // Initialize Turndown for HTML to Markdown conversion
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*'
  });

  // Theme toggle
  themeToggle.addEventListener('click', function() {
    darkTheme = !darkTheme;
    document.documentElement.setAttribute('data-theme', darkTheme ? 'dark' : 'light');
    const svg = this.querySelector('svg');
    if (darkTheme) {
      svg.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 6 6 0 1 1-9-9Z"/>';
    } else {
      svg.innerHTML =
        '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    }
  });

  // Mode toggle
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentMode = this.dataset.mode;
      if (currentMarkdown) renderMarkdown(currentMarkdown);
      updateStatus('Mode: ' + currentMode);
    });
  });

  // Word wrap toggle
  wordWrapBtn.addEventListener('click', function() {
    const isWrapped = previewBox.style.whiteSpace === 'pre-wrap';
    previewBox.style.whiteSpace = isWrapped ? 'nowrap' : 'pre-wrap';
    this.style.opacity = isWrapped ? '0.5' : '1';
  });

  function updateStatus(text, isGood = true) {
    statusLabel.textContent = text;
    statusDot.className = 'dot' + (isGood ? ' active' : '');
  }

  function renderMarkdown(mdText) {
    currentMarkdown = mdText;
    const trimmed = mdText.trim();
    
    if (!trimmed) {
      previewBox.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 8h8"/><path d="M8 12h6"/><path d="M8 16h4"/></svg>
          <span>markdown preview</span>
          <span class="hint">paste a URL and convert</span>
        </div>
      `;
      charCount.textContent = '0 chars';
      wordCount.textContent = '0 words';
      return;
    }

    let processed = mdText;
    
    if (currentMode === 'clean') {
      // Remove formatting for clean text view
      processed = processed.replace(/\*\*(.*?)\*\*/g, '$1');
      processed = processed.replace(/\*(.*?)\*/g, '$1');
      processed = processed.replace(/\[(.*?)\]\(.*?\)/g, '$1');
      processed = processed.replace(/^[\-\*]\s+/gim, '• ');
      processed = processed.replace(/^>\s+/gim, '');
      previewBox.innerHTML = `<pre style="white-space:pre-wrap;font-family:var(--font-mono);margin:0;color:var(--text-primary);">${processed}</pre>`;
    } else if (currentMode === 'raw') {
      // Show raw markdown
      let html = mdText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      previewBox.innerHTML = `<pre style="white-space:pre-wrap;font-family:var(--font-mono);margin:0;color:var(--text-primary);">${html}</pre>`;
    } else {
      // Standard mode - render markdown to HTML
      try {
        const rendered = md.render(processed);
        previewBox.innerHTML = rendered;
      } catch (e) {
        previewBox.innerHTML = `<pre style="white-space:pre-wrap;font-family:var(--font-mono);margin:0;color:var(--text-primary);">${processed}</pre>`;
      }
    }

    // Update stats
    const words = mdText.split(/\s+/).filter(w => w.length > 0).length;
    charCount.textContent = mdText.length + ' chars';
    wordCount.textContent = words + ' words';
  }

  async function fetchWebpage(url) {
    let cleanUrl = url.trim();
    if (!cleanUrl) { 
      alert('Please enter a URL.');
      return; 
    }
    
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    outputArea.classList.add('visible');
    previewBox.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
        <span>fetching…</span>
        <span class="hint">${cleanUrl.replace(/^https?:\/\//, '')}</span>
      </div>
    `;
    updateStatus('Fetching…', true);

    try {
      // Use a CORS proxy to fetch the webpage
      const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`, {
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      
      // Use Turndown to convert HTML to Markdown
      const markdown = turndownService.turndown(html);
      
      if (!markdown || markdown.trim().length < 10) {
        throw new Error('No readable content found.');
      }

      // Clean up the markdown a bit
      let cleaned = markdown
        .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
        .trim();

      renderMarkdown(cleaned);
      lastFetchedUrl = cleanUrl;
      urlInfo.textContent = cleanUrl;
      updateStatus('Done ✓', true);
    } catch (err) {
      console.error('Fetch error:', err);
      previewBox.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>${err.message || 'Failed to fetch page'}</span>
          <span class="hint">try another URL or check your connection</span>
        </div>
      `;
      updateStatus('Error', false);
    }
  }

  function downloadMarkdown() {
    if (!currentMarkdown || currentMarkdown.trim() === '') {
      alert('Convert a webpage first.');
      return;
    }
    
    const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = lastFetchedUrl ? 
      lastFetchedUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/[^a-zA-Z0-9]/g, '_') || 'page' : 
      'page';
    a.download = `${name}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyMarkdown() {
    if (!currentMarkdown || currentMarkdown.trim() === '') {
      alert('Nothing to copy.');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(currentMarkdown);
      const orig = statusLabel.textContent;
      updateStatus('Copied! ✓', true);
      setTimeout(() => updateStatus(orig, true), 1500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = currentMarkdown;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      const orig = statusLabel.textContent;
      updateStatus('Copied! ✓', true);
      setTimeout(() => updateStatus(orig, true), 1500);
    }
  }

  function clearAll() {
    urlInput.value = '';
    outputArea.classList.remove('visible');
    currentMarkdown = '';
    lastFetchedUrl = '';
    urlInfo.textContent = '—';
    renderMarkdown('');
    updateStatus('Ready', true);
    urlInput.focus();
  }

  // Event listeners
  fetchBtn.addEventListener('click', () => fetchWebpage(urlInput.value));
  
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchWebpage(urlInput.value);
    }
  });

  downloadBtn.addEventListener('click', downloadMarkdown);
  clearBtn.addEventListener('click', clearAll);
  copyBtn.addEventListener('click', copyMarkdown);

  // Initialize
  renderMarkdown('');
  outputArea.classList.remove('visible');
  urlInput.focus();
  updateStatus('Ready', true);
})();
