# Lovable Commit Review Manifest

Every commit authored by Lovable (`gpt-engineer-app[bot]` and `Lovable`) in this
repository, listed oldest to newest, so they can be reviewed as one set. All of
these commits are already on `main`; this document is the review index for them.

Generated from `git log` on 2026-09-03, covering main through `03ddb06`
(2026-09-03 13:07 UTC, the last Lovable commit before role-based admin auth
landed via #34). 137 commits total: 135 by `gpt-engineer-app[bot]`, 2 by
`Lovable`. Lovable commits continuously while the editor is in use, so commits
after that cutoff are not listed here.

| # | Commit | Date (UTC) | Author | Subject | Changes | Files touched |
|---|--------|------------|--------|---------|---------|---------------|
| 1 | `0f401e5` | 2026-08-20 13:18 | Lovable | template: tanstack_start_ts_current-b3e81c491308 | 74 files changed, 6401 insertions(+) | `.gitignore` `.lovable/project.json` `.prettierignore` `.prettierrc` `AGENTS.md` `README.md` `bun.lock` `bunfig.toml` +66 more |
| 2 | `72cb537` | 2026-08-29 12:15 | gpt-engineer-app[bot] | Changes | 1 file changed, 84 insertions(+), 76 deletions(-) | `src/styles.css` |
| 3 | `e49785c` | 2026-08-29 12:15 | gpt-engineer-app[bot] | Changes | 1 file changed, 6 insertions(+) | `src/routes/__root.tsx` |
| 4 | `e33ca72` | 2026-08-29 12:17 | gpt-engineer-app[bot] | Changes | 1 file changed, 546 insertions(+), 14 deletions(-) | `src/routes/index.tsx` |
| 5 | `e1f56b1` | 2026-08-29 12:17 | gpt-engineer-app[bot] | Fixed fonts link | merge | (merge commit - see parent commits) |
| 6 | `32c0865` | 2026-08-29 21:09 | gpt-engineer-app[bot] | Changes | 1 file changed, 94 insertions(+), 55 deletions(-) | `src/styles.css` |
| 7 | `6ebf207` | 2026-08-29 21:09 | gpt-engineer-app[bot] | Changes | 1 file changed, 15 insertions(+), 6 deletions(-) | `src/routes/__root.tsx` |
| 8 | `f4a11ee` | 2026-08-29 21:12 | gpt-engineer-app[bot] | Changes | 1 file changed, 951 insertions(+), 430 deletions(-) | `src/routes/index.tsx` |
| 9 | `020896f` | 2026-08-29 21:13 | gpt-engineer-app[bot] | Changes | 1 file changed, 2 insertions(+), 2 deletions(-) | `src/routes/index.tsx` |
| 10 | `31ed66c` | 2026-08-29 21:13 | gpt-engineer-app[bot] | Changes | 1 file changed, 3 insertions(+), 2 deletions(-) | `src/routes/index.tsx` |
| 11 | `e2d4596` | 2026-08-29 21:14 | gpt-engineer-app[bot] | Redesigned site to Skylit-like | merge | (merge commit - see parent commits) |
| 12 | `c663170` | 2026-08-31 22:13 | Lovable | Add project README | 1 file changed, 6 insertions(+), 11 deletions(-) | `README.md` |
| 13 | `dd0ef1c` | 2026-08-31 23:36 | gpt-engineer-app[bot] | Changes | 1 file changed, 1175 insertions(+) | `bun.lock` |
| 14 | `5899213` | 2026-08-31 23:37 | gpt-engineer-app[bot] | Changes | 1 file changed, 15 insertions(+), 10 deletions(-) | `tsconfig.app.json` |
| 15 | `e41ea25` | 2026-08-31 23:37 | gpt-engineer-app[bot] | Rebuilt configuration page | merge | (merge commit - see parent commits) |
| 16 | `d4fd194` | 2026-08-31 23:38 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+) | `package.json` |
| 17 | `f27ac3a` | 2026-08-31 23:38 | gpt-engineer-app[bot] | Added build:dev script | merge | (merge commit - see parent commits) |
| 18 | `1eb2107` | 2026-08-31 23:40 | gpt-engineer-app[bot] | Changes | 1 file changed, 16 insertions(+), 1 deletion(-) | `vite.config.ts` |
| 19 | `a9945f0` | 2026-08-31 23:40 | gpt-engineer-app[bot] | Changes | 1 file changed, 10 insertions(+), 6 deletions(-) | `vite.config.ts` |
| 20 | `417da99` | 2026-08-31 23:40 | gpt-engineer-app[bot] | Added dev Firebase config | merge | (merge commit - see parent commits) |
| 21 | `526ce27` | 2026-09-01 02:17 | gpt-engineer-app[bot] | Changes | 1 file changed, 10 insertions(+), 1 deletion(-) | `src/main.tsx` |
| 22 | `0ca55b5` | 2026-09-01 02:17 | gpt-engineer-app[bot] | Changes | 1 file changed, 4 insertions(+), 2 deletions(-) | `src/main.tsx` |
| 23 | `34588bc` | 2026-09-01 02:17 | gpt-engineer-app[bot] | Changes | 1 file changed, 32 deletions(-) | `src/main.tsx` |
| 24 | `2148ff6` | 2026-09-01 02:17 | gpt-engineer-app[bot] | Handled config fetch fallback | merge | (merge commit - see parent commits) |
| 25 | `6a8c349` | 2026-09-02 23:16 | gpt-engineer-app[bot] | Changes | 1 file changed, 8 insertions(+), 3 deletions(-) | `src/stores/settingsStore.ts` |
| 26 | `ad91837` | 2026-09-02 23:16 | gpt-engineer-app[bot] | Fixed theme class removal bug | merge | (merge commit - see parent commits) |
| 27 | `f28dd42` | 2026-09-03 10:58 | gpt-engineer-app[bot] | Changes | 2 files changed, 16 insertions(+), 11 deletions(-) | `src/components/landing/LandingNav.tsx` `src/components/landing/landing.css` |
| 28 | `07bb951` | 2026-09-03 10:58 | gpt-engineer-app[bot] | Changes | 1 file changed, 2 insertions(+), 2 deletions(-) | `src/components/landing/landing.css` |
| 29 | `7079b9a` | 2026-09-03 10:58 | gpt-engineer-app[bot] | Fixed mobile nav spacing | merge | (merge commit - see parent commits) |
| 30 | `a712fce` | 2026-09-03 11:06 | gpt-engineer-app[bot] | Changes | 1 file changed, 27 insertions(+) | `src/types/preferences.ts` |
| 31 | `6caa87d` | 2026-09-03 11:06 | gpt-engineer-app[bot] | Changes | 1 file changed, 151 insertions(+) | `src/hooks/usePreferences.ts` |
| 32 | `d1b31da` | 2026-09-03 11:07 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+) | `src/components/layout/AppShell.tsx` |
| 33 | `4cbb70f` | 2026-09-03 11:07 | gpt-engineer-app[bot] | Changes | 1 file changed, 3 insertions(+) | `src/components/layout/AppShell.tsx` |
| 34 | `619ddeb` | 2026-09-03 11:07 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+) | `src/routes/SettingsPage.tsx` |
| 35 | `d783dae` | 2026-09-03 11:07 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+) | `src/routes/SettingsPage.tsx` |
| 36 | `fdb8ab9` | 2026-09-03 11:07 | gpt-engineer-app[bot] | Changes | 1 file changed, 16 insertions(+), 1 deletion(-) | `src/routes/SettingsPage.tsx` |
| 37 | `7131ac0` | 2026-09-03 11:07 | gpt-engineer-app[bot] | Changes | 1 file changed, 43 insertions(+) | `src/hooks/usePreferences.test.ts` |
| 38 | `4ec9f98` | 2026-09-03 11:08 | gpt-engineer-app[bot] | Changes | 1 file changed, 49 insertions(+), 22 deletions(-) | `src/hooks/usePreferences.ts` |
| 39 | `5d8b401` | 2026-09-03 11:08 | gpt-engineer-app[bot] | Changes | 1 file changed, 19 insertions(+), 13 deletions(-) | `src/hooks/usePreferences.ts` |
| 40 | `a123de4` | 2026-09-03 11:09 | gpt-engineer-app[bot] | Changes | 1 file changed, 23 insertions(+) | `src/hooks/usePreferences.ts` |
| 41 | `83c72fd` | 2026-09-03 11:09 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+) | `src/hooks/usePreferences.ts` |
| 42 | `01f0bfe` | 2026-09-03 11:09 | gpt-engineer-app[bot] | Changes | 1 file changed, 2 insertions(+), 2 deletions(-) | `src/routes/SettingsPage.tsx` |
| 43 | `c748da4` | 2026-09-03 11:10 | gpt-engineer-app[bot] | Changes | 1 file changed, 6 insertions(+) | `src/hooks/usePreferences.ts` |
| 44 | `2ed381c` | 2026-09-03 11:10 | gpt-engineer-app[bot] | Changes | 1 file changed, 9 insertions(+) | `src/hooks/usePreferences.ts` |
| 45 | `7bf823d` | 2026-09-03 11:11 | gpt-engineer-app[bot] | Persisted settings via mock API | merge | (merge commit - see parent commits) |
| 46 | `fdd4aa0` | 2026-09-03 11:12 | gpt-engineer-app[bot] | Changes | 2 files changed, 4 insertions(+), 4 deletions(-) | `src/components/primitives/index.tsx` `src/routes/DashboardPage.tsx` |
| 47 | `1fb7f03` | 2026-09-03 11:13 | gpt-engineer-app[bot] | Fixed mobile card header wrap | merge | (merge commit - see parent commits) |
| 48 | `1a91c9a` | 2026-09-03 11:14 | gpt-engineer-app[bot] | Changes | 1 file changed, 35 insertions(+) | `src/components/charts/CandlestickChart.tsx` |
| 49 | `d37ca1f` | 2026-09-03 11:14 | gpt-engineer-app[bot] | Changes | 1 file changed, 17 insertions(+) | `src/components/charts/CandlestickChart.tsx` |
| 50 | `55d9560` | 2026-09-03 11:14 | gpt-engineer-app[bot] | Changes | 1 file changed, 2 insertions(+), 1 deletion(-) | `src/components/charts/CandlestickChart.tsx` |
| 51 | `881b457` | 2026-09-03 11:14 | gpt-engineer-app[bot] | Changes | 1 file changed, 3 insertions(+), 7 deletions(-) | `src/components/charts/CandlestickChart.tsx` |
| 52 | `e7c952c` | 2026-09-03 11:14 | gpt-engineer-app[bot] | Changes | 1 file changed, 39 insertions(+) | `src/components/charts/CandlestickChart.test.ts` |
| 53 | `83b68b0` | 2026-09-03 11:17 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+), 1 deletion(-) | `src/components/shared/ReplayControl.tsx` |
| 54 | `edb87b3` | 2026-09-03 11:19 | gpt-engineer-app[bot] | Changes | 1 file changed, 34 insertions(+) | `src/index.css` |
| 55 | `78d1a25` | 2026-09-03 11:26 | gpt-engineer-app[bot] | Changes | 1 file changed, 104 insertions(+) | `tests/options-mobile-fit.spec.ts` |
| 56 | `ec96d54` | 2026-09-03 11:27 | gpt-engineer-app[bot] | Changes | 1 file changed, 46 insertions(+) | `tests/helpers/fixtures/options.ts` |
| 57 | `7b0078f` | 2026-09-03 11:28 | gpt-engineer-app[bot] | Changes | 1 file changed, 2 insertions(+) | `pw.sandbox.config.ts` |
| 58 | `deb296d` | 2026-09-03 11:30 | gpt-engineer-app[bot] | Changes | 1 file changed, 3 insertions(+), 1 deletion(-) | `pw.sandbox.config.ts` |
| 59 | `524bea1` | 2026-09-03 11:32 | gpt-engineer-app[bot] | Changes | 1 file changed, 40 insertions(+) | `src/index.css` |
| 60 | `d4bd14e` | 2026-09-03 11:34 | gpt-engineer-app[bot] | Changes | 1 file changed, 6 insertions(+) | `tests/helpers/mocks.ts` |
| 61 | `1a3c951` | 2026-09-03 11:38 | gpt-engineer-app[bot] | Changes | 1 file changed, 5 insertions(+), 1 deletion(-) | `tests/helpers/mocks.ts` |
| 62 | `88a3552` | 2026-09-03 11:38 | gpt-engineer-app[bot] | Changes | 1 file changed, 4 deletions(-) | `pw.sandbox.config.ts` |
| 63 | `6930cc1` | 2026-09-03 11:38 | gpt-engineer-app[bot] | Fixed options overflow wrap | merge | (merge commit - see parent commits) |
| 64 | `58c912f` | 2026-09-03 11:39 | gpt-engineer-app[bot] | Changes | 1 file changed, 5 insertions(+), 2 deletions(-) | `src/components/landing/landing.css` |
| 65 | `5ae702d` | 2026-09-03 11:40 | gpt-engineer-app[bot] | Changes | 2 files changed, 26 insertions(+) | `pw.sandbox.config.ts` `tests/landing.spec.ts` |
| 66 | `d553e4d` | 2026-09-03 11:40 | gpt-engineer-app[bot] | Changes | 1 file changed, 3 deletions(-) | `pw.sandbox.config.ts` |
| 67 | `83ae883` | 2026-09-03 11:40 | gpt-engineer-app[bot] | Restored sign-in and waitlist | merge | (merge commit - see parent commits) |
| 68 | `7f2279e` | 2026-09-03 11:41 | gpt-engineer-app[bot] | Changes | 1 file changed, 14 insertions(+) | `src/components/shared/MostActiveBar.tsx` |
| 69 | `b059cbc` | 2026-09-03 11:41 | gpt-engineer-app[bot] | Changes | 1 file changed, 2 insertions(+), 1 deletion(-) | `src/components/shared/MostActiveBar.tsx` |
| 70 | `61ae1b7` | 2026-09-03 11:42 | gpt-engineer-app[bot] | Changes | 1 file changed, 35 insertions(+) | `src/components/shared/MostActiveBar.test.tsx` |
| 71 | `191a2cf` | 2026-09-03 11:42 | gpt-engineer-app[bot] | Guarded flat sparklines | merge | (merge commit - see parent commits) |
| 72 | `d464a92` | 2026-09-03 11:42 | gpt-engineer-app[bot] | Changes | 1 file changed, 4 insertions(+), 3 deletions(-) | `src/routes/InsightsPage.tsx` |
| 73 | `57e9eaa` | 2026-09-03 11:43 | gpt-engineer-app[bot] | Changes | 1 file changed, 4 insertions(+), 1 deletion(-) | `src/routes/InsightsPage.tsx` |
| 74 | `69e3bc2` | 2026-09-03 11:43 | gpt-engineer-app[bot] | Changes | 1 file changed, 2 insertions(+), 2 deletions(-) | `src/routes/InsightsPage.tsx` |
| 75 | `6de41ce` | 2026-09-03 11:43 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+), 1 deletion(-) | `src/routes/InsightsPage.tsx` |
| 76 | `a02ef44` | 2026-09-03 11:44 | gpt-engineer-app[bot] | Fixed Insights mobile layout | merge | (merge commit - see parent commits) |
| 77 | `448e61b` | 2026-09-03 11:44 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+), 1 deletion(-) | `src/components/shared/TickerCombobox.tsx` |
| 78 | `8b23cf6` | 2026-09-03 11:45 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+), 1 deletion(-) | `src/components/shared/TickerCombobox.tsx` |
| 79 | `05ac385` | 2026-09-03 11:45 | gpt-engineer-app[bot] | Fixed ticker search mobile layout | merge | (merge commit - see parent commits) |
| 80 | `e92f0d3` | 2026-09-03 11:46 | gpt-engineer-app[bot] | Changes | 1 file changed, 138 insertions(+) | `src/components/shared/DateRangePicker.tsx` |
| 81 | `dbd70e7` | 2026-09-03 11:46 | gpt-engineer-app[bot] | Changes | 1 file changed, 3 insertions(+), 1 deletion(-) | `src/components/shared/DateRangePicker.tsx` |
| 82 | `1a4d207` | 2026-09-03 11:46 | gpt-engineer-app[bot] | Changes | 1 file changed, 8 insertions(+), 20 deletions(-) | `src/routes/CatalystsPage.tsx` |
| 83 | `01c3c10` | 2026-09-03 11:47 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+) | `src/routes/CatalystsPage.tsx` |
| 84 | `3a3fb5e` | 2026-09-03 11:49 | gpt-engineer-app[bot] | Unified date pickers to range | merge | (merge commit - see parent commits) |
| 85 | `52f1011` | 2026-09-03 11:49 | gpt-engineer-app[bot] | Changes | 1 file changed, 2 insertions(+), 1 deletion(-) | `src/routes/CatalystsPage.tsx` |
| 86 | `4480484` | 2026-09-03 11:49 | gpt-engineer-app[bot] | Changes | 1 file changed, 15 insertions(+), 3 deletions(-) | `src/routes/CatalystsPage.tsx` |
| 87 | `9bd6533` | 2026-09-03 11:50 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+), 1 deletion(-) | `src/routes/CatalystsPage.tsx` |
| 88 | `7a71960` | 2026-09-03 11:53 | gpt-engineer-app[bot] | Changes | 1 file changed, 2 insertions(+), 2 deletions(-) | `src/routes/CatalystsPage.tsx` |
| 89 | `774e913` | 2026-09-03 11:55 | gpt-engineer-app[bot] | Fixed cutoff titles via expand | merge | (merge commit - see parent commits) |
| 90 | `b459a7f` | 2026-09-03 11:56 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+), 1 deletion(-) | `src/routes/DashboardPage.tsx` |
| 91 | `6383ca7` | 2026-09-03 11:56 | gpt-engineer-app[bot] | Fixed Catalysts title wrapping | merge | (merge commit - see parent commits) |
| 92 | `e87d86d` | 2026-09-03 11:57 | gpt-engineer-app[bot] | Changes | 1 file changed, 122 insertions(+) | `src/hooks/useAdmin.ts` |
| 93 | `ed50372` | 2026-09-03 11:58 | gpt-engineer-app[bot] | Changes | 2 files changed, 332 insertions(+) | `src/components/admin/DataSourcesPanel.tsx` `src/components/admin/UsersPanel.tsx` |
| 94 | `f408e12` | 2026-09-03 11:58 | gpt-engineer-app[bot] | Changes | 1 file changed, 80 insertions(+), 30 deletions(-) | `src/routes/AdminPage.tsx` |
| 95 | `4e45950` | 2026-09-03 11:58 | gpt-engineer-app[bot] | Changes | 1 file changed, 11 insertions(+) | `src/routes/AdminPage.tsx` |
| 96 | `ad29ef3` | 2026-09-03 11:59 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+) | `src/routes/AdminPage.tsx` |
| 97 | `e0a3013` | 2026-09-03 11:59 | gpt-engineer-app[bot] | Changes | 2 files changed, 32 insertions(+), 3 deletions(-) | `src/components/admin/DataSourcesPanel.test.ts` `src/components/admin/DataSourcesPanel.tsx` |
| 98 | `b8a666e` | 2026-09-03 12:00 | gpt-engineer-app[bot] | Changes | 3 files changed, 29 insertions(+), 25 deletions(-) | `src/components/admin/DataSourcesPanel.tsx` `src/components/admin/dataSourceFormat.test.ts` `src/components/admin/dataSourceFormat.ts` |
| 99 | `dd6b6da` | 2026-09-03 12:00 | gpt-engineer-app[bot] | Changes | 2 files changed, 3 insertions(+), 4 deletions(-) | `src/components/admin/DataSourcesPanel.tsx` `src/components/admin/dataSourceFormat.ts` |
| 100 | `265f246` | 2026-09-03 12:01 | gpt-engineer-app[bot] | Added admin data management | merge | (merge commit - see parent commits) |
| 101 | `4c86b75` | 2026-09-03 12:28 | gpt-engineer-app[bot] | Changes | 1 file changed, 145 insertions(+), 41 deletions(-) | `src/routes/ReportsPage.tsx` |
| 102 | `91a50a0` | 2026-09-03 12:28 | gpt-engineer-app[bot] | Changes | 2 files changed, 48 insertions(+) | `src/index.css` `src/routes/reportsGrouping.test.ts` |
| 103 | `127d912` | 2026-09-03 12:29 | gpt-engineer-app[bot] | Changes | 1 file changed, 68 insertions(+) | `src/lib/reports.ts` |
| 104 | `b6644a4` | 2026-09-03 12:29 | gpt-engineer-app[bot] | Changes | 5 files changed, 9 insertions(+), 105 deletions(-) | `src/routes/ReportsPage.tsx` `src/routes/reportsFixtureRender.test.ts` `src/routes/reportsGrouping.test.ts` `src/routes/reportsSanitize.test.ts` `tests/helpers/fixtures/reports.ts` |
| 105 | `6950b44` | 2026-09-03 12:29 | gpt-engineer-app[bot] | Changes | 1 file changed, 34 insertions(+) | `src/lib/reports.test.ts` |
| 106 | `9b5e00f` | 2026-09-03 12:32 | gpt-engineer-app[bot] | Rebuilt report layout design | merge | (merge commit - see parent commits) |
| 107 | `c01aa21` | 2026-09-03 12:33 | gpt-engineer-app[bot] | Changes | 1 file changed, 7 insertions(+), 7 deletions(-) | `src/routes/CatalystsPage.tsx` |
| 108 | `ac3efae` | 2026-09-03 12:35 | gpt-engineer-app[bot] | Fixed mobile header overlap | merge | (merge commit - see parent commits) |
| 109 | `35a7974` | 2026-09-03 12:36 | gpt-engineer-app[bot] | Changes | 1 file changed, 74 insertions(+) | `src/types/profile.ts` |
| 110 | `f30c369` | 2026-09-03 12:36 | gpt-engineer-app[bot] | Changes | 1 file changed, 122 insertions(+) | `src/hooks/useProfile.ts` |
| 111 | `6602308` | 2026-09-03 12:37 | gpt-engineer-app[bot] | Changes | 1 file changed, 410 insertions(+), 88 deletions(-) | `src/routes/SettingsPage.tsx` |
| 112 | `9729efe` | 2026-09-03 12:38 | gpt-engineer-app[bot] | Changes | 1 file changed, 48 insertions(+), 25 deletions(-) | `src/routes/SettingsPage.tsx` |
| 113 | `313bd30` | 2026-09-03 12:39 | gpt-engineer-app[bot] | Reorganized Settings into tabs | merge | (merge commit - see parent commits) |
| 114 | `0b01c2d` | 2026-09-03 12:40 | gpt-engineer-app[bot] | Changes | 46 files changed, 221 insertions(+), 222 deletions(-) | `src/components/auth/SignInScreen.tsx` `src/components/backtest/BacktesterSection.tsx` `src/components/charts/PriceAreaChart.tsx` `src/components/charts/SimilarSetupsCard.tsx` `src/components/dashboard/MovementRead.tsx` `src/components/dashboard/expectedMove.ts` `src/components/insights/AgentsPanel.tsx` `src/components/insights/ReportCards.tsx` +38 more |
| 115 | `6834a31` | 2026-09-03 12:41 | gpt-engineer-app[bot] | Changes | 2 files changed, 3 insertions(+), 3 deletions(-) | `src/components/journal/ImportTradesModal.tsx` `src/components/options/ProfilesTab.tsx` |
| 116 | `53e579b` | 2026-09-03 12:42 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+), 1 deletion(-) | `src/routes/HelpPage.tsx` |
| 117 | `cde84c4` | 2026-09-03 12:42 | gpt-engineer-app[bot] | Removed em dashes and AI idioms | merge | (merge commit - see parent commits) |
| 118 | `80e59c0` | 2026-09-03 12:54 | gpt-engineer-app[bot] | Work in progress | 15 files changed, 209 insertions(+), 4 deletions(-) | `src/components/shared/MostActiveBar.tsx` `src/components/shared/SignInEmptyState.tsx` `src/lib/authGate.test.ts` `src/lib/authGate.ts` `src/lib/authedFetch.ts` `src/routes/CatalystsPage.tsx` `src/routes/ChartsPage.tsx` `src/routes/DashboardPage.tsx` +7 more |
| 119 | `82aaeed` | 2026-09-03 12:56 | gpt-engineer-app[bot] | Added auth gate empty state | merge | (merge commit - see parent commits) |
| 120 | `c5adb2a` | 2026-09-03 12:56 | gpt-engineer-app[bot] | Changes | 2 files changed, 34 insertions(+), 1 deletion(-) | `src/components/shared/SignInEmptyState.tsx` `src/routes/OptionsFlowPage.tsx` |
| 121 | `f06e221` | 2026-09-03 12:56 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+) | `src/routes/OptionsFlowPage.tsx` |
| 122 | `93b32ed` | 2026-09-03 12:57 | gpt-engineer-app[bot] | Changes | 1 file changed, 2 insertions(+), 1 deletion(-) | `src/routes/ChartsPage.tsx` |
| 123 | `0c4000f` | 2026-09-03 12:58 | gpt-engineer-app[bot] | Added sign-in CTA banner | merge | (merge commit - see parent commits) |
| 124 | `02d3998` | 2026-09-03 12:59 | gpt-engineer-app[bot] | Changes | 1 file changed, 117 insertions(+) | `src/components/shared/WidgetState.tsx` |
| 125 | `65d3846` | 2026-09-03 12:59 | gpt-engineer-app[bot] | Changes | 1 file changed, 16 insertions(+), 1 deletion(-) | `src/components/shared/SignInEmptyState.tsx` |
| 126 | `bc66936` | 2026-09-03 13:00 | gpt-engineer-app[bot] | Changes | 1 file changed, 23 insertions(+), 16 deletions(-) | `src/routes/DashboardPage.tsx` |
| 127 | `bd8b4ab` | 2026-09-03 13:00 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 deletion(-) | `src/routes/DashboardPage.tsx` |
| 128 | `eefdbfc` | 2026-09-03 13:01 | gpt-engineer-app[bot] | Changes | 2 files changed, 28 insertions(+), 5 deletions(-) | `src/components/options/ProfilesTab.tsx` `src/routes/ChartsPage.tsx` |
| 129 | `42ef86c` | 2026-09-03 13:01 | gpt-engineer-app[bot] | Changes | 1 file changed, 2 insertions(+), 1 deletion(-) | `src/components/options/ProfilesTab.tsx` |
| 130 | `f557fac` | 2026-09-03 13:02 | gpt-engineer-app[bot] | Changes | 1 file changed, 29 insertions(+) | `src/components/shared/WidgetState.test.ts` |
| 131 | `3fd05f3` | 2026-09-03 13:04 | gpt-engineer-app[bot] | Added retry for API errors | merge | (merge commit - see parent commits) |
| 132 | `286de1d` | 2026-09-03 13:05 | gpt-engineer-app[bot] | Changes | 1 file changed, 95 insertions(+) | `src/components/shared/AuthStatusIndicator.tsx` |
| 133 | `4a0f51f` | 2026-09-03 13:05 | gpt-engineer-app[bot] | Changes | 3 files changed, 9 insertions(+) | `src/components/layout/AppShell.tsx` `src/components/layout/Header.tsx` `src/components/layout/TopTabs.tsx` |
| 134 | `86501e3` | 2026-09-03 13:06 | gpt-engineer-app[bot] | Added auth indicator & banner | merge | (merge commit - see parent commits) |
| 135 | `0e7b91d` | 2026-09-03 13:06 | gpt-engineer-app[bot] | Changes | 1 file changed, 25 insertions(+), 6 deletions(-) | `src/components/landing/LandingFAQ.tsx` |
| 136 | `f72962d` | 2026-09-03 13:07 | gpt-engineer-app[bot] | Changes | 1 file changed, 1 insertion(+), 1 deletion(-) | `src/components/landing/LandingFAQ.tsx` |
| 137 | `03ddb06` | 2026-09-03 13:07 | gpt-engineer-app[bot] | Fixed footer layout wrapping | merge | (merge commit - see parent commits) |

