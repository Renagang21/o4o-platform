import { useRef, useState } from "react";
import { ActionBar, BaseTable, type Column } from "@o4o/ui";

type Props<T extends { id: string }> = {
  columns: Column<T>[];
  dataSource: T[];
  rowKey: "id";
  loading?: boolean;
  emptyText?: string;
  selectionKey: string;
  onRow?: (row: T) => { onClick?: () => void; className?: string };
  actions: Array<{
    key: string;
    label: string;
    onSelect: (row: T) => unknown;
    disabled?: (row: T) => boolean;
  }>;
};

/** Service adapter for existing columns; selection and the action bar use the canonical BaseTable. */
export function SignageSelectionTable<T extends { id: string }>(
  props: Readonly<Props<T>>,
) {
  return (
    <SelectionSession
      key={`${props.selectionKey}:${props.dataSource.map((row) => row.id).join(",")}`}
      {...props}
    />
  );
}
function SelectionSession<T extends { id: string }>({
  columns,
  dataSource,
  loading,
  emptyText,
  onRow,
  actions,
}: Readonly<Props<T>>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const locked = useRef(false);
  const row =
    selected.size === 1
      ? dataSource.find((item) => selected.has(item.id))
      : undefined;
  const execute = async (action: Props<T>["actions"][number]) => {
    if (!row || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await action.onSelect(row);
    } catch {
      setError("선택한 작업을 완료하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  if (loading) return <p role="status">목록을 불러오고 있습니다.</p>;
  return (
    <>
      <ActionBar
        selectedCount={selected.size}
        onClearSelection={() => {
          if (!busy) setSelected(new Set());
        }}
        actions={actions.map((action) => ({
          key: action.key,
          label: action.label,
          disabled: busy || !row || action.disabled?.(row),
          onClick: () => execute(action),
        }))}
        statusInfo={
          selected.size > 1 ? "한 항목을 선택해 작업하세요." : undefined
        }
      />
      {error && <p role="alert">{error}</p>}
      <BaseTable<T>
        data={dataSource}
        rowKey={(item) => item.id}
        selectable
        selectedKeys={selected}
        onSelectionChange={(value) => {
          if (!busy) setSelected(value);
        }}
        onRowClick={(item) => {
          if (!busy) onRow?.(item).onClick?.();
        }}
        rowClassName={(item) => onRow?.(item).className ?? ""}
        emptyMessage={emptyText}
        columns={[{ key: '_select', system: true, header: '', render: (_value, item) => <input type="checkbox" aria-label={`${item.id} 선택`} disabled={busy} checked={selected.has(item.id)} onClick={event => event.stopPropagation()} onChange={event => { const next = new Set(selected); if (event.target.checked) next.add(item.id); else next.delete(item.id); setSelected(next); }} /> }, ...columns.map((column) => ({
          key: column.key,
          header: column.title,
          align: column.align,
          render: (_value: unknown, item: T, index: number) => {
            let value: unknown = item;
            const fields = Array.isArray(column.dataIndex)
              ? column.dataIndex
              : [String(column.dataIndex ?? column.key)];
            for (const field of fields)
              value =
                value && typeof value === "object"
                  ? (value as Record<string, unknown>)[field]
                  : undefined;
            return column.render
              ? column.render(value, item, index)
              : String(value ?? "");
          },
        }))]}
      />
    </>
  );
}
