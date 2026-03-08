import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const storyDataPath = path.join(rootDir, "docs", "story-data.js");
const characterRefsPath = path.join(rootDir, "prompts", "scene-character-references.json");
const outputPath = path.join(rootDir, "prompts", "episode-image-manifest.json");

const characterNameMap = [
  { id: "sato", name: "サトー" },
  { id: "nyaruko", name: "ニャル子" },
  { id: "shirotama", name: "しろたま" },
  { id: "celestia", name: "セレスティア" },
  { id: "izel", name: "イゼル" },
  { id: "legius", name: "レギウス" },
  { id: "magdalena", name: "マグダレナ" },
  { id: "village-chief", name: "村長" },
  { id: "joan-bellcraft", name: "ジョアン" },
  { id: "final-confirmer", name: "最終確認者" },
];

const sceneReferenceOverrides = {
  "scene-061": ["legius", "sato", "nyaruko", "celestia"],
  "scene-062": ["legius", "sato", "nyaruko", "celestia"],
  "scene-063": ["legius", "sato", "nyaruko", "celestia"],
  "scene-068": ["sato", "nyaruko", "shirotama", "celestia"],
  "scene-075": ["legius", "sato", "izel"],
  "scene-084": ["sato", "izel", "legius", "celestia"],
  "scene-085": ["legius", "sato", "izel", "celestia"],
  "scene-086": ["sato", "celestia", "izel", "legius"],
};

const sceneFocusOverrides = {
  "scene-061": ["legius"],
  "scene-062": ["legius"],
  "scene-063": ["legius"],
  "scene-068": ["sato", "nyaruko", "celestia"],
  "scene-075": ["legius"],
  "scene-084": ["izel", "legius"],
  "scene-085": ["legius", "izel"],
  "scene-086": ["izel", "legius"],
};

const scenePromptOverrides = {
  "scene-061":
    "Show the first reveal of Legius in the flooded ruins of Laguna Bell at sunset. Legius must be clearly visible on top of a tall sunken stone tower above the heroes, wearing his canonical black cloak and half-face mask, holding his black short staff, and looking down with calm confidence after applauding their arrival. Keep the heroes below as smaller figures and preserve the eerie drowned-city scale.",
  "scene-062":
    "This is Legius's first named appearance. Show Legius as the dominant human threat in the scene: standing high on a ruined stone tower above the boat and surrounding water guardians, black cloak moving in the wind, half-face mask, visible ironic smile on the exposed side, black short staff in hand. Do not hide him inside the crowd or replace his silhouette with a generic bandit or nobleman.",
  "scene-063":
    "Keep the scene in the flooded ruins of Laguna Bell, not indoors. Show an ideological standoff across open water at dusk: Legius remains elevated on a ruined stone tower or broken bridge above the water, speaking down with controlled intensity, while Sato, Nyaruko, and Celestia listen from the boat below among surrounding water guardians. Legius must keep his canonical half mask, black cloak, black short staff, and morally ambiguous calm. The mood is tense negotiation, not a meeting room conversation.",
  "scene-068":
    "Keep all recurring characters locked to their canonical portraits. Sato must be the rugged bearded Japanese man from his portrait, not a clean-shaven youth. Nyaruko must keep her silver bob, cat ears, black-and-white maid outfit, chest bell, and pale tail. Celestia must keep silver-gray tied hair, cold disciplined gaze, dark navy cloak, and light knight-mage armor; do not turn her blonde or soft-featured. Shirotama must remain a white round fur-ball with huge black eyes, tiny tail, and no visible legs or normal cat body. Show the party exploring the living-organ depths of the sunken city: vast stone cavity, layered corridors, transparent water channels, eerie blue pulses, and an oppressive ancient-machine atmosphere.",
};

const proKeywords = [
  "目覚め",
  "盗賊",
  "番人",
  "王都から来た女",
  "追跡者",
  "奪還戦",
  "第三鍵",
  "灰鐘の門",
  "防衛戦",
  "共鳴",
  "ラグナ・ベル",
  "半面の仮面",
  "第二鍵",
  "最後の鍵",
  "中央座標",
  "最終確認者",
  "門の向こう",
  "帰還",
  "のんびり異世界生活",
];

const locationRules = [
  { tag: "village-inn", patterns: ["宿屋", "部屋", "家", "食卓", "村"] },
  { tag: "forest-dungeon", patterns: ["ダンジョン", "石門", "第一階層", "第二階層", "祭壇"] },
  { tag: "road-journey", patterns: ["街道", "旅", "馬車", "朝焼け", "出立"] },
  { tag: "underground-ruins", patterns: ["古道", "回廊", "記録庫", "座標"] },
  { tag: "gray-bell-convent", patterns: ["灰鐘", "修道院", "鐘堂"] },
  { tag: "sunken-city", patterns: ["沈都", "ラグナ", "水底", "縦穴"] },
  { tag: "capital-underground", patterns: ["王都地下", "沈黙路", "中継室", "地下水路"] },
  { tag: "central-coordinate", patterns: ["中央座標", "最終門", "前室", "確認者"] },
];

function parseStoryData(jsSource) {
  return JSON.parse(jsSource.replace(/^window\.STORY_DATA = /, "").replace(/;\s*$/, ""));
}

function detectCast(scene) {
  const corpus = [scene.title, scene.summary, ...scene.beats.map((beat) => beat.rawText)].join("\n");
  return characterNameMap
    .filter((entry) => corpus.includes(entry.name))
    .map((entry) => entry.id);
}

function deriveReferenceCharacterIds(scene, cast) {
  const override = sceneReferenceOverrides[scene.id] ?? [];
  return [...new Set([...override, ...cast])].slice(0, 4);
}

