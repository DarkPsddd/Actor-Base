(() => {
  'use strict';

  const PROFILE_KEY = 'actorbase.profile.v1';
  const BOOKMARKS_KEY = 'actorbase.bookmarks.v1';
  const pageName = window.location.pathname.split('/').pop() || 'index.html';

  function readJSON(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function readProfile() {
    const value = readJSON(PROFILE_KEY, {});
    return value && typeof value === 'object' ? value : {};
  }

  function readBookmarks() {
    const value = readJSON(BOOKMARKS_KEY, []);
    return Array.isArray(value) ? value.filter(item => item && item.key && item.title && item.url) : [];
  }

  function itemKey(type, url) {
    return `${type}:${String(url).split(/[?#]/)[0].split('/').pop()}`;
  }

  function relativePage(link) {
    return String(link.getAttribute('href') || '').split(/[?#]/)[0].split('/').pop();
  }

  function imageFrom(element) {
    const image = element.querySelector('.avatar img, .detail-avatar img, img');
    return image ? image.getAttribute('src') || '' : '';
  }

  function itemFromCard(card, type) {
    const selector = type === 'actor' ? '.actor-name' : '.movie-title';
    const titleNode = card.querySelector(selector);
    const link = type === 'actor'
      ? (card.querySelector('a.actor-card-link[href^="actor-"]') || card.querySelector('a[href^="actor-"]'))
      : (card.querySelector('a.poster-link[href^="movie-"]') || card.querySelector('.movie-title a[href^="movie-"]') || card.querySelector('a[href^="movie-"]'));
    if (!titleNode || !link) return null;
    const url = relativePage(link);
    if (!url) return null;
    const summary = card.querySelector(type === 'actor' ? '.actor-meta' : '.movie-details');
    return {
      key: itemKey(type, url),
      type,
      title: titleNode.textContent.trim(),
      url,
      image: imageFrom(card),
      subtitle: summary ? summary.textContent.trim() : (type === 'actor' ? 'Actor' : 'Film')
    };
  }

  function saveBookmark(item) {
    const current = readBookmarks();
    const exists = current.some(saved => saved.key === item.key);
    const next = exists ? current.filter(saved => saved.key !== item.key) : [...current, item];
    if (!writeJSON(BOOKMARKS_KEY, next)) {
      showToast('Storage is unavailable in this browser context. Open the site through localhost.');
      return;
    }
    refreshBookmarkButtons();
    renderSavedItems();
    showToast(exists ? 'Removed from bookmarks' : 'Added to bookmarks');
  }

  function isBookmarked(item) {
    return readBookmarks().some(saved => saved.key === item.key);
  }

  function createBookmarkButton(item, compact = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `bookmark-button${compact ? ' compact' : ''}`;
    button.dataset.bookmarkKey = item.key;
    button.setAttribute('aria-pressed', String(isBookmarked(item)));
    button.setAttribute('aria-label', `${isBookmarked(item) ? 'Remove' : 'Add'} ${item.title} ${item.type === 'actor' ? 'to' : 'to'} bookmarks`);
    button.title = isBookmarked(item) ? 'Remove bookmark' : 'Add to bookmarks';
    button.textContent = compact ? (isBookmarked(item) ? '★' : '☆') : (isBookmarked(item) ? '★ Saved' : `☆ Save ${item.type === 'actor' ? 'actor' : 'film'}`);
    button.__bookmarkItem = item;
    button.addEventListener('click', () => saveBookmark(button.__bookmarkItem));
    return button;
  }

  function refreshBookmarkButtons() {
    const saved = new Set(readBookmarks().map(item => item.key));
    document.querySelectorAll('.bookmark-button').forEach(button => {
      const active = saved.has(button.dataset.bookmarkKey);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      const item = button.__bookmarkItem;
      if (item) {
        button.textContent = button.classList.contains('compact') ? (active ? '★' : '☆') : (active ? '★ Saved' : `☆ Save ${item.type === 'actor' ? 'actor' : 'film'}`);
        button.title = active ? 'Remove bookmark' : 'Add to bookmarks';
      }
    });
  }

  function installCardButtons() {
    document.querySelectorAll('.actor-card').forEach(card => {
      if (card.querySelector('.bookmark-button')) return;
      const item = itemFromCard(card, 'actor');
      if (!item) return;
      let footer = card.querySelector('.actor-card-footer');
      if (!footer) {
        footer = document.createElement('div');
        footer.className = 'actor-card-footer';
        card.appendChild(footer);
      }
      footer.appendChild(createBookmarkButton(item));
    });

    document.querySelectorAll('.movie-card').forEach(card => {
      if (card.querySelector('.bookmark-button')) return;
      const item = itemFromCard(card, 'movie');
      if (!item) return;
      const controls = card.querySelector('.movie-info-bottom') || card.querySelector('.movie-info');
      if (controls) controls.appendChild(createBookmarkButton(item, true));
    });
  }

  function installDetailBookmark() {
    const isActor = pageName.startsWith('actor-');
    const isMovie = pageName.startsWith('movie-');
    if (!isActor && !isMovie) return;
    const titleNode = document.querySelector('.detail-heading h1, .detail-heading h2, .section-heading h2');
    const controls = document.querySelector('.detail-actions');
    if (!titleNode || !controls || controls.querySelector('.bookmark-button')) return;
    const type = isActor ? 'actor' : 'movie';
    const url = pageName;
    const item = {
      key: itemKey(type, url),
      type,
      title: titleNode.textContent.trim(),
      url,
      image: imageFrom(document.querySelector('.detail-cover') || document),
      subtitle: (document.querySelector('.detail-subtitle') || document.querySelector('.kicker'))?.textContent.trim() || (isActor ? 'Actor' : 'Film')
    };
    controls.appendChild(createBookmarkButton(item));
  }

  function initials(name) {
    return String(name || 'G').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('') || 'G';
  }

  function applyProfile(profile) {
    const name = profile.name || 'Guest Viewer';
    const about = profile.about || 'Exploring the world of film';
    const genre = profile.genre || 'No favorite genre yet';
    const monogram = document.getElementById('profile-monogram');
    const displayName = document.getElementById('profile-display-name');
    const displayAbout = document.getElementById('profile-display-about');
    const displayGenre = document.getElementById('profile-display-genre');
    if (monogram) monogram.textContent = initials(name);
    if (displayName) displayName.textContent = name;
    if (displayAbout) displayAbout.textContent = about;
    if (displayGenre) displayGenre.textContent = genre;
    const nameInput = document.getElementById('profile-name');
    const aboutInput = document.getElementById('profile-about');
    const genreInput = document.getElementById('profile-genre');
    if (nameInput && document.activeElement !== nameInput) nameInput.value = profile.name || '';
    if (aboutInput && document.activeElement !== aboutInput) aboutInput.value = profile.about || '';
    if (genreInput && document.activeElement !== genreInput) genreInput.value = profile.genre || '';
    document.querySelectorAll('.profile-dot').forEach(dot => dot.classList.toggle('visible', Boolean(profile.name)));
  }

  function installProfileForm() {
    const form = document.getElementById('profile-form');
    if (!form) return;
    applyProfile(readProfile());
    const inputs = ['profile-name', 'profile-about', 'profile-genre'].map(id => document.getElementById(id)).filter(Boolean);
    inputs.forEach(input => input.addEventListener('input', () => {
      applyProfile({
        name: document.getElementById('profile-name')?.value.trim() || 'Guest Viewer',
        about: document.getElementById('profile-about')?.value.trim() || 'Exploring the world of film',
        genre: document.getElementById('profile-genre')?.value.trim() || 'No favorite genre yet'
      });
    }));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const profile = {
        name: document.getElementById('profile-name').value.trim().slice(0, 60),
        about: document.getElementById('profile-about').value.trim().slice(0, 280),
        genre: document.getElementById('profile-genre').value.trim().slice(0, 40)
      };
      if (!profile.name) profile.name = 'Guest Viewer';
      if (!profile.about) profile.about = 'Exploring the world of film';
      if (!profile.genre) profile.genre = 'No favorite genre yet';
      if (writeJSON(PROFILE_KEY, profile)) {
        applyProfile(profile);
        const status = document.getElementById('profile-save-status');
        if (status) status.textContent = 'Saved';
        document.querySelectorAll('.profile-dot').forEach(dot => dot.classList.add('visible'));
        showToast('Profile saved');
      } else {
        const status = document.getElementById('profile-save-status');
        if (status) status.textContent = 'Could not save. Open through localhost.';
      }
    });
  }

  function createSavedCard(item) {
    const article = document.createElement('article');
    article.className = 'saved-item';
    const thumb = document.createElement('div');
    thumb.className = `saved-thumb ${item.type === 'actor' ? 'actor-thumb' : 'movie-thumb'}`;
    if (item.image) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', () => { img.remove(); thumb.textContent = initials(item.title); });
      thumb.appendChild(img);
    } else {
      thumb.textContent = initials(item.title);
    }
    const details = document.createElement('div');
    details.className = 'saved-item-details';
    const link = document.createElement('a');
    link.className = 'saved-item-title';
    link.href = item.url;
    link.textContent = item.title;
    const meta = document.createElement('span');
    meta.className = 'saved-item-meta';
    meta.textContent = `${item.type === 'actor' ? 'Actor' : 'Film'}${item.subtitle ? ` · ${item.subtitle}` : ''}`;
    details.append(link, meta);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'bookmark-remove';
    remove.textContent = '×';
    remove.title = 'Remove bookmark';
    remove.setAttribute('aria-label', `Remove ${item.title} from bookmarks`);
    remove.addEventListener('click', () => {
      writeJSON(BOOKMARKS_KEY, readBookmarks().filter(saved => saved.key !== item.key));
      refreshBookmarkButtons();
      renderSavedItems();
    });
    article.append(thumb, details, remove);
    return article;
  }

  function renderSavedItems() {
    const actorList = document.getElementById('saved-actors');
    const movieList = document.getElementById('saved-movies');
    if (!actorList && !movieList) return;
    const items = readBookmarks();
    const renderGroup = (container, type, emptyText) => {
      if (!container) return;
      container.replaceChildren();
      const selected = items.filter(item => item.type === type);
      if (!selected.length) {
        const empty = document.createElement('p');
        empty.className = 'saved-empty';
        empty.textContent = emptyText;
        container.appendChild(empty);
      } else {
        selected.forEach(item => container.appendChild(createSavedCard(item)));
      }
    };
    renderGroup(actorList, 'actor', 'No bookmarked actors yet. Save actors from the catalogue.');
    renderGroup(movieList, 'movie', 'No bookmarked films yet. Save films from the catalogue.');
    const actorCount = document.getElementById('saved-actor-count');
    const movieCount = document.getElementById('saved-movie-count');
    if (actorCount) actorCount.textContent = String(items.filter(item => item.type === 'actor').length);
    if (movieCount) movieCount.textContent = String(items.filter(item => item.type === 'movie').length);
  }

  let toastTimer;
  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2200);
  }

  function init() {
    installCardButtons();
    installDetailBookmark();
    installProfileForm();
    renderSavedItems();
    refreshBookmarkButtons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
