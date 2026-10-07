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

# Agent instructions

**Last reviewed:** unknown · **Last scanned:** 2026-09-28 · **Owner:** TBD

## Delivery gate
Read `.claude/skills/product-delivery/SKILL.md` and follow it for any code change. The same gate
(`scripts/gate/spec_gate.py`) runs on every commit and every PR regardless of which agent authored it.
A branch that changes code must carry the FEAT-ID: `feature/<feat-id>-<slug>` or `fix/<feat-id>-<slug>`.
The only other shapes are `docs/<slug>` (documentation only), `chore/<slug>` (dependency fields of manifests,
lockfiles and the gate's own files), `spike/<slug>` (local commits, never a PR) and `bot/superpowers-*`
(the vendored skills), as Phase 0 of the product-delivery skill sets out.
