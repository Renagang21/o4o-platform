/**
 * StoreSettingsPage — K-Cosmetics 매장 설정
 *
 * WO-STORE-COMMON-SETTINGS-KCOS-UI-V1
 *
 * 공통 Store Settings Foundation API 기반 신규 구현.
 *
 * GET  /cosmetics/stores/:slug/settings  → template/theme/blocks + channels
 * PATCH /cosmetics/stores/:slug/settings → blocks/template/theme 저장
 * GET  /cosmetics/stores/:slug/channels  → channel 목록
 * PATCH /cosmetics/stores/:slug/channels/:type → channel config 저장
 *
 * 3-Section 구조:
 *  1. 기본 정보 (read-only)
 *  2. 채널 설정 (config 편집 + status 표시)
 *  3. 레이아웃 편집 + iframe 미리보기
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Save, Globe, Monitor, Tablet, Smartphone,
  ExternalLink, ChevronUp, ChevronDown, RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/apiClient';
import { fetchChannelOverviewWithCode, type ChannelOverview, type ChannelStatus } from '@/api/storeHub';
import { StoreBlockRegistry, type StoreBlock, type StoreBlockType } from '@o4o/ui';

// ── Types ─────────────────────────────────────────────────────────────────────

type StoreTemplate = 'BASIC' | 'COMMERCE_FOCUS' | 'CONTENT_FOCUS' | 'MINIMAL';
type StoreTheme = 'professional' | 'neutral' | 'clean' | 'modern';
type PreviewDevice = 'B2C' | 'TABLET' | 'KIOSK';

interface StoreSettings {
  template: StoreTemplate;
  theme: StoreTheme;
  blocks: StoreBlock[];
}

interface ChannelConfigState {
  enabled: boolean;
  pin?: string;
  autoResetMinutes?: number;
  productLimit?: number;
  slideShowIntervalSeconds?: number;
  autoRotateSeconds?: number;
  visibilityMode?: 'PUBLIC' | 'PRIVATE';
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TEMPLATES: Array<{ id: StoreTemplate; name: string }> = [
  { id: 'BASIC', name: '기본형' },
  { id: 'COMMERCE_FOCUS', name: '상업 강조형' },
  { id: 'CONTENT_FOCUS', name: '콘텐츠 중심형' },
  { id: 'MINIMAL', name: '간결형' },
];

const THEMES: Array<{ id: StoreTheme; name: string; primary: string; accent: string }> = [
  { id: 'professional', name: '전문적', primary: '#1e40af', accent: '#3b82f6' },
  { id: 'neutral',      name: '중립적', primary: '#374151', accent: '#6b7280' },
  { id: 'clean',        name: '깔끔한', primary: '#0891b2', accent: '#06b6d4' },
  { id: 'modern',       name: '모던',   primary: '#0f172a', accent: '#475569' },
];

const CHANNEL_META: Record<string, { label: string; Icon: typeof Globe }> = {
  B2C:     { label: '온라인 스토어', Icon: Globe },
  KIOSK:   { label: '키오스크',     Icon: Monitor },
  TABLET:  { label: '태블릿',       Icon: Tablet },
  SIGNAGE: { label: '사이니지',     Icon: Smartphone },
};

const STATUS_CONFIG: Record<ChannelStatus, { label: string; cls: string }> = {
  APPROVED:   { label: '활성',   cls: 'bg-green-100 text-green-700' },
  PENDING:    { label: '승인 대기', cls: 'bg-amber-100 text-amber-700' },
  REJECTED:   { label: '거부',   cls: 'bg-red-100 text-red-700' },
  SUSPENDED:  { label: '정지',   cls: 'bg-slate-100 text-slate-600' },
  EXPIRED:    { label: '만료',   cls: 'bg-slate-100 text-slate-600' },
  TERMINATED: { label: '해지',   cls: 'bg-slate-100 text-slate-600' },
};

const DEVICE_TABS: Array<{ id: PreviewDevice; label: string; maxWidth: string }> = [
  { id: 'B2C',    label: 'Web',     maxWidth: '100%' },
  { id: 'TABLET', label: '태블릿', maxWidth: '280px' },
  { id: 'KIOSK',  label: '키오스크', maxWidth: '200px' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function StoreSettingsPage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [loadingSlug, setLoadingSlug] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [noStore, setNoStore] = useState(false);

  // Settings state
  const [template, setTemplate] = useState<StoreTemplate>('BASIC');
  const [theme, setTheme] = useState<StoreTheme>('professional');
  const [blocks, setBlocks] = useState<StoreBlock[]>([]);
  const [isDefaultLayout, setIsDefaultLayout] = useState(false);

  // Channel state (from common channels API)
  const [channels, setChannels] = useState<ChannelOverview[]>([]);
  const [channelConfigs, setChannelConfigs] = useState<Record<string, ChannelConfigState>>({});

  // UI state
  const [activeSection, setActiveSection] = useState<'info' | 'channels' | 'layout'>('info');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('B2C');
  const [saving, setSaving] = useState(false);
  const [savingChannel, setSavingChannel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Load slug from channel overview ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { organizationCode, channels: chs } = await fetchChannelOverviewWithCode();
        if (!organizationCode) { setNoStore(true); setLoadingSlug(false); return; }
        setSlug(organizationCode);
        setChannels(chs);
      } catch {
        setNoStore(true);
      } finally {
        setLoadingSlug(false);
      }
    })();
  }, []);

  // ── Load settings once slug is known ───────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    setLoadingSettings(true);
    (async () => {
      try {
        const res = await api.get<{
          success: boolean;
          data: {
            storeId: string;
            slug: string;
            settings: StoreSettings;
            channels: Array<{ id: string; type: string; status: string; config: any; approvedAt: string | null; createdAt: string }>;
          };
        }>(`/cosmetics/stores/${encodeURIComponent(slug)}/settings`);

        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          setOrgName(d.storeId); // storeId as fallback; name from hub separately
          setTemplate(d.settings.template);
          setTheme(d.settings.theme);
          setBlocks(d.settings.blocks ?? []);
          setIsDefaultLayout((d.settings.blocks ?? []).length === 0);

          // Seed channel configs from response
          const cfgMap: Record<string, ChannelConfigState> = {};
          for (const ch of d.channels) {
            cfgMap[ch.type] = { enabled: true, ...(ch.config ?? {}) };
          }
          setChannelConfigs(cfgMap);
        }
      } catch (e: any) {
        setError(e?.response?.data?.error?.message || e?.message || '설정을 불러오지 못했습니다');
      } finally {
        setLoadingSettings(false);
      }
    })();
  }, [slug]);

  // Load org name from store hub
  useEffect(() => {
    (async () => {
      try {
        const { fetchStoreHubOverview } = await import('@/api/storeHub');
        const overview = await fetchStoreHubOverview();
        if (overview?.organizationName) setOrgName(overview.organizationName);
      } catch { /* ignore */ }
    })();
  }, []);

  // ── Block editing ───────────────────────────────────────────────────────────
  const moveBlock = useCallback((index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setBlocks(updated);
  }, [blocks]);

  const toggleBlock = useCallback((index: number) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    setBlocks(updated);
  }, [blocks]);

  const updateBlockConfig = useCallback((index: number, key: string, value: number) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], config: { ...(updated[index].config ?? {}), [key]: value } };
    setBlocks(updated);
  }, [blocks]);

  const getBlockMeta = (type: StoreBlockType) => {
    const def = StoreBlockRegistry[type];
    return def
      ? { name: def.label, description: def.description, defaultConfig: def.defaultConfig }
      : { name: type, description: '', defaultConfig: {} };
  };

  // ── Save layout/theme/template ──────────────────────────────────────────────
  const handleSaveSettings = useCallback(async () => {
    if (!slug || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/cosmetics/stores/${encodeURIComponent(slug)}/settings`, {
        template,
        theme,
        blocks,
      });
      setIsDefaultLayout(false);
      showSuccess('레이아웃·디자인이 저장되었습니다');
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }, [slug, template, theme, blocks, saving]);

  // ── Save channel config ─────────────────────────────────────────────────────
  const handleSaveChannelConfig = useCallback(async (channelType: string) => {
    if (!slug) return;
    setSavingChannel(channelType);
    setError(null);
    try {
      const config = channelConfigs[channelType] ?? { enabled: true };
      await api.patch(
        `/cosmetics/stores/${encodeURIComponent(slug)}/channels/${channelType}`,
        config,
      );
      showSuccess(`${CHANNEL_META[channelType]?.label ?? channelType} 설정이 저장되었습니다`);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || '채널 설정 저장에 실패했습니다');
    } finally {
      setSavingChannel(null);
    }
  }, [slug, channelConfigs]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ── Early states ────────────────────────────────────────────────────────────
  if (loadingSlug) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (noStore) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">매장 설정</h1>
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <p className="text-slate-500">매장이 설정되지 않았습니다. 채널을 먼저 개설해주세요.</p>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">매장 설정</h1>
          {orgName && <p className="text-slate-500 text-sm mt-1">{orgName}</p>}
        </div>
        {slug && (
          <a
            href={`/tablet/${encodeURIComponent(slug)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-pink-600 hover:text-pink-700"
          >
            <ExternalLink className="w-4 h-4" />
            매장 보기
          </a>
        )}
      </div>

      {/* Error / Success */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">{successMsg}</div>
      )}

      {/* Section tabs */}
      <div className="flex gap-2">
        {(['info', 'channels', 'layout'] as const).map(sec => (
          <button
            key={sec}
            onClick={() => setActiveSection(sec)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeSection === sec
                ? 'bg-pink-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm'
            }`}
          >
            {{ info: '기본 정보', channels: '채널 설정', layout: '레이아웃 · 미리보기' }[sec]}
          </button>
        ))}
      </div>

      {/* ── Section 1: 기본 정보 ─────────────────────────────────── */}
      {activeSection === 'info' && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-3">기본 정보</h2>

          {loadingSettings ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">불러오는 중...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <InfoRow label="매장명" value={orgName || '-'} />
              <InfoRow label="매장 슬러그" value={slug ?? '-'} />
              <InfoRow label="등록된 채널" value={`${channels.length}개`} />
              <InfoRow label="승인된 채널" value={`${channels.filter(c => c.status === 'APPROVED').length}개`} />
            </div>
          )}
        </div>
      )}

      {/* ── Section 2: 채널 설정 ─────────────────────────────────── */}
      {activeSection === 'channels' && (
        <div className="space-y-4">
          {channels.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-slate-500 text-sm">
              등록된 채널이 없습니다. 채널 관리에서 채널을 생성해주세요.
            </div>
          ) : (
            channels.map(ch => {
              const meta = CHANNEL_META[ch.channelType] ?? { label: ch.channelType, Icon: Globe };
              const Icon = meta.Icon;
              const statusCfg = STATUS_CONFIG[ch.status] ?? { label: ch.status, cls: 'bg-slate-100 text-slate-600' };
              const cfg = channelConfigs[ch.channelType] ?? { enabled: ch.status === 'APPROVED' };
              const isApproved = ch.status === 'APPROVED';

              return (
                <div key={ch.id} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isApproved ? 'bg-pink-100' : 'bg-slate-100'}`}>
                        <Icon className={`w-5 h-5 ${isApproved ? 'text-pink-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{meta.label}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>
                    {ch.approvedAt && (
                      <span className="text-xs text-slate-400">
                        승인: {new Date(ch.approvedAt).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                  </div>

                  {/* Config — only shown for approved channels */}
                  {isApproved && (
                    <div className="border-t pt-4 space-y-3">
                      {/* KIOSK */}
                      {ch.channelType === 'KIOSK' && (
                        <>
                          <ConfigField
                            label="자동 리셋 (초)"
                            type="number"
                            value={cfg.autoResetMinutes ?? 180}
                            onChange={v => setChannelConfigs(prev => ({ ...prev, [ch.channelType]: { ...prev[ch.channelType], autoResetMinutes: v as number } }))}
                          />
                          <ConfigField
                            label="상품 수 제한"
                            type="number"
                            value={cfg.productLimit ?? 20}
                            onChange={v => setChannelConfigs(prev => ({ ...prev, [ch.channelType]: { ...prev[ch.channelType], productLimit: v as number } }))}
                          />
                          <ConfigField
                            label="PIN (선택)"
                            type="password"
                            value={cfg.pin ?? ''}
                            onChange={v => setChannelConfigs(prev => ({ ...prev, [ch.channelType]: { ...prev[ch.channelType], pin: v as string } }))}
                          />
                        </>
                      )}
                      {/* TABLET */}
                      {ch.channelType === 'TABLET' && (
                        <>
                          <ConfigField
                            label="자동 리셋 (초)"
                            type="number"
                            value={cfg.autoResetMinutes ?? 180}
                            onChange={v => setChannelConfigs(prev => ({ ...prev, [ch.channelType]: { ...prev[ch.channelType], autoResetMinutes: v as number } }))}
                          />
                          <ConfigField
                            label="슬라이드 전환 (초)"
                            type="number"
                            value={cfg.slideShowIntervalSeconds ?? 5}
                            onChange={v => setChannelConfigs(prev => ({ ...prev, [ch.channelType]: { ...prev[ch.channelType], slideShowIntervalSeconds: v as number } }))}
                          />
                          <ConfigField
                            label="PIN (선택)"
                            type="password"
                            value={cfg.pin ?? ''}
                            onChange={v => setChannelConfigs(prev => ({ ...prev, [ch.channelType]: { ...prev[ch.channelType], pin: v as string } }))}
                          />
                        </>
                      )}
                      {/* B2C */}
                      {ch.channelType === 'B2C' && (
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium text-slate-700 w-32">공개 여부</label>
                          <select
                            value={cfg.visibilityMode ?? 'PUBLIC'}
                            onChange={e => setChannelConfigs(prev => ({
                              ...prev,
                              [ch.channelType]: { ...prev[ch.channelType], visibilityMode: e.target.value as 'PUBLIC' | 'PRIVATE' },
                            }))}
                            className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                          >
                            <option value="PUBLIC">공개</option>
                            <option value="PRIVATE">비공개</option>
                          </select>
                        </div>
                      )}
                      {/* SIGNAGE */}
                      {ch.channelType === 'SIGNAGE' && (
                        <ConfigField
                          label="자동 전환 (초)"
                          type="number"
                          value={cfg.autoRotateSeconds ?? 10}
                          onChange={v => setChannelConfigs(prev => ({ ...prev, [ch.channelType]: { ...prev[ch.channelType], autoRotateSeconds: v as number } }))}
                        />
                      )}

                      <button
                        onClick={() => handleSaveChannelConfig(ch.channelType)}
                        disabled={savingChannel === ch.channelType}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-xl hover:bg-pink-700 transition-colors disabled:opacity-50"
                      >
                        {savingChannel === ch.channelType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {savingChannel === ch.channelType ? '저장 중...' : '설정 저장'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Section 3: 레이아웃 + 미리보기 ─────────────────────── */}
      {activeSection === 'layout' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Layout editor */}
          <div className="space-y-4">
            {/* Template & Theme */}
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
              <h3 className="font-semibold text-slate-800">디자인 설정</h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">레이아웃 템플릿</label>
                <select
                  value={template}
                  onChange={e => setTemplate(e.target.value as StoreTemplate)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
                >
                  {TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">색상 테마</label>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl border-2 text-left transition-colors ${
                        theme === t.id ? 'border-pink-500 bg-pink-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex gap-1">
                        <span className="w-5 h-5 rounded-full border border-white/50" style={{ backgroundColor: t.primary }} />
                        <span className="w-5 h-5 rounded-full border border-white/50" style={{ backgroundColor: t.accent }} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Block editor */}
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
              <h3 className="font-semibold text-slate-800">블록 구성</h3>

              {isDefaultLayout && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  기본 템플릿 레이아웃 사용 중입니다. 변경 후 저장하면 커스텀 레이아웃이 적용됩니다.
                </div>
              )}

              {loadingSettings ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />불러오는 중...
                </div>
              ) : blocks.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">블록 정보를 불러오는 중...</p>
              ) : (
                <div className="space-y-2">
                  {blocks.map((block, index) => {
                    const meta = getBlockMeta(block.type);
                    const hasLimit = block.type === 'PRODUCT_GRID' || block.type === 'BLOG_LIST';
                    const defaultLimit = (meta.defaultConfig as any).limit;

                    return (
                      <div
                        key={block.type}
                        className={`p-4 rounded-xl border transition-all ${
                          block.enabled
                            ? 'bg-white border-slate-200'
                            : 'bg-slate-50 border-slate-100 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Move buttons */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => moveBlock(index, -1)}
                              disabled={index === 0}
                              className="w-6 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 border border-slate-200 bg-white"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveBlock(index, 1)}
                              disabled={index === blocks.length - 1}
                              className="w-6 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 border border-slate-200 bg-white"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-slate-800">{meta.name}</span>
                              <span className="text-xs text-slate-400 font-mono">{block.type}</span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">{meta.description}</p>
                          </div>

                          {/* Toggle */}
                          <button
                            onClick={() => toggleBlock(index)}
                            className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                              block.enabled ? 'bg-pink-500' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                                block.enabled ? 'left-5' : 'left-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Limit config */}
                        {hasLimit && block.enabled && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                            <label className="text-xs text-slate-500">표시 개수</label>
                            <input
                              type="number" min={1} max={12}
                              value={block.config?.limit ?? defaultLimit ?? 4}
                              onChange={e => updateBlockConfig(index, 'limit', Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                              className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-xs text-center focus:outline-none focus:ring-1 focus:ring-pink-400"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={handleSaveSettings}
                disabled={saving || !slug}
                className="flex items-center justify-center gap-2 w-full py-3 bg-pink-600 text-white font-medium rounded-xl hover:bg-pink-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? '저장 중...' : '레이아웃 · 디자인 저장'}
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">미리보기</h3>
                {slug && (
                  <button
                    onClick={() => setPreviewDevice(d => {
                      const idx = DEVICE_TABS.findIndex(t => t.id === d);
                      return DEVICE_TABS[(idx + 1) % DEVICE_TABS.length].id;
                    })}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                    title="디바이스 전환"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                  </button>
                )}
              </div>

              {/* Device tab buttons */}
              <div className="flex gap-1">
                {DEVICE_TABS.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setPreviewDevice(d.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      previewDevice === d.id
                        ? 'bg-pink-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* iframe */}
              {slug ? (
                <div
                  style={{ maxWidth: DEVICE_TABS.find(d => d.id === previewDevice)?.maxWidth ?? '100%' }}
                  className="mx-auto overflow-hidden rounded-xl border border-slate-200"
                >
                  <iframe
                    key={`${slug}-${previewDevice}`}
                    src={`/tablet/${encodeURIComponent(slug)}`}
                    title="매장 미리보기"
                    className="w-full border-none block"
                    style={{ height: '500px' }}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">슬러그가 없어 미리보기를 표시할 수 없습니다.</div>
              )}

              {/* Open in new tab */}
              {slug && (
                <div className="text-center">
                  <a
                    href={`/tablet/${encodeURIComponent(slug)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-pink-600 hover:text-pink-700"
                  >
                    새 탭에서 매장 열기 →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helper components ────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

function ConfigField({
  label, type, value, onChange,
}: {
  label: string;
  type: 'number' | 'password' | 'text';
  value: string | number;
  onChange: (v: string | number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-slate-700 w-36 shrink-0">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value)}
        placeholder={type === 'password' ? '4자리 숫자' : undefined}
        maxLength={type === 'password' ? 4 : undefined}
        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
      />
    </div>
  );
}
