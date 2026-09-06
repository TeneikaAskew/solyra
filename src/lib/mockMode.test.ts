// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  autoEnableMockModeForDev,
  isMockModeActive,
  mockModePreference,
  setMockMode,
} from './mockMode';

const reload = vi.fn();

beforeEach(() => {
  localStorage.clear();
  reload.mockClear();
  // jsdom's location.reload is "not implemented"; replace the whole object
  // so setMockMode's reload is observable instead of noisy.
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload },
    writable: true,
  });
});

describe('mock mode preference (tri-state)', () => {
  it('is unset by default and inactive', () => {
    expect(mockModePreference()).toBeNull();
    expect(isMockModeActive()).toBe(false);
  });

  it('setMockMode(true) persists and reloads', () => {
    setMockMode(true);
    expect(localStorage.getItem('solyra-mock-mode')).toBe('on');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(isMockModeActive()).toBe(true);
  });

  it('setMockMode(false) persists the explicit exit', () => {
    setMockMode(false);
    expect(mockModePreference()).toBe('off');
    expect(isMockModeActive()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('garbage in storage reads as unset, not as a mode', () => {
    localStorage.setItem('solyra-mock-mode', 'banana');
    expect(mockModePreference()).toBeNull();
    expect(isMockModeActive()).toBe(false);
  });
});

describe('dev-role auto-enable', () => {
  it('enables once while the preference is unset', () => {
    expect(autoEnableMockModeForDev()).toBe(true);
    expect(mockModePreference()).toBe('on');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('never overrides an explicit exit', () => {
    setMockMode(false);
    reload.mockClear();
    expect(autoEnableMockModeForDev()).toBe(false);
    expect(mockModePreference()).toBe('off');
    expect(reload).not.toHaveBeenCalled();
  });

  it('no-ops when already on', () => {
    setMockMode(true);
    reload.mockClear();
    expect(autoEnableMockModeForDev()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
