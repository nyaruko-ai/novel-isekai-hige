# Episode Image Plan

## Purpose
- Generate one image per episode unit.
- Episode unit means each `###` block already used by the web reader data.
- This replaces the previous finer scene-splitting plan.

## Unit Definition
- Source of truth: [story-data.js](/Users/nijot/work/AIApps/novels/novel-isekai-hige/docs/story-data.js)
- Current total image units: `114`
- This includes numbered episodes and interlude entries already present in the story data.

## Fixed Spec
- Canvas: `1080 x 2304`
- Base look: photorealistic fantasy novel insert art
- Display assumption: vertical smartphone reader with `object-fit: cover`

## Character Consistency Policy
- If an episode image contains a named recurring character, use the existing character portrait image as a reference input.
- Do not redesign recurring characters from text alone.
- Canonical character references: [scene-character-references.json](/Users/nijot/work/AIApps/novels/novel-isekai-hige/prompts/scene-character-references.json)
- Scene prompts may change pose, mood, environment, lighting, framing, and action.
- Scene prompts may not change core face, hair, costume silhouette, species traits, or signature accessories.

## Generation Strategy
- One image per episode.
- Each image should depict the single strongest visual beat in that episode.
- If an episode is mostly conversational or explanatory:
  - choose the strongest environment-and-character composition rather than inventing action
- If an episode contains a major reveal or battle:
  - anchor the image to that reveal or battle beat

## Model Policy
- `gemini-3-pro-image-preview`
  - first appearances
  - major reveals
  - large battles
  - major key/door/coordinate moments
  - ending scenes
- `gemini-3.1-flash-image-preview`
  - travel
  - dialogue-heavy episodes
  - transitional mystery scenes
  - quieter atmospheric scenes

## Files
- Episode plan: [episode-image-plan.md](/Users/nijot/work/AIApps/novels/novel-isekai-hige/prompts/episode-image-plan.md)
- Character consistency manifest: [scene-character-references.json](/Users/nijot/work/AIApps/novels/novel-isekai-hige/prompts/scene-character-references.json)
- Machine-readable episode manifest: [episode-image-manifest.json](/Users/nijot/work/AIApps/novels/novel-isekai-hige/prompts/episode-image-manifest.json)

## Next Step
- Build one manifest entry per episode with:
  - episode id
  - title
  - chapter metadata
  - cast
  - reference character ids
  - model
  - prompt
  - negative prompt
  - output path
