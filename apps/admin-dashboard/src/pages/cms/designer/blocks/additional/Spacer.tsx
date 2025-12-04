/**
 * Additional Block - Spacer
 *
 * Vertical spacing / gap
 */

export interface SpacerProps {
  height?: number;
  showInDesigner?: boolean;
}

export default function Spacer({
  height = 40,
  showInDesigner = true,
}: SpacerProps) {
  return (
    <div
      style={{ height: `${height}px` }}
      className={showInDesigner ? 'border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400' : ''}
    >
      {showInDesigner && `${height}px`}
    </div>
  );
}
