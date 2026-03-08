import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, "hige-mahou-story.md");
const docsDir = path.join(rootDir, "docs");
const storyDataPath = path.join(docsDir, "story-data.js");
const titleDisplayLines = [
  "おっさんサトー ヒゲ魔法で最強",
  "",
  "〜異世界転生したので猫耳ともふもふに",
  "囲まれてのんびり暮らしたい〜",
];
const titleImage = "./images/title/title-cover.webp";
const titleImageAlt = "ヒゲ魔法のサトーのタイトルビジュアル";

const palettes = [
  {
    mood: "sunrise",
    skyTop: "#f8d7a8",
    skyBottom: "#f29158",
    glow: "#fff3d8",
    accent: "#fff9ef",
    shadow: "#7a422a",
  },
  {
    mood: "grove",
    skyTop: "#d9efd9",
    skyBottom: "#6f8f63",
    glow: "#f2fff2",
    accent: "#eff9eb",
    shadow: "#2b4c34",
  },
  {
    mood: "mist",
    skyTop: "#e4e1f5",
    skyBottom: "#867ea6",
    glow: "#fbfaff",
    accent: "#f3f0ff",
    shadow: "#3f3657",
  },
  {
    mood: "river",
    skyTop: "#d7ecf7",
    skyBottom: "#4e8aa6",
    glow: "#edfaff",
    accent: "#e8f7ff",
    shadow: "#24556c",
  },
  {
    mood: "ember",
    skyTop: "#f0d7c2",
    skyBottom: "#b55c3f",
    glow: "#fff2e5",
    accent: "#fff3e3",
    shadow: "#6f3021",
  },
  {
    mood: "twilight",
    skyTop: "#f0d7dd",
    skyBottom: "#905d73",
    glow: "#fff3f6",
    accent: "#fdeff2",
    shadow: "#623648",
  },
  {
    mood: "night",
    skyTop: "#dbe7f4",
    skyBottom: "#37506a",
    glow: "#eef6ff",
    accent: "#ebf5ff",
    shadow: "#1f3345",
  },
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toSceneId(index) {
  return `scene-${String(index + 1).padStart(3, "0")}`;
}

function normalizeParagraph(buffer) {
  const keepLineBreaks =
    buffer.length > 1 &&
    buffer.every((line) => /^(?:――|—)/.test(line));

  return buffer.join(keepLineBreaks ? "\n" : "").trim();
}

function classifyBeat(text) {
  if (/^[「『]/.test(text)) {
    return "dialogue";
  }
  if (/^(――|—|---|《|###?)/.test(text) || text.includes("――")) {
    return "emphasis";
  }
  return "narration";
}

function buildSummary(paragraphs) {
  const combined = paragraphs.slice(0, 2).join("");
  if (combined.length <= 70) {
    return combined;
  }
  return `${combined.slice(0, 70)}…`;
}

function parseMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  let title = "Web Novel";
  let currentChapter = null;
  let chapterCount = 0;
  let currentScene = null;
  let paragraphBuffer = [];
  const scenes = [];

  function ensureChapter() {
    if (currentChapter) {
      return currentChapter;
    }
    chapterCount += 1;
      currentChapter = {
        key: `chapter-${chapterCount}`,
        label: `第${chapterCount}章`,
        title: "第一章　はじまり",
        inferred: true,
        index: chapterCount - 1,
    };
    return currentChapter;
  }

  function flushParagraph() {
    if (!currentScene || paragraphBuffer.length === 0) {
      return;
    }
    const paragraph = normalizeParagraph(paragraphBuffer);
    paragraphBuffer = [];
    if (paragraph) {
      currentScene.paragraphs.push(paragraph);
    }
  }

  function flushScene() {
    flushParagraph();
    if (!currentScene) {
      return;
    }
    if (currentScene.paragraphs.length > 0) {
      scenes.push(currentScene);
    }
    currentScene = null;
  }

  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = line.replace(/^#\s+/, "").trim();
      continue;
    }

    if (line.startsWith("## ")) {
      flushScene();
      chapterCount += 1;
      currentChapter = {
        key: `chapter-${chapterCount}`,
        label: `第${chapterCount}章`,
        title: line.replace(/^##\s+/, "").trim(),
        inferred: false,
        index: chapterCount - 1,
      };
      continue;
    }

    if (line.startsWith("### ")) {
      flushScene();
      const chapter = ensureChapter();
      currentScene = {
        title: line.replace(/^###\s+/, "").trim(),
        chapterKey: chapter.key,
        chapterLabel: chapter.label,
        chapterTitle: chapter.title,
        chapterIndex: chapter.index,
        paragraphs: [],
      };
      continue;
    }

    if (!currentScene) {
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    paragraphBuffer.push(line.trim());
  }

  flushScene();

  return { title, scenes };
}

function buildVariantShapes(variant, palette) {
  switch (variant) {
    case 0:
      return `
        <circle cx="940" cy="320" r="180" fill="${palette.glow}" opacity="0.18" />
        <path d="M0 1330 C210 1240 350 1220 540 1270 C770 1330 970 1510 1200 1470 L1200 1800 L0 1800 Z" fill="${palette.shadow}" opacity="0.34" />
        <path d="M0 1460 C280 1370 520 1380 760 1480 C960 1560 1090 1630 1200 1600 L1200 1800 L0 1800 Z" fill="${palette.accent}" opacity="0.16" />
      `;
    case 1:
      return `
        <circle cx="880" cy="330" r="210" fill="${palette.glow}" opacity="0.2" />
        <circle cx="320" cy="1220" r="240" fill="${palette.accent}" opacity="0.08" />
        <path d="M130 1490 C250 1160 560 940 890 980" stroke="${palette.accent}" stroke-width="28" stroke-linecap="round" opacity="0.2" fill="none" />
        <path d="M210 1580 C390 1320 640 1180 980 1220" stroke="${palette.glow}" stroke-width="18" stroke-linecap="round" opacity="0.16" fill="none" />
      `;
    case 2:
      return `
        <rect x="-120" y="960" width="780" height="640" rx="90" fill="${palette.shadow}" opacity="0.18" transform="rotate(-12 220 1270)" />
        <rect x="560" y="1080" width="620" height="540" rx="80" fill="${palette.accent}" opacity="0.12" transform="rotate(9 870 1350)" />
        <circle cx="940" cy="350" r="160" fill="${palette.glow}" opacity="0.18" />
      `;
    case 3:
      return `
        <circle cx="910" cy="360" r="170" fill="${palette.glow}" opacity="0.18" />
        <circle cx="910" cy="360" r="250" fill="none" stroke="${palette.accent}" stroke-width="18" opacity="0.16" />
        <circle cx="910" cy="360" r="330" fill="none" stroke="${palette.accent}" stroke-width="8" opacity="0.14" />
        <path d="M0 1530 C320 1460 490 1380 760 1410 C950 1440 1080 1510 1200 1490 L1200 1800 L0 1800 Z" fill="${palette.shadow}" opacity="0.26" />
      `;
    default:
      return `
        <circle cx="930" cy="300" r="170" fill="${palette.glow}" opacity="0.19" />
        <path d="M180 1120 L340 900 L520 1090" stroke="${palette.accent}" stroke-width="22" stroke-linecap="round" opacity="0.18" fill="none" />
        <path d="M430 1250 L630 980 L860 1260" stroke="${palette.accent}" stroke-width="18" stroke-linecap="round" opacity="0.16" fill="none" />
        <path d="M740 1150 L920 930 L1080 1130" stroke="${palette.accent}" stroke-width="14" stroke-linecap="round" opacity="0.16" fill="none" />
        <path d="M0 1500 C280 1400 540 1420 780 1510 C980 1580 1100 1600 1200 1570 L1200 1800 L0 1800 Z" fill="${palette.shadow}" opacity="0.24" />
      `;
  }
}

function wrapSvgText(text, maxChars) {
  const chunks = [];
  let rest = text;

  while (rest.length > maxChars) {
    chunks.push(rest.slice(0, maxChars));
    rest = rest.slice(maxChars);
  }
  if (rest) {
    chunks.push(rest);
  }
  return chunks;
}

function buildSvg(scene, palette, sceneIndex) {
  const variant = sceneIndex % 5;
  const titleLines = wrapSvgText(scene.title, 14);
  const chapterLines = wrapSvgText(scene.chapterTitle, 16);
  const titleTspans = titleLines
    .map((line, index) => `<tspan x="88" dy="${index === 0 ? 0 : 88}">${escapeHtml(line)}</tspan>`)
    .join("");
  const chapterTspans = chapterLines
    .map((line, index) => `<tspan x="88" dy="${index === 0 ? 0 : 44}">${escapeHtml(line)}</tspan>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" role="img" aria-labelledby="${scene.id}-title ${scene.id}-desc">
  <title id="${scene.id}-title">${escapeHtml(scene.title)}</title>
  <desc id="${scene.id}-desc">${escapeHtml(scene.alt)}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${palette.skyTop}" />
      <stop offset="100%" stop-color="${palette.skyBottom}" />
    </linearGradient>
    <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.32" />
    </linearGradient>
  </defs>
  <rect width="1200" height="1800" fill="url(#bg)" />
  <rect width="1200" height="1800" fill="url(#veil)" />
  ${buildVariantShapes(variant, palette)}
  <g opacity="0.08">
    <circle cx="120" cy="120" r="2" fill="#ffffff" />
    <circle cx="240" cy="210" r="1.8" fill="#ffffff" />
    <circle cx="340" cy="180" r="1.6" fill="#ffffff" />
    <circle cx="960" cy="170" r="2" fill="#ffffff" />
    <circle cx="1030" cy="230" r="1.8" fill="#ffffff" />
    <circle cx="870" cy="260" r="1.5" fill="#ffffff" />
  </g>
  <text x="88" y="1290" font-size="28" font-weight="700" letter-spacing="8" fill="${palette.accent}" opacity="0.92" font-family="'Avenir Next', 'Hiragino Sans', sans-serif">${escapeHtml(scene.chapterLabel)}</text>
  <text x="88" y="1348" font-size="42" font-weight="500" letter-spacing="2" fill="${palette.accent}" opacity="0.88" font-family="'Yu Mincho', 'Hiragino Mincho ProN', serif">${chapterTspans}</text>
  <text x="88" y="1496" font-size="74" font-weight="700" letter-spacing="2" fill="#ffffff" font-family="'Yu Mincho', 'Hiragino Mincho ProN', serif">${titleTspans}</text>
  <rect x="88" y="1600" width="280" height="2" fill="${palette.accent}" opacity="0.85" />
</svg>`;
}

async function main() {
  const markdown = await readFile(sourcePath, "utf8");
  const parsed = parseMarkdown(markdown);
  const story = {
    title: parsed.title,
    titleDisplayLines,
    titleImage,
    titleImageAlt,
    generatedAt: new Date().toISOString(),
    sceneCount: parsed.scenes.length,
    scenes: [],
  };

  for (const [index, scene] of parsed.scenes.entries()) {
    const id = toSceneId(index);
    const palette = palettes[scene.chapterIndex % palettes.length];

    const beatTexts = scene.paragraphs.map((text, beatIndex) => ({
      id: `${id}-beat-${String(beatIndex + 1).padStart(3, "0")}`,
      index: beatIndex,
      kind: classifyBeat(text),
      rawText: text,
    }));

    const storyScene = {
      id,
      index,
      mood: palette.mood,
      chapterKey: scene.chapterKey,
      chapterLabel: scene.chapterLabel,
      chapterTitle: scene.chapterTitle,
      title: scene.title,
      summary: buildSummary(scene.paragraphs),
      image: `./images/episodes/${id}.webp`,
      alt: `${scene.chapterTitle}の${scene.title}をイメージしたビジュアルカード`,
      beatCount: beatTexts.length,
      beats: beatTexts,
    };
    story.scenes.push(storyScene);
  }

  const js = `window.STORY_DATA = ${JSON.stringify(story, null, 2)};\n`;
  await writeFile(storyDataPath, js, "utf8");

  process.stdout.write(
    `Generated ${story.sceneCount} scenes into ${path.relative(rootDir, docsDir)}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
