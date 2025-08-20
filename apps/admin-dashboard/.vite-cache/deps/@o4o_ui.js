import {
  require_jsx_runtime
} from "./chunk-ICGLOU7J.js";
import {
  require_react
} from "./chunk-Q5GEKUFB.js";
import {
  __toESM
} from "./chunk-G3PMV62Z.js";

// ../../packages/ui/dist/components.js
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var import_react = __toESM(require_react(), 1);
var Button = ({ variant = "primary", size = "md", className = "", children, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    default: "bg-primary text-primary-foreground hover:bg-primary/90"
  };
  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 py-2 px-4",
    lg: "h-11 px-8",
    icon: "h-10 w-10 p-0"
  };
  return (0, import_jsx_runtime.jsx)("button", { className: `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`, ...props, children });
};
var Input = ({ className = "", error, ...props }) => {
  return (0, import_jsx_runtime.jsxs)("div", { className: "space-y-1", children: [(0, import_jsx_runtime.jsx)("input", { className: `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-red-500" : ""} ${className}`, ...props }), error && (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-red-500", children: error })] });
};
var Card = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `rounded-lg border bg-card text-card-foreground shadow-sm ${className}`, ...props, children });
};
var CardHeader = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `flex flex-col space-y-1.5 p-6 ${className}`, ...props, children });
};
var CardContent = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `p-6 pt-0 ${className}`, ...props, children });
};
var CardTitle = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("h3", { className: `text-2xl font-semibold leading-none tracking-tight ${className}`, ...props, children });
};
var CardDescription = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("p", { className: `text-sm text-muted-foreground ${className}`, ...props, children });
};
var CardFooter = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `flex items-center p-6 pt-0 ${className}`, ...props, children });
};
var Label = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("label", { className: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`, ...props, children });
};
var Badge = ({ variant = "default", className = "", children, ...props }) => {
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border border-input hover:bg-accent hover:text-accent-foreground"
  };
  return (0, import_jsx_runtime.jsx)("span", { className: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses[variant]} ${className}`, ...props, children });
};
var Checkbox = ({ className = "", onCheckedChange, ...props }) => {
  return (0, import_jsx_runtime.jsx)("input", { type: "checkbox", className: `h-4 w-4 rounded border border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`, onChange: (e) => onCheckedChange?.(e.target.checked), ...props });
};
var Textarea = ({ className = "", ...props }) => {
  return (0, import_jsx_runtime.jsx)("textarea", { className: `flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`, ...props });
};
var Select = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("select", { className: `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`, ...props, children });
};
var RadioGroup = ({ className = "", value, onValueChange, name, children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `grid gap-2 ${className}`, "data-value": value, "data-name": name, ...props, children });
};
var RadioGroupItem = ({ className = "", ...props }) => {
  return (0, import_jsx_runtime.jsx)("input", { type: "radio", className: `h-4 w-4 rounded-full border border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`, ...props });
};
var Tabs = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `${className}`, ...props, children });
};
var TabsList = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`, ...props, children });
};
var TabsTrigger = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("button", { className: `inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm ${className}`, ...props, children });
};
var TabsContent = ({ className = "", children, value, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`, "data-value": value, ...props, children });
};
var Slider = ({ className = "", ...props }) => {
  return (0, import_jsx_runtime.jsx)("input", { type: "range", className: `w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${className}`, ...props });
};
var Progress = ({ className = "", value = 0, max = 100, ...props }) => {
  const percentage = Math.min(100, Math.max(0, value / max * 100));
  return (0, import_jsx_runtime.jsx)("div", { className: `relative h-4 w-full overflow-hidden rounded-full bg-secondary ${className}`, ...props, children: (0, import_jsx_runtime.jsx)("div", { className: "h-full w-full flex-1 bg-primary transition-all", style: { transform: `translateX(-${100 - percentage}%)` } }) });
};
var Skeleton = ({ className = "", ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `animate-pulse rounded-md bg-muted ${className}`, ...props });
};
var Alert = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { role: "alert", className: `relative w-full rounded-lg border p-4 ${className}`, ...props, children });
};
var AlertDescription = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `text-sm [&_p]:leading-relaxed ${className}`, ...props, children });
};
var DropdownMenu = ({ children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: "relative inline-block text-left", ...props, children });
};
var DropdownMenuTrigger = ({ children, asChild, ...props }) => {
  if (asChild && (0, import_react.isValidElement)(children)) {
    return (0, import_react.cloneElement)(children, props);
  }
  return (0, import_jsx_runtime.jsx)("button", { ...props, children });
};
var DropdownMenuContent = ({ className = "", align = "center", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md ${className}`, ...props, children });
};
var DropdownMenuItem = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${className}`, ...props, children });
};
var SelectTrigger = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("button", { className: `flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`, ...props, children });
};
var SelectValue = ({ placeholder }) => {
  return (0, import_jsx_runtime.jsx)("span", { children: placeholder || "Select..." });
};
var SelectContent = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md ${className}`, ...props, children });
};
var SelectItem = ({ className = "", children, value, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${className}`, "data-value": value, ...props, children });
};
var ToggleGroup = ({ className = "", type = "single", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `inline-flex rounded-md shadow-sm ${className}`, role: "group", ...props, children });
};
var ToggleGroupItem = ({ className = "", value, children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("button", { type: "button", className: `inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 ${className}`, "data-value": value, ...props, children });
};
var Dialog = ({ open = false, children, ...props }) => {
  if (!open)
    return null;
  return (0, import_jsx_runtime.jsxs)("div", { className: "fixed inset-0 z-50", ...props, children: [(0, import_jsx_runtime.jsx)("div", { className: "fixed inset-0 bg-black/50" }), children] });
};
var DialogContent = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]", children: (0, import_jsx_runtime.jsx)("div", { className: `max-h-[85vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-lg ${className}`, ...props, children }) });
};
var DialogHeader = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("div", { className: `flex flex-col space-y-1.5 text-center sm:text-left ${className}`, ...props, children });
};
var DialogTitle = ({ className = "", children, ...props }) => {
  return (0, import_jsx_runtime.jsx)("h2", { className: `text-lg font-semibold leading-none tracking-tight ${className}`, ...props, children });
};
var DialogTrigger = ({ children, asChild, ...props }) => {
  if (asChild && (0, import_react.isValidElement)(children)) {
    return (0, import_react.cloneElement)(children, props);
  }
  return (0, import_jsx_runtime.jsx)("button", { ...props, children });
};

