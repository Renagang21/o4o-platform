declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  }
  
  export type Icon = FC<IconProps>;
  
  // Export all icons as Icon type
  export const Activity: Icon;
  export const AlertCircle: Icon;
  export const AlertTriangle: Icon;
  export const ArrowLeft: Icon;
  export const ArrowRight: Icon;
  export const Building: Icon;
  export const Calendar: Icon;
  export const Check: Icon;
  export const ChevronDown: Icon;
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const ChevronUp: Icon;
  export const Clock: Icon;
  export const Code: Icon;
  export const Columns: Icon;
  export const CreditCard: Icon;
  export const DollarSign: Icon;
  export const Download: Icon;
  export const Edit: Icon;
  export const Edit2: Icon;
  export const Eye: Icon;
  export const EyeOff: Icon;
  export const File: Icon;
  export const FileText: Icon;
  export const Filter: Icon;
  export const Globe: Icon;
  export const Grid: Icon;
  export const Heading1: Icon;
  export const Heart: Icon;
  export const Home: Icon;
  export const Image: Icon;
  export const Layout: Icon;
  export const LayoutDashboard: Icon;
  export const List: Icon;
  export const Lock: Icon;
  export const LogOut: Icon;
  export const Mail: Icon;
  export const MapPin: Icon;
  export const Maximize2: Icon;
  export const Menu: Icon;
  export const MinusSquare: Icon;
  export const Monitor: Icon;
  export const MoreHorizontal: Icon;
  export const MoreVertical: Icon;
  export const MousePointer: Icon;
  export const Package: Icon;
  export const Pause: Icon;
  export const PenTool: Icon;
  export const Play: Icon;
  export const Plus: Icon;
  export const Printer: Icon;
  export const Quote: Icon;
  export const RefreshCw: Icon;
  export const Save: Icon;
  export const Search: Icon;
  export const Settings: Icon;
  export const Share2: Icon;
  export const Shield: Icon;
  export const ShoppingBag: Icon;
  export const ShoppingCart: Icon;
  export const Smartphone: Icon;
  export const Square: Icon;
  export const Star: Icon;
  export const Table: Icon;
  export const Tag: Icon;
  export const Target: Icon;
  export const Trash: Icon;
  export const Trash2: Icon;
  export const Truck: Icon;
  export const Tv: Icon;
  export const Type: Icon;
  export const Upload: Icon;
  export const User: Icon;
  export const Users: Icon;
  export const Video: Icon;
  export const Wallet: Icon;
  export const WalletCards: Icon;
  export const X: Icon;
  export const Zap: Icon;
  
  // Add any other icons as needed
  const icons: Record<string, Icon>;
  export default icons;
}