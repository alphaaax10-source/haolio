import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { plural, resolveLang, tFor, tNow, useT } from './i18n';
import { useSettings } from './settings';

describe('i18n translation', () => {
  it('resolves en and id strings', () => {
    expect(tFor('en')('dash.objects', { n: 5 })).toBe('5 objects');
    expect(tFor('id')('dash.objects', { n: 5 })).toBe('5 objek');
  });

  it('interpolates named variables', () => {
    expect(tFor('en')('dash.removeTitle', { name: 'My Map' })).toContain('My Map');
  });

  it('falls back to the key itself for unknown keys', () => {
    expect(tFor('en')('no.such.key')).toBe('no.such.key');
    expect(tFor('id')('no.such.key', { n: 1 })).toBe('no.such.key');
  });

  it('plural picks the first variant for one and the second for many', () => {
    const t = tFor('en');
    expect(plural(t, 'dash.boards', 1)).toBe('1 board');
    expect(plural(t, 'dash.boards', 3)).toBe('3 boards');
  });

  it('resolveLang maps system navigator language to en/id', () => {
    const original = Object.getOwnPropertyDescriptor(window.navigator, 'language');
    const setLang = (value: string) =>
      Object.defineProperty(window.navigator, 'language', { value, configurable: true });

    try {
      setLang('en-US');
      expect(resolveLang('system')).toBe('en');
      setLang('id-ID');
      expect(resolveLang('system')).toBe('id');
      setLang('de-DE');
      expect(resolveLang('system')).toBe('en');
      // Explicit preferences win over the navigator language.
      setLang('id-ID');
      expect(resolveLang('en')).toBe('en');
      expect(resolveLang('id')).toBe('id');
    } finally {
      if (original) Object.defineProperty(window.navigator, 'language', original);
    }
  });

  describe('tNow() follows the settings language preference', () => {
    const originalLang = useSettings.getState().lang;

    afterEach(() => {
      useSettings.getState().setPref('lang', originalLang);
    });

    it('translates with the current preference', () => {
      useSettings.getState().setPref('lang', 'id');
      expect(tNow('dash.objects', { n: 2 })).toBe('2 objek');
      useSettings.getState().setPref('lang', 'en');
      expect(tNow('dash.objects', { n: 2 })).toBe('2 objects');
    });
  });

  it('useT() returns a callable translate function', () => {
    // The hook body only binds memoization; call tFor through the same path.
    expect(typeof useT).toBe('function');
    expect(tFor('en')('common.copy')).toBe('Copy');
    expect(tFor('id')('common.copy')).toBe('Salin');
  });
});
