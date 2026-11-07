# Blocker packet: insights-research deployment

## Evidence
- The deploy action is available for this project. It is listed for this project and its input schema came back (it takes a list of function names). Lovable Cloud deploys functions from the project's code.
- What is missing is a way to inspect the function before deploying. The docs (Edge functions, Version history) describe a monitor view with status, invocations, logs, URL and view code. They describe no deployed-version ID, no source hash, no JWT setting screen and no rollback for a single function.
- What you see in the app (Active, updated 18 days ago, 36 deployments) is the monitor view. It shows a deployment count, but no version IDs.
- Source: MAIN at `c8f19134` contains PR302. The function's SHA256 is `620b0e5e…dcfac6`, which matches the reviewed hash. No other `[functions.insights-research]` block exists in `supabase/config.toml`, so the default JWT setting applies. That setting is managed by the platform.

## Smallest owner action (no support needed)
1. Preserve: open More → Database → Manage → Edge functions → insights-research → View code. Save a copy and hash it as the "before" record. Write down the current History version as the rollback point. History's Revert redeploys the functions to match that version.
2. Approve: tell me in chat to "deploy insights-research only". I call the deploy action once with `["insights-research"]`, with no code, config or secret changes.
3. Verify: the last-updated time changes and the deployment count goes to 37. Use View code to confirm the new hash equals `620b0e5e…`. Check the logs read-only and send no research calls.

## Only if you need an immutable version ID or the deployed JWT setting
No supported screen shows these. Lovable support would need to look up the platform's deployment record for insights-research: the version ID, the deploy time, the verify_jwt value and the earlier version's ID for rollback. This is optional. Steps 1 to 3 give you evidence you can check yourself.