## Notes for reviewers

- Commits titled `Changes` are Lovable's auto-generated messages; the diff is the only record of intent.
- Rows marked *merge* are Lovable checkpoint merges; the substantive diffs are in the parent commits listed around them.
- The `6930cc1` checkpoint merge (11:38) effectively reverts the 11:14 `CandlestickChart` cluster: `CandlestickChart.test.ts` is deleted and the `CandlestickChart.tsx` additions are dropped from `main` again.

### Rows 1-67 (through `83ae883`) — reviewed on PR #37

- `a712fce`..`fdd4aa0`: the `usePreferences` hook, `src/types/preferences.ts`, and Settings wiring. Codex's P2 findings there (StrictMode ownership bug, hydration overwrite) are tracked on PR #37; the StrictMode bug was fixed in PR #40.
- `2148ff6` "Handled config fetch fallback": boot/config path, reviewed against CLAUDE.md Rule 4.
- `78d1a25`..`83ae883`: Playwright spec additions plus a `pw.sandbox.config.ts` added, deleted, re-added, and deleted again.

### Rows 68-137 (`7f2279e`..`03ddb06`) — reviewed on this PR

Batches, in order: sparkline, mobile-layout, date-picker and Catalysts-title
fixes (11:41-11:56), the admin data-management build-out
(`e87d86d`..`265f246` — it starts at `e87d86d`, the 122-line `useAdmin.ts`
query/mutation API layer the admin UI commits consume), the Reports layout
rebuild (`4c86b75`..`9b5e00f`), a Catalysts mobile header-overlap fix
(`c01aa21`..`ac3efae` — CatalystsPage only, despite following the Reports
checkpoint), the Settings tab reorganization (`35a7974`..`313bd30`), the
em-dash/AI-idiom copy pass (`0b01c2d`..`cde84c4` — the 46-file sweep is
`0b01c2d`; `6834a31`/`53e579b` are two small follow-ups before the
checkpoint), the auth-gate suite (`80e59c0`..`86501e3`), and a
footer/LandingFAQ layout rebuild (`0e7b91d`..`03ddb06`). Verdicts from
reading the diffs:

