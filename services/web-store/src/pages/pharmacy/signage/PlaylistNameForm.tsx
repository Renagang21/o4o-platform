import { useId, useState } from "react";
import type { StorePlaylist } from "../../../api/storePlaylist";

export function PlaylistNameForm({
  playlist,
  busy,
  onSave,
}: Readonly<{
  playlist: StorePlaylist;
  busy: boolean;
  onSave: (playlist: StorePlaylist, name: string) => Promise<void>;
}>) {
  const id = useId(),
    [name, setName] = useState(playlist.name);
  return (
    <details className="border-b p-4">
      <summary className="min-h-11 cursor-pointer">재생목록 이름 수정</summary>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) void onSave(playlist, name);
        }}
      >
        <label htmlFor={id}>재생목록 이름</label>
        <input
          id={id}
          value={name}
          maxLength={255}
          required
          onChange={(event) => setName(event.target.value)}
          className="min-h-11 rounded border px-3"
        />
        <button
          type="submit"
          disabled={busy || !name.trim() || name.trim() === playlist.name}
          className="min-h-11 rounded border bg-white px-3"
        >
          이름 저장
        </button>
      </form>
    </details>
  );
}