// ../../packages/ui/dist/components/SocialLoginButtons.js
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var SocialLoginButtons = ({ onSocialLogin, disabled = false, showLabels = true, size = "medium" }) => {
  const baseUrl = "/api/v1";
  const handleSocialLogin = (provider) => {
    if (onSocialLogin) {
      onSocialLogin(provider);
    }
    window.location.href = `${baseUrl}/auth/${provider}`;
  };
  const sizeClasses = {
    small: "px-3 py-1.5 text-sm",
    medium: "px-4 py-2",
    large: "px-6 py-3 text-lg"
  };
  const iconSizes = {
    small: "w-4 h-4",
    medium: "w-5 h-5",
    large: "w-6 h-6"
  };
  return (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-3", children: [(0, import_jsx_runtime2.jsxs)("button", { onClick: () => handleSocialLogin("google"), disabled, className: `w-full flex items-center justify-center gap-3 ${sizeClasses[size]} bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`, children: [(0, import_jsx_runtime2.jsxs)("svg", { className: iconSizes[size], viewBox: "0 0 24 24", children: [(0, import_jsx_runtime2.jsx)("path", { fill: "#4285F4", d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" }), (0, import_jsx_runtime2.jsx)("path", { fill: "#34A853", d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" }), (0, import_jsx_runtime2.jsx)("path", { fill: "#FBBC05", d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" }), (0, import_jsx_runtime2.jsx)("path", { fill: "#EA4335", d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" })] }), showLabels && (0, import_jsx_runtime2.jsx)("span", { className: "text-gray-700", children: "Google로 로그인" })] }), (0, import_jsx_runtime2.jsxs)("button", { onClick: () => handleSocialLogin("kakao"), disabled, className: `w-full flex items-center justify-center gap-3 ${sizeClasses[size]} bg-[#FEE500] rounded-lg shadow-sm hover:bg-[#FDD835] disabled:opacity-50 disabled:cursor-not-allowed transition-colors`, children: [(0, import_jsx_runtime2.jsx)("svg", { className: iconSizes[size], viewBox: "0 0 24 24", children: (0, import_jsx_runtime2.jsx)("path", { fill: "#000000", d: "M12 3c-5.52 0-10 3.432-10 7.66 0 2.742 1.882 5.146 4.71 6.507l-.968 3.534c-.062.227.102.463.34.494.067.008.134 0 .197-.023l4.299-2.853c.472.05.945.075 1.422.075 5.52 0 10-3.432 10-7.66S17.52 3 12 3z" }) }), showLabels && (0, import_jsx_runtime2.jsx)("span", { className: "text-black/85", children: "카카오로 로그인" })] }), (0, import_jsx_runtime2.jsxs)("button", { onClick: () => handleSocialLogin("naver"), disabled, className: `w-full flex items-center justify-center gap-3 ${sizeClasses[size]} bg-[#03C75A] rounded-lg shadow-sm hover:bg-[#02B350] disabled:opacity-50 disabled:cursor-not-allowed transition-colors`, children: [(0, import_jsx_runtime2.jsx)("svg", { className: iconSizes[size], viewBox: "0 0 24 24", children: (0, import_jsx_runtime2.jsx)("path", { fill: "#FFFFFF", d: "M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" }) }), showLabels && (0, import_jsx_runtime2.jsx)("span", { className: "text-white", children: "네이버로 로그인" })] })] });
};
export {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Progress,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Slider,
  SocialLoginButtons,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ToggleGroup,
  ToggleGroupItem
};
//# sourceMappingURL=@o4o_ui.js.map
