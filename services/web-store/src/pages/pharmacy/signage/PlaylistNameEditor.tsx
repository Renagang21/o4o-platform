import { useEffect, useState } from 'react';
import type { StorePlaylist } from '../../../api/storePlaylist';

export function PlaylistNameEditor({ playlist, busy, onSave }: { playlist: StorePlaylist; busy: boolean; onSave: (playlist: StorePlaylist, name: string, tags?: string[]) => unknown }) {
  const [tags, setTags] = useState((playlist.tags ?? []).join(', '));
  const parsedTags = [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))];
  const tagsChanged = JSON.stringify(parsedTags) !== JSON.stringify(playlist.tags ?? []);
  useEffect(() => setTags((playlist.tags ?? []).join(', ')), [playlist.id, playlist.tags]);
  const [name, setName] = useState(playlist.name);
  useEffect(() => setName(playlist.name), [playlist.id, playlist.name]);
  return <form aria-label="재생목록 이름 수정" className="flex flex-wrap items-center gap-2 border-b p-4" onSubmit={event => { event.preventDefault(); if (!busy && name.trim() && (name.trim() !== playlist.name || tagsChanged)) void (tagsChanged ? onSave(playlist, name, parsedTags) : onSave(playlist, name)); }}>
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">재생목록 이름<input className="min-h-11 rounded-lg border px-3" maxLength={255} value={name} disabled={busy} onChange={event => setName(event.target.value)} /></label>
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">태그<input aria-label="재생목록 태그 수정" className="min-h-11 rounded-lg border px-3" value={tags} disabled={busy} onChange={event => setTags(event.target.value)} /></label>
    <button type="submit" className="min-h-11 rounded-lg border px-3 text-sm disabled:opacity-50" disabled={busy || !name.trim() || (name.trim() === playlist.name && !tagsChanged)}>이름 저장</button>
  </form>;
}
