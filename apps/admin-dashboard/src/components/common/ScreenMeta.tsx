import { FC, ReactNode } from 'react';
import ScreenOptions from './ScreenOptions';
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
  additionalOptions?: ReactNode;
}

/**
 * WordPress-style Screen Meta component that combines Screen Options and Help Tab
 */
export const ScreenMeta: FC<ScreenMetaProps> = (props) => {
  // Convert props to ScreenOptions format
  const screenOptions = props.columns?.map(col => ({
    id: col.id,
    label: col.label,
    checked: col.checked,
    type: 'checkbox' as const
  })) || [];

  const handleOptionsChange = (newOptions: any[]) => {
    newOptions.forEach(opt => {
      if (props.onColumnChange) {
        props.onColumnChange(opt.id, opt.checked);
      }
    });
  };

  return (
    <div id="screen-meta" className="metabox-prefs">
      <div id="screen-meta-links">
        <div className="screen-options-and-help-container">
          <HelpTab />
          <ScreenOptions 
            options={screenOptions}
            onOptionsChange={handleOptionsChange}
            itemsPerPage={props.itemsPerPage}
            onItemsPerPageChange={props.onItemsPerPageChange}
          />
        </div>
      </div>
    </div>
  );
};