/**
 * API base URL 해석 — WO-O4O-COLLABORATOR-LOCAL-DEV-SAFETY-AND-SETUP-ALIGNMENT-V1
 *
 * 로컬 dev server 가 env 누락으로 운영 API 에 붙지 않는지, 명시값과 production build 의미가 보존되는지 고정한다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  LOCAL_DEV_API_BASE_URL,
  PRODUCTION_API_BASE_URL,
  resolveApiBaseUrl,
} from '../apiBaseUrl';

describe('resolveApiBaseUrl', () => {
  it('dev server + env 미설정 → 로컬 API (운영 API 아님)', () => {
    const url = resolveApiBaseUrl({ DEV: true });
    expect(url).toBe(LOCAL_DEV_API_BASE_URL);
    expect(url).not.toBe(PRODUCTION_API_BASE_URL);
    expect(new URL(url).hostname).toBe('localhost');
  });

  it('빈 문자열 env 는 미설정으로 본다', () => {
    expect(resolveApiBaseUrl({ DEV: true, VITE_API_BASE_URL: '', VITE_API_URL: '' })).toBe(LOCAL_DEV_API_BASE_URL);
  });

  it('명시값 우선 — VITE_API_BASE_URL → VITE_API_URL', () => {
    expect(resolveApiBaseUrl({ DEV: true, VITE_API_BASE_URL: 'http://localhost:4444' })).toBe('http://localhost:4444');
    expect(resolveApiBaseUrl({ DEV: true, VITE_API_URL: 'http://localhost:5555' })).toBe('http://localhost:5555');
    expect(
      resolveApiBaseUrl({ DEV: true, VITE_API_BASE_URL: 'http://a.test', VITE_API_URL: 'http://b.test' }),
    ).toBe('http://a.test');
  });

  it('production build — 기존 의미 보존', () => {
    expect(resolveApiBaseUrl({ DEV: false })).toBe('https://api.neture.co.kr');
    expect(resolveApiBaseUrl({})).toBe('https://api.neture.co.kr');
    expect(resolveApiBaseUrl({ DEV: false, VITE_API_BASE_URL: 'https://api.neture.co.kr' })).toBe(
      'https://api.neture.co.kr',
    );
  });

  it('로컬 기본 포트 = apps/api-server/.env.example PORT', () => {
    const example = readFileSync(resolve(__dirname, '../../../../../apps/api-server/.env.example'), 'utf8');
    const port = example.match(/^PORT=(\d+)/m)?.[1];
    expect(port).toBeDefined();
    expect(new URL(LOCAL_DEV_API_BASE_URL).port).toBe(port);
  });

  it('vite.config.ts dev server 주입값 = LOCAL_DEV_API_BASE_URL (공통 package fallback 차단)', () => {
    const src = readFileSync(resolve(__dirname, '../../../vite.config.ts'), 'utf8');
    expect(src).toContain(`const LOCAL_DEV_API_BASE_URL = '${LOCAL_DEV_API_BASE_URL}'`);
    expect(src).toContain("command === 'serve'");
  });

  it('apiClient 는 resolveApiBaseUrl 만 사용한다 (운영 URL 하드코딩 fallback 금지)', () => {
    const src = readFileSync(resolve(__dirname, '../apiClient.ts'), 'utf8');
    expect(src).toContain('resolveApiBaseUrl(import.meta.env)');
    expect(src).not.toContain('api.neture.co.kr');
  });
});
