# Christmas Bible Survey Showdown

A game-show party game for families, churches and small groups: a QR-code companion to the Bible Explorer Kids printable.

**No build step.** The whole site is plain HTML/CSS/JS in `docs/`, which GitHub Pages serves directly.

## Files
- `docs/index.html`: entry page
- `docs/js/app.js`: screens and game logic (Showdown, Fast Money, Bible Challenge, results, trophies)
- `docs/js/data.js`: **all questions** (44 survey boards, 25 Fast Money, 31 Bible Challenge). Edit here.
- `docs/js/match.js`: forgiving typed-answer matcher (typos, plurals, synonyms)
- `docs/js/audio.js`: sound engine (SFX + music; built-in synth carols when no music file exists)
- `docs/js/fx.js`: snow, confetti, strike X overlays
- `docs/assets/`: images, `audio/` sound effects, `music/` background tracks
- `ASSETS_NEEDED_FROM_JANE.md`: optional art and music that upgrades the look automatically

## Run locally
```
python -m http.server 5173 --directory docs
```
then open http://localhost:5173

## Updating the live game
After editing, bump `CACHE` in `docs/sw.js` and the `?v=` numbers in `docs/index.html` so phones pick up the new version.

Original game. Not affiliated with or endorsed by any television program.
