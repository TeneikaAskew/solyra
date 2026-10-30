# insights-research: same-settings deployment evidence

## Settings file comparison (read-only)
- The backend settings file (`supabase/config.toml`) is byte-identical at 7744d1e, 5baf0c3 and aa9595a5. Its SHA-256 is `f5f24572…662363b` at all three. Its only content is `project_id = "hajmcfkqmtgidstpggrh"`. It has no block for this function: no `verify_jwt` override and no import map.
- The function folder holds only `index.ts`. It has no `deno.json` and no import map, at any of the three versions.
- From 5baf0c3 to aa9595a5, the only change under `supabase/` is `insights-research/index.ts` (PR306, +68/-20). Nothing in the repository changed configuration.

## What the deployment tool does
- Input: `function_names` (an array). There is no option for auth, secrets or environment.
- It bundles the named function from the project's code and applies the checked-in `config.toml`. Here that means the platform default, the same as the 01:31 UTC run that returned `76c54e10…`.
- Secrets are stored at project level, separately from the code. The tool takes no secret input, so it does not set or reset secrets.
- Not known: there is no readback of the live JWT setting, and no rollback version ID. That gap was the same for the earlier deployment the owner accepted.

## Security-setting delta
- None in the repository: the settings file and the procedure are identical to the prior deployment.
- The only change is the function code (PR306), and it is already reviewed.
- Remaining risk: someone could have changed the setting outside the repository after 01:31 UTC. Nothing available shows such a change, and nothing can rule it out.

## Minimal action (only after owner adjudication)
1. Re-verify `index.ts`: 32,155 bytes, SHA-256 `40f5da3d…6840`.
2. Call the deployment tool once with `function_names: ["insights-research"]`.
3. Record the returned fingerprint and the UTC time, then check that the deployment count goes up by one.
4. Make no research or provider calls. The owner runs UI validation.
