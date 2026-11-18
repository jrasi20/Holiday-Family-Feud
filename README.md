# Christmas Bible Survey Showdown

A responsive, installable holiday party game for families, churches, classrooms, and small groups. It blends Scripture-rooted Christmas content with funny general holiday surveys in an original game-show presentation.

## Highlights

- 28 six-answer survey boards; every board totals 100 base points
- A fresh shuffled deck whenever a new showdown begins
- Recent-board avoidance to reduce repetition between games
- Face-off buzzers, play/pass, animated reveals, strikes, steals, and single/double/triple scoring
- Easy, Classic, and Expert difficulty
- Solo Spotlight and ten-player Party Room modes
- Party Room launch lock until all ten seats have checked in and readied up
- Automatic face-off, turn, challenge, and Fast Money countdowns with named-player prompts
- Five saved player names on each team
- Prophecy, trivia, Who Said It?, and timeline challenges
- Shuffled Fast Money bank with separate 20- and 25-second player turns
- Sound, vibration, full-screen strike effects, persistent rewards, and home-screen installation
- Responsive Android/iOS portrait and landscape layouts

## How to play

1. Enter two team names and five player names per team. Player 1 is the captain.
2. Choose Solo Spotlight or Party Room, then choose difficulty, Bible/Holiday/Mixed bank, and game length.
3. In Party Room, every player taps their seat once to check in and again to ready up. The Showdown button remains locked until all ten seats are ready.
4. At each face-off, the displayed player from each team presses their buzzer. The host reveals the answer and the higher response chooses **Play** or **Pass**.
5. Follow the illuminated player prompt. Turn clocks start automatically; a timeout triggers a strike. The host taps a matching answer to reveal it or taps **Not on board — Strike**.
6. After the allowed strikes, the opposing team gets one timed steal answer. A correct answer wins the entire round bank; a miss returns the bank to the original team.
7. Early rounds are single points, middle rounds double, and final rounds triple. Highest score wins.
8. In Fast Money, two teammates answer five questions separately. Player 1 has 20 seconds, Player 2 has 25 seconds, and 200 combined points wins.

For the best party setup, cast the host device to a TV or place a tablet between the teams. This release is a shared-device game: team names, rosters, scores, and rewards are stored locally in the browser and no account or personal data is sent to a server.

## Development

```bash
pnpm install
pnpm dev
pnpm build
```

The production build is written to `docs/` for GitHub Pages.

Run `pnpm test` to execute the presence suite, including 500 isolated ten-player rooms (5,000 simulated player seats).

## Original-product note

This project uses original branding and artwork. Gameplay point values are entertainment values, not scientific survey results. It is not affiliated with or endorsed by any television game-show owner.
