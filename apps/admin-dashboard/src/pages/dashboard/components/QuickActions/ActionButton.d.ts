interface ActionButtonProps {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'indigo' | 'gray' | 'yellow';
    href: string;
    badge?: number | null;
    disabled?: boolean;
    highlight?: boolean;
    tooltip?: string;
}
declare const ActionButton: React.FC<ActionButtonProps>;
export default ActionButton;
//# sourceMappingURL=ActionButton.d.ts.map