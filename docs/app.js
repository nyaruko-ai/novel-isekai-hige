const novel = document.getElementById("novel");
const progressBar = document.getElementById("progressBar");
const deviceScroll = document.getElementById("deviceScroll");
const menuToggle = document.getElementById("menuToggle");
const menuBackdrop = document.getElementById("menuBackdrop");
const chapterMenu = document.getElementById("chapterMenu");
const chapterMenuList = document.getElementById("chapterMenuList");

const story = window.STORY_DATA;

let sceneElements = [];
let activeSceneIndex = 0;
let ticking = false;
let chapterTargets = [];
let sceneMidpoints = [];
let chapterOffsets = [];
let currentChapterKey = null;
let chapterLinkElements = [];

function lineElement(text) {
  const paragraph = document.createElement("p");
  paragraph.className = "beat-line";
  paragraph.textContent = text;
  return paragraph;
}

function beatElement(beat, beatIndex) {
  const article = document.createElement("article");
  article.className = `beat beat-${beat.kind}`;
  article.dataset.beatIndex = String(beatIndex);

  const inner = document.createElement("div");
  inner.className = "beat-inner";
  inner.append(lineElement(beat.rawText));

  article.append(inner);
  return article;
}

function chapterMarker(scene) {
  const section = document.createElement("section");
  section.className = "chapter-marker";
  section.id = `chapter-${scene.chapterKey}`;
  section.dataset.chapterKey = scene.chapterKey;

  const label = document.createElement("p");
  label.className = "chapter-marker-index";
  label.textContent = scene.chapterLabel;

  const title = document.createElement("h2");
  title.className = "chapter-marker-title";
  title.textContent = scene.chapterTitle;

  section.append(label, title);
  return section;
}

function titlePage(storyData) {
  const section = document.createElement("section");
  section.className = "title-page";

  const card = document.createElement("div");
  card.className = "title-page-card";

  const eyebrow = document.createElement("p");
  eyebrow.className = "title-page-eyebrow";
  eyebrow.textContent = "Illustrated Web Novel";

  const heading = document.createElement("h1");
  heading.className = "title-page-title";
  if (Array.isArray(storyData.titleDisplayLines) && storyData.titleDisplayLines.length > 0) {
    heading.append(
      ...storyData.titleDisplayLines.map((line, index) => {
        const span = document.createElement("span");
        span.className = line ? "title-page-title-line" : "title-page-title-spacer";
        if (line) {
          span.dataset.lineIndex = String(index);
          if (line.length > 18) {
            span.classList.add("is-long");
          }
        }
        span.textContent = line || " ";
        return span;
      }),
    );
  } else {
    heading.textContent = storyData.title;
  }

  if (storyData.titleImage) {
    const artWrap = document.createElement("div");
    artWrap.className = "title-page-art";

    const art = document.createElement("img");
    art.className = "title-page-image";
    art.src = storyData.titleImage;
    art.alt = storyData.titleImageAlt || storyData.title;
    art.loading = "eager";
    art.decoding = "async";

    const overlay = document.createElement("div");
    overlay.className = "title-page-overlay";
    overlay.append(eyebrow, heading);

    artWrap.append(art, overlay);
    card.append(artWrap);
  } else {
    card.append(eyebrow, heading);
  }

  const meta = document.createElement("p");
  meta.className = "title-page-meta";
  meta.textContent = `${storyData.sceneCount}話収録`;

  card.append(meta);
  section.append(card);
  return section;
}

function chapterMenuItem(chapter, index) {
  const button = document.createElement("button");
  button.className = "chapter-link";
  button.type = "button";
  button.dataset.chapterKey = chapter.chapterKey;
  button.innerHTML = `
    <span class="chapter-link-index">${chapter.chapterLabel}</span>
    <span class="chapter-link-title">${chapter.chapterTitle}</span>
  `;
  button.addEventListener("click", () => {
    const target = chapterTargets.find((item) => item.chapterKey === chapter.chapterKey);
    if (target) {
      deviceScroll.scrollTo({
        top: Math.max(0, target.element.offsetTop - 12),
        behavior: "smooth",
      });
    }
    setMenuOpen(false);
  });
  if (index === 0) {
    button.classList.add("is-current");
  }
  return button;
}

