/**
 * Stablecoin Regulatory Radar — App
 * Loads regulatory.json and renders jurisdiction cards + timeline.
 */
(function () {
  'use strict';

  const DATA_URL = 'data/regulatory.json';

  // --- Climate score helpers ---
  function scoreClass(score) {
    if (score >= 7) return 'score-open';
    if (score >= 4) return 'score-mixed';
    return 'score-restrictive';
  }

  function scoreLabel(score) {
    if (score >= 7) return 'Innovation-friendly';
    if (score >= 4) return 'Mixed / Developing';
    return 'Restrictive';
  }

  function impactClass(level) {
    if (!level) return '';
    const l = level.toLowerCase();
    if (l.includes('high')) return 'impact-high';
    if (l.includes('medium')) return 'impact-medium';
    return 'impact-low';
  }

  function dotClass(direction) {
    if (direction === 'positive') return 'dot-positive';
    if (direction === 'negative') return 'dot-negative';
    return 'dot-neutral';
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // --- Render jurisdiction cards ---
  function renderCards(summaries, container) {
    const order = ['hk', 'us', 'eu', 'sg'];
    let html = '';
    for (const id of order) {
      const j = summaries[id];
      if (!j) continue;
      html += `
        <div class="card">
          <div class="card-header">
            <span class="jurisdiction-name">${j.flag} ${j.name}</span>
          </div>
          <div class="regulator">Regulator: ${j.regulator}</div>
          <div class="climate-score">
            <span class="score-badge ${scoreClass(j.climate_score)}">${j.climate_score}</span>
            <span class="score-label">${scoreLabel(j.climate_score)}</span>
          </div>
          <div class="latest-headline">${escapeHtml(j.latest_headline)}</div>
          <div class="latest-summary">${escapeHtml(j.latest_summary)}</div>
          <div class="card-meta">
            <span class="impact-tag ${impactClass(j.latest_impact)}">${j.latest_impact || ''}</span>
            <span>${formatDate(j.latest_date)} &middot; ${j.article_count} article${j.article_count !== 1 ? 's' : ''}</span>
          </div>
        </div>`;
    }
    container.innerHTML = html;
  }

  // --- Render timeline ---
  function renderTimeline(items, container, activeFilter) {
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>No regulatory updates found for this filter.</p></div>';
      return;
    }

    let html = '';
    for (const item of items) {
      if (activeFilter !== 'all' && item.jurisdiction !== activeFilter) continue;
      html += `
        <div class="timeline-item">
          <div class="timeline-date">${formatDate(item.published)}</div>
          <div class="timeline-dot ${dotClass(item.direction)}"></div>
          <div class="timeline-content">
            <div class="tl-headline">
              <a href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener">${escapeHtml(item.headline)}</a>
            </div>
            <div class="tl-summary">${escapeHtml(item.summary)}</div>
            <div class="tl-meta">
              <span class="timeline-jurisdiction">${item.jurisdiction_name || item.jurisdiction}</span>
              <span class="impact-tag ${impactClass(item.impact_level)}">${item.impact_level || ''}</span>
              <span>${escapeHtml(item.key_term || '')}</span>
              <span>${escapeHtml(item.source_name || '')}</span>
            </div>
          </div>
        </div>`;
    }
    container.innerHTML = html;
  }

  // --- Render filters ---
  function renderFilters(items, container, currentFilter, onChange) {
    const jurisdictions = new Map();
    jurisdictions.set('all', 'All');
    for (const item of items) {
      const id = item.jurisdiction;
      if (!jurisdictions.has(id)) {
        jurisdictions.set(id, item.jurisdiction_name || id);
      }
    }
    let html = '';
    for (const [id, name] of jurisdictions) {
      html += `<button class="filter-btn${currentFilter === id ? ' active' : ''}" data-filter="${id}">${name}</button>`;
    }
    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var newFilter = btn.getAttribute('data-filter');
        renderFilters(items, container, newFilter, onChange);
        renderTimeline(items, document.getElementById('timeline'), newFilter);
        if (onChange) onChange(newFilter);
      });
    });
  }

  // --- Main ---
  function init() {
    const cardsGrid = document.getElementById('cards-grid');
    const timelineEl = document.getElementById('timeline');
    const filtersEl = document.getElementById('timeline-filters');
    const updatedEl = document.getElementById('last-updated');

    fetch(DATA_URL)
      .then(function (resp) {
        if (!resp.ok) throw new Error('Failed to load data: ' + resp.status);
        return resp.json();
      })
      .then(function (data) {
        // Update header
        if (data.metadata && data.metadata.last_updated) {
          updatedEl.textContent = 'Last updated: ' + formatDate(data.metadata.last_updated);
        }

        // Render jurisdiction cards
        if (data.jurisdiction_summaries) {
          renderCards(data.jurisdiction_summaries, cardsGrid);
        }

        // Render timeline with filters
        var timeline = data.timeline || [];
        if (timeline.length > 0) {
          var activeFilter = 'all';
          renderFilters(timeline, filtersEl, activeFilter, function (f) { activeFilter = f; });
          renderTimeline(timeline, timelineEl, activeFilter);
        } else {
          timelineEl.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>No regulatory updates yet. Check back after the daily analysis runs.</p></div>';
        }
      })
      .catch(function (err) {
        console.error('Error loading regulatory data:', err);
        cardsGrid.innerHTML = '<div class="loading">Failed to load data. Is regulatory.json present?</div>';
        timelineEl.innerHTML = '';
        if (updatedEl) updatedEl.textContent = 'Data unavailable';
      });
  }

  // --- Escape HTML ---
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
