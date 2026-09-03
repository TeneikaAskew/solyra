import { describe, expect, it } from 'vitest';
import { groupReportsByPhase, type ReportEntry } from './reports';

const r = (phase: string): ReportEntry => ({
  phase,
  filename: `${phase}_iwm.md`,
  path: `reports/${phase}_iwm.md`,
});

describe('groupReportsByPhase', () => {
  it('groups variants under their numeric phase and sorts phases ascending', () => {
    const groups = groupReportsByPhase([
      r('phase6_playbook'),
      r('phase1_strat_mining'),
      r('phase6_playbook_combined'),
      r('phase5d_cross_ticker'),
    ]);
    expect(groups.map(g => g.phaseNum)).toEqual([1, 5, 6]);
    expect(groups[2].reports.map(x => x.phase)).toEqual([
      'phase6_playbook',
      'phase6_playbook_combined',
    ]);
  });

  it('sorts unparseable phases last without dropping them', () => {
    const groups = groupReportsByPhase([r('custom_notes'), r('phase2_indicator_confirm')]);
    expect(groups.map(g => g.phaseNum)).toEqual([2, null]);
    expect(groups[1].reports[0].phase).toBe('custom_notes');
  });

  it('returns an empty list for no reports', () => {
    expect(groupReportsByPhase([])).toEqual([]);
  });
});