function setMenuOpen(isOpen) {
  document.body.classList.toggle("menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "章メニューを閉じる" : "章メニューを開く");
  chapterMenu.setAttribute("aria-hidden", String(!isOpen));
  menuBackdrop.hidden = !isOpen;
}

function updateActiveChapter() {
  if (chapterOffsets.length === 0) {
    return;
  }

  const scrollTop = deviceScroll.scrollTop;
  let nextChapterKey = chapterOffsets[0].chapterKey;

  chapterOffsets.forEach((target) => {
    if (target.top - 80 <= scrollTop) {
      nextChapterKey = target.chapterKey;
    }
  });

  if (nextChapterKey === currentChapterKey) {
    return;
  }

  currentChapterKey = nextChapterKey;
  chapterLinkElements.forEach((element) => {
    element.classList.toggle("is-current", element.dataset.chapterKey === currentChapterKey);
  });
}

function sceneElement(scene, sceneIndex) {
  const section = document.createElement("section");
  section.className = "scene";
  section.dataset.sceneIndex = String(sceneIndex);
  section.dataset.mood = scene.mood;

  const visual = document.createElement("div");
  visual.className = "scene-visual";

  const image = document.createElement("img");
  image.className = "scene-image";
  image.src = scene.image;
  image.alt = scene.alt;
  image.loading = sceneIndex < 2 ? "eager" : "lazy";
  image.decoding = "async";

  const veil = document.createElement("div");
  veil.className = "scene-veil";

  const grain = document.createElement("div");
  grain.className = "scene-grain";

  const meta = document.createElement("div");
  meta.className = "scene-meta";

  const title = document.createElement("h2");
  title.className = "scene-title";
  title.textContent = scene.title;

  meta.append(title);
  visual.append(image, veil, grain, meta);

  const copy = document.createElement("div");
  copy.className = "scene-copy";
  copy.append(...scene.beats.map((beat, beatIndex) => beatElement(beat, beatIndex)));

  section.append(visual, copy);
  return section;
}

function setActiveScene(index) {
  if (sceneElements.length === 0) {
    return;
  }

  const previousIndex = activeSceneIndex;
  activeSceneIndex = index;
  document.body.dataset.mood = story.scenes[index].mood;
  sceneElements[previousIndex]?.classList.remove("is-active");
  sceneElements[index]?.classList.add("is-active");
}

function nearestSceneIndex() {
  if (sceneMidpoints.length === 0) {
    return 0;
  }

  const anchor = deviceScroll.scrollTop + deviceScroll.clientHeight * 0.42;
  let low = 0;
  let high = sceneMidpoints.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (sceneMidpoints[mid] < anchor) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  if (low === 0) {
    return 0;
  }

  return Math.abs(sceneMidpoints[low] - anchor) < Math.abs(sceneMidpoints[low - 1] - anchor)
    ? low
    : low - 1;
}

function cacheLayoutMetrics() {
  const viewportHeight = deviceScroll.clientHeight;
  sceneMidpoints = sceneElements.map(
    (element) => element.offsetTop + Math.min(element.offsetHeight, viewportHeight) * 0.5,
  );
  chapterOffsets = chapterTargets.map((target) => ({
    chapterKey: target.chapterKey,
    top: target.element.offsetTop,
  }));
}

function updateProgress() {
  const maxScroll = deviceScroll.scrollHeight - deviceScroll.clientHeight;
  const ratio = maxScroll <= 0 ? 0 : deviceScroll.scrollTop / maxScroll;
  progressBar.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;

  const nextActiveIndex = nearestSceneIndex();
  if (nextActiveIndex !== activeSceneIndex) {
    setActiveScene(nextActiveIndex);
  }
  updateActiveChapter();
}

function syncReaderHeight() {
  novel.style.setProperty("--reader-height", `${deviceScroll.clientHeight}px`);
  cacheLayoutMetrics();
}

function onScroll() {
  if (ticking) {
    return;
  }

  ticking = true;
  window.requestAnimationFrame(() => {
    updateProgress();
    ticking = false;
  });
}

function render(storyData) {
  if (!storyData || !Array.isArray(storyData.scenes) || storyData.scenes.length === 0) {
    novel.innerHTML = '<div class="loading-state">表示できるシーンがありません。</div>';
    return;
  }

  document.title = storyData.title;
  const fragment = document.createDocumentFragment();
  fragment.append(titlePage(storyData));
  let previousChapterKey = null;

  storyData.scenes.forEach((scene, index) => {
    if (scene.chapterKey !== previousChapterKey) {
      fragment.append(chapterMarker(scene));
      previousChapterKey = scene.chapterKey;
    }
    fragment.append(sceneElement(scene, index));
  });

  const footer = document.createElement("footer");
  footer.className = "novel-footer";
  footer.innerHTML =
    "<p>原稿を更新したら <code>node scripts/build-web-novel.mjs</code> を再実行すると、表示データとビジュアルカードを再生成できます。</p>";
  fragment.append(footer);

  novel.replaceChildren(fragment);
  sceneElements = [...document.querySelectorAll(".scene")];
  chapterTargets = [...document.querySelectorAll(".chapter-marker")].map((element) => ({
    chapterKey: element.dataset.chapterKey,
    element,
  }));
  chapterLinkElements = chapterTargets.map((target, index) =>
    chapterMenuItem(
      storyData.scenes.find((scene) => scene.chapterKey === target.chapterKey),
      index,
    ),
  );
  chapterMenuList.replaceChildren(...chapterLinkElements);
  syncReaderHeight();
  currentChapterKey = null;
  setActiveScene(0);
  updateProgress();
}

deviceScroll.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => {
  syncReaderHeight();
  onScroll();
});
window.addEventListener("load", () => {
  syncReaderHeight();
  onScroll();
});

menuToggle.addEventListener("click", () => {
  setMenuOpen(chapterMenu.getAttribute("aria-hidden") === "true");
});

menuBackdrop.addEventListener("click", () => {
  setMenuOpen(false);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenuOpen(false);
  }
});

render(story);
