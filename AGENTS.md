<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Game simulation lives in `src/game/engine.ts` (pure TS `Match` class, no React/three); rendering components only read its state each frame — keeps rules testable and decoupled from 3D.
- Referee, fouls, cards and substitutions plug in via `MatchRule` hooks (`onTick`, `resolveTackle`, `onEvent`) and `Player.active`/`yellowCards`, not by editing engine core — keeps future rules isolated.
- The game route is `ssr: false` because the WebGL canvas and canvas textures need the browser.
