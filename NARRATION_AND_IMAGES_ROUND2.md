# Round 2: narration lines and celebration images

Every item here is **optional**. Each one is already wired into the game: drop the file in with the exact filename and it plays or shows automatically. You don't need to tell me.

## 1. Narration lines (ElevenLabs or your own voice)

**Voice direction for every line:** a warm, upbeat Christmas game-show host. Big smile, energetic but kind (it's a family church game), slight pause before punchlines. Keep each line under 3 seconds unless noted. Export MP3.

Save into: `docs\assets\audio\`

| Filename | Say this | When it plays |
|---|---|---|
| `vo-lobby.mp3` | "Grab your phones and scan the code to join a team!" | When the lobby opens |
| `vo-faceoff.mp3` | "Face-off! Hands on your buzzers!" | Each face-off card |
| `vo-buzzed.mp3` | "We have a buzz!" | Someone buzzes in |
| `vo-play-or-pass.mp3` | "Play… or pass?" | The face-off winner decides |
| `vo-strike1.mp3` | "That's one strike!" | 1st wrong answer |
| `vo-strike2.mp3` | "Strike two! Careful now…" | 2nd wrong answer |
| `vo-strike3.mp3` | "Three strikes!" | 3rd wrong answer (before STEAL) |
| `vo-board-cleared.mp3` | "You cleared the whole board! Amazing!" | A team finds all 6 answers |
| `vo-steal-success.mp3` | "They stole it! What a steal!" | A successful steal |
| `vo-final-round.mp3` | "Final round! Everything is worth triple!" | Start of the last round |
| `vo-next-round.mp3` | "Get ready… here comes the next round!" | Between rounds |
| `vo-times-up.mp3` | "Time's up!" | Fast Money clock runs out |
| `vo-fm-reveal.mp3` | "Let's see what our survey said!" | Before revealing Fast Money answers |
| `vo-duplicate.mp3` | "Ooh, already said! Try another one!" | Fast Money repeat answer |

**Already in the game:** "Survey says!", "Top answer!", "Steal!", "It's time for Fast Money!", "And the champions are…", "Congratulations", "Welcome", "Great answer!", "Try again", "Better luck next time".

**ElevenLabs tip:** pick one voice and keep it for every line. Settings: Stability about 35%, Style about 40%. Put exclamation marks where you want energy.

## 2. Celebration images (win screen)

These bounce, sway and spin around the winner screen. Until you add them, the game draws simple versions itself.

Save into: `docs\assets\celebrate\` (create the folder). **Transparent PNG, square, about 512×512.**

Use this **style line on every prompt** so they match:
> *Glossy 3D Christmas cartoon icon, soft studio lighting, rich gold and crimson accents, subtle sparkle highlights, centered, fully transparent background, no text, no shadow on the ground.*

| Filename | Prompt (add the style line) |
|---|---|
| `gift.png` | A wrapped Christmas present in shiny red paper with a big gold ribbon bow |
| `ornament.png` | A round emerald-green Christmas ornament with a gold cap and a gold glitter stripe |
| `star.png` | A plump golden Christmas star with a warm glow |
| `coin.png` | A shiny gold coin with a small embossed star in the middle |
| `bell.png` | A golden jingle bell with a red bow and two holly leaves |
| `candycane.png` | A red-and-white striped candy cane with a tiny green bow |

If your tool can't make transparent backgrounds, use a pure white background and tell me; I'll cut them out.