- `cde84c4` "Removed em dashes and AI idioms" (46 files): prose copy only.
  Inspected via the first-parent diff (it is a checkpoint merge, so a plain
  `git show` hides its content): `MovementRead.tsx` IS among the modified
  files — 9 lines of comment and sentence punctuation (em dashes in prose
  became colons/commas) — but every `—` data placeholder is unchanged, and
  `MovementRead.test.tsx`'s null-does-not-coerce-to-0% fence still passes.
  `format.ts` and `primitives/index.tsx` are untouched. The
  unavailable-value em-dash convention is intact.
- `3fd05f3` "Added retry for API errors" + `WidgetState.tsx`: clean. Explicit
  loading/auth/error branches, a visible error with a Retry action, no
  fabricated values, and it shipped with `WidgetState.test.ts`.
- `191a2cf` "Guarded flat sparklines": hides missing/short/constant series
  instead of fabricating a flat line, with unit tests
  (`MostActiveBar.test.tsx`) pinning the rejection cases.
- `80e59c0` "Work in progress" ships `src/lib/authGate.ts` together with
  its own `authGate.test.ts`, plus page wiring; the follow-up commits
  complete the UI suite (sign-in empty states, CTA banner, WidgetState
  retry with `WidgetState.test.ts`, auth indicator). `authedFetch.test.ts`
  arrived later in `d3cef29` (#34), outside this Lovable range. Only nit: a
  WIP-titled commit on the connected branch.
- The admin data-management and Settings-tab batches were reconciled with
  the test suite in PR #40 (tabbed admin specs, Settings spec, reports spec
  rewrite); role-based auth then superseded the admin token gate via #34.
- E2E/unit state on this exact tree (`35f0f4d`): 198/198 Playwright,
  328/328 Vitest, verified green on PR #40's CI before merge.
