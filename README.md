# Build a Bit

Show-runner for the Build a Bit improv show: a console on the laptop and an audience screen on the projector.

- `index.html`: operator console (running order, previews, transport, video controls, sound board)
- `screen.html`: audience screen (open it from the console's **Open audience screen** button)
- `common.js`: prompt parser shared by both

It's a static site with no build step.

## Deploy

Hosted on Vercel from this repo (framework preset **Other**, no build command). Every push to `main` redeploys.

## Show-day setup (Mac + Chrome)

1. System Settings → Displays: set the projector to **Extended** (not mirrored).
2. System Settings → Sound → Output: **Headphones** (the jack that goes to the DI box and the board).
3. Turn on a Focus mode so notifications stay off the projector and out of the PA.
4. Open the Vercel URL in Chrome, then click **Open audience screen**. If Chrome asks about managing windows, choose Allow so the window opens on the projector.
5. Click the audience window once to go full screen. That click also lets YouTube play with sound.
6. Run the show from the console. Keys and clickers work from either window.
7. At the end, press **C** (or **Roll credits**) to roll the credits from the Credits tab. P pauses and R restarts them.

Sounds you add are stored in this browser (IndexedDB) on this Mac.
Prompts and settings are stored in localStorage.
