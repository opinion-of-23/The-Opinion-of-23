/* The Opinion of 23 — homepage audio links
 * English:  assets/audio/<article-slug>.mp3
 * Kannada:  assets/audio/kn/<article-slug>.mp3
 * A listening panel is added only when at least one matching MP3 exists.
 */
(() => {
  "use strict";

  const CARD_SELECTOR = ".article-card";
  const AUDIO_LANGUAGES = [
       { code: "kn", label: "ಕನ್ನಡದಲ್ಲಿ ಕೇಳಿ · Listen in Kannada", folder: "assets/audio/" }
  ];

  function getArticleSlug(card) {
    const articleLink = card.querySelector('a[href*="article.html?slug="]');
    if (!articleLink) return null;

    try {
      const url = new URL(articleLink.getAttribute("href"), document.baseURI);
      const slug = url.searchParams.get("slug");
      return slug && /^[a-z0-9-]+$/i.test(slug) ? slug : null;
    } catch (_) {
      return null;
    }
  }

  async function audioFileExists(path) {
    try {
      // HEAD checks the file without downloading the MP3.
      const response = await fetch(path, {
        method: "HEAD",
        cache: "no-store",
        credentials: "same-origin"
      });
      return response.ok;
    } catch (_) {
      return false;
    }
  }

  function createAudioSection(files, title) {
    const details = document.createElement("details");
    details.className = "home-card-audio";

    const summary = document.createElement("summary");
    summary.textContent = "Listen to this article";
    details.appendChild(summary);

    const description = document.createElement("p");
    description.className = "home-card-audio-description";
    description.textContent = "Choose an available audio edition.";
    details.appendChild(description);

    files.forEach(file => {
      const track = document.createElement("div");
      track.className = "home-card-audio-track";

      const label = document.createElement("p");
      label.className = "home-card-audio-label";
      label.textContent = file.label;

      const player = document.createElement("audio");
      player.controls = true;
      player.preload = "none";
      player.setAttribute("aria-label", `${file.label} for ${title}`);

      const source = document.createElement("source");
      source.src = file.path;
      source.type = "audio/mpeg";
      player.appendChild(source);

      track.append(label, player);
      details.appendChild(track);
    });

    return details;
  }

  async function addAudioToCard(card) {
    if (card.dataset.homeAudioState === "checking" || card.dataset.homeAudioState === "done") {
      return;
    }

    const slug = getArticleSlug(card);
    if (!slug) return;

    card.dataset.homeAudioState = "checking";

    const checks = AUDIO_LANGUAGES.map(async language => {
      const path = `${language.folder}${encodeURIComponent(slug)}.mp3`;
      const exists = await audioFileExists(path);
      return exists ? { ...language, path } : null;
    });

    const availableFiles = (await Promise.all(checks)).filter(Boolean);
    card.dataset.homeAudioState = "done";

    // A card can be replaced when the visitor changes the category filter.
    if (!card.isConnected || card.querySelector(".home-card-audio")) return;

    // No matching MP3 = no listening control on this card.
    if (availableFiles.length === 0) return;

    const cardBody = card.querySelector(".card-body");
    if (!cardBody) return;

    const title = card.querySelector(".card-body h3")?.textContent?.trim() || "this article";
    const audioSection = createAudioSection(availableFiles, title);
    const readLink = cardBody.querySelector(".text-link");

    if (readLink) {
      readLink.insertAdjacentElement("afterend", audioSection);
    } else {
      cardBody.appendChild(audioSection);
    }
  }

  function scanArticleCards() {
    document.querySelectorAll(CARD_SELECTOR).forEach(card => {
      addAudioToCard(card);
    });
  }

  // Initial homepage render.
  scanArticleCards();

  // Re-check cards after category filtering or article-grid re-rendering.
  const grid = document.querySelector("#articleGrid");
  if (grid) {
    const observer = new MutationObserver(() => scanArticleCards());
    observer.observe(grid, { childList: true });
  }
})();
