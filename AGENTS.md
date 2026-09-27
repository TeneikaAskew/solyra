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

## Delivery gate
Read `.claude/skills/product-delivery/SKILL.md` and follow it for any code change. The same gate
(`scripts/gate/spec_gate.py`) runs on every commit and every PR regardless of which agent authored it.
Branch names must carry the FEAT-ID: `feature/<feat-id>-<slug>` or `fix/<feat-id>-<slug>`.