function deriveFocusCharacterIds(scene, referenceCharacterIds) {
  const override = sceneFocusOverrides[scene.id];
  if (override) {
    return override.filter((id) => referenceCharacterIds.includes(id));
  }

  return [];
}

function inferModel(scene) {
  const corpus = `${scene.title}\n${scene.summary}`;
  return proKeywords.some((keyword) => corpus.includes(keyword))
    ? "gemini-3-pro-image-preview"
    : "gemini-3.1-flash-image-preview";
}

function inferLocationTag(scene) {
  const corpus = `${scene.chapterTitle}\n${scene.title}\n${scene.summary}`;
  const matched = locationRules.find((rule) => rule.patterns.some((pattern) => corpus.includes(pattern)));
  return matched ? matched.tag : "generic-fantasy";
}

function buildBeatExcerpt(scene) {
  const beats = scene.beats
    .map((beat) => beat.rawText.trim())
    .filter(Boolean)
    .slice(0, 6);
  return beats.join(" ");
}

function buildContinuityNotes(scene, referenceCharacterIds) {
  const notes = [];
  const numericId = Number(scene.id.replace("scene-", ""));

  if (referenceCharacterIds.includes("nyaruko")) {
    if (numericId < 77) {
      notes.push("This is before Nyaruko permanently gains the blue teardrop mark. Keep the bell at the chest, but omit the blue mark.");
    } else {
      notes.push("This is after Nyaruko gains the second key. Keep both the chest bell and the blue teardrop mark below it.");
    }
  }

  if (referenceCharacterIds.includes("legius")) {
    if (scene.title.includes("レギウスの仮面")) {
      notes.push("This episode centers on Legius revealing the scarred side of his face. The half mask may be removed or partly removed.");
    } else {
      notes.push("Keep Legius in his normal half-mask presentation unless the episode explicitly reveals otherwise.");
    }
  }

  return notes;
}

function buildPrompt(scene, referenceCharacterIds, continuityNotes, focusCharacterIds) {
  const castNote =
    referenceCharacterIds.length === 0
      ? "No named recurring character reference image is required."
      : `Use the supplied reference images to preserve the canonical appearance of ${referenceCharacterIds.join(", ")}.`;
  const focusNote =
    focusCharacterIds.length === 0
      ? ""
      : ` The composition must clearly show ${focusCharacterIds.join(" and ")} in frame as identifiable midground or foreground subjects. Do not omit them, turn them into tiny background figures, or replace them with unrelated designs.`;

  const beatExcerpt = buildBeatExcerpt(scene);
  const continuity =
    continuityNotes.length === 0 ? "" : ` Continuity notes: ${continuityNotes.join(" ")}`;
  const sceneOverride = scenePromptOverrides[scene.id] ? ` ${scenePromptOverrides[scene.id]}` : "";

  return [
    "Create one photorealistic fantasy novel insert image for this episode.",
    `Chapter: ${scene.chapterTitle}.`,
    `Episode title: ${scene.title}.`,
    `Episode summary: ${scene.summary}`,
    `Beat excerpt: ${beatExcerpt}`,
    "Choose the single strongest visual moment from this episode rather than showing multiple moments at once.",
    "Use cinematic natural light, strong depth, readable silhouettes, and vertical smartphone-friendly composition.",
    castNote + focusNote + continuity + sceneOverride,
  ].join(" ");
}

async function main() {
  const [storyDataJs, characterRefsJson] = await Promise.all([
    readFile(storyDataPath, "utf8"),
    readFile(characterRefsPath, "utf8"),
  ]);

  const story = parseStoryData(storyDataJs);
  const characterRefs = JSON.parse(characterRefsJson);
  const validCharacterIds = new Set(characterRefs.characters.map((character) => character.id));

  const manifest = {
    spec: {
      fixedWidth: 1080,
      fixedHeight: 2304,
      outputDir: "docs/images/episodes",
      totalEpisodes: story.scenes.length,
      globalPrompt:
        "Photorealistic fantasy novel insert art, cinematic natural light, realistic textures, dramatic but grounded composition, believable anatomy, expressive environment, single decisive moment, vertical format.",
      globalNegativePrompt:
        "anime, manga, cel shading, collage, split panel, multiple unrelated scenes, text, logo, watermark, low detail face, deformed hands, extra limbs, cartoon proportions",
    },
    source: {
      storyData: "docs/story-data.js",
      characterReferences: "prompts/scene-character-references.json",
    },
    episodes: story.scenes.map((scene) => {
      const cast = detectCast(scene).filter((id) => validCharacterIds.has(id));
      const referenceCharacterIds = deriveReferenceCharacterIds(scene, cast);
      const focusCharacterIds = deriveFocusCharacterIds(scene, referenceCharacterIds);
      const continuityNotes = buildContinuityNotes(scene, referenceCharacterIds);

      return {
        id: scene.id,
        title: scene.title,
        chapterTitle: scene.chapterTitle,
        chapterLabel: scene.chapterLabel,
        sourceSummary: scene.summary,
        locationTag: inferLocationTag(scene),
        cast,
        referenceCharacterIds,
        ...(focusCharacterIds.length > 0 ? { focusCharacterIds } : {}),
        model: inferModel(scene),
        continuityNotes,
        prompt: buildPrompt(scene, referenceCharacterIds, continuityNotes, focusCharacterIds),
        negativePrompt:
          "Do not redesign recurring characters away from their canonical portraits. Avoid comedic exaggeration unless the scene text demands it.",
        output: `docs/images/episodes/${scene.id}.webp`,
      };
    }),
  };

  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`Wrote ${manifest.episodes.length} episode prompts to ${path.relative(rootDir, outputPath)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
