import { FC } from 'react';
import { ScreenOptions } from './ScreenOptions';
import { HelpTab } from './HelpTab';

interface ScreenMetaProps {
  // Screen Options props
  columns?: {
    id: string;
    label: string;
    checked: boolean;
  }[];
  itemsPerPage?: number;
  onColumnChange?: (columnId: string, checked: boolean) => void;
  onItemsPerPageChange?: (value: number) => void;
  additionalOptions?: React.ReactNode;
}

/**
 * WordPress-style Screen Meta component that combines Screen Options and Help Tab
 */
export const ScreenMeta: FC<ScreenMetaProps> = (props) => {
  return (
    <div id="screen-meta" className="metabox-prefs">
      <div id="screen-meta-links">
        <div className="screen-options-and-help-container">
          <HelpTab />
          <ScreenOptions {...props} />
        </div>
      </div>
    </div>
  );
};