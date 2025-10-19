import {
  require_jsx_runtime
} from "./chunk-AVCP2MUZ.js";
import {
  require_react
} from "./chunk-SB6OIMPW.js";
import {
  __toESM
} from "./chunk-OL46QLBJ.js";

// ../../packages/ui/dist/index.js
var import_jsx_runtime = __toESM(require_jsx_runtime());
var import_react = __toESM(require_react());
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
var Card = (0, import_react.forwardRef)(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("div", { ref, className: cn("rounded-lg border bg-card text-card-foreground shadow-sm", className), ...props }));
Card.displayName = "Card";
var CardHeader = (0, import_react.forwardRef)(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("div", { ref, className: cn("flex flex-col space-y-1.5 p-6", className), ...props }));
CardHeader.displayName = "CardHeader";
var CardTitle = (0, import_react.forwardRef)(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("h3", { ref, className: cn("text-2xl font-semibold leading-none tracking-tight", className), ...props }));
CardTitle.displayName = "CardTitle";
var CardDescription = (0, import_react.forwardRef)(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("p", { ref, className: cn("text-sm text-muted-foreground", className), ...props }));
CardDescription.displayName = "CardDescription";
var CardContent = (0, import_react.forwardRef)(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("div", { ref, className: cn("p-6 pt-0", className), ...props }));
CardContent.displayName = "CardContent";
var CardFooter = (0, import_react.forwardRef)(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("div", { ref, className: cn("flex items-center p-6 pt-0", className), ...props }));
CardFooter.displayName = "CardFooter";
var getVariantClasses = (variant = "default") => {
  const variants = {
    default: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:from-blue-700 hover:to-blue-800 hover:shadow-lg focus-visible:ring-blue-500",
    destructive: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md hover:from-red-700 hover:to-red-800 hover:shadow-lg focus-visible:ring-red-500",
    outline: "border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-500",
    secondary: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 shadow-sm hover:from-gray-200 hover:to-gray-300 focus-visible:ring-gray-500",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500",
    link: "text-blue-600 underline-offset-4 hover:underline hover:text-blue-800 focus-visible:ring-blue-500",
    primary: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:from-blue-700 hover:to-blue-800 hover:shadow-lg transform hover:-translate-y-0.5 focus-visible:ring-blue-500",
    success: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md hover:from-green-700 hover:to-green-800 hover:shadow-lg focus-visible:ring-green-500"
  };
  return variants[variant];
};
var getSizeClasses = (size = "default") => {
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-12 rounded-md px-8 text-base",
    icon: "h-10 w-10"
  };
  return sizes[size];
};
var Button = (0, import_react.forwardRef)(({ className, variant = "default", size = "default", ...props }, ref) => {
  return (0, import_jsx_runtime.jsx)("button", { className: cn("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform active:scale-95", getVariantClasses(variant), getSizeClasses(size), className), ref, ...props });
});
Button.displayName = "Button";
var Alert = (0, import_react.forwardRef)(({ className, variant = "default", ...props }, ref) => (0, import_jsx_runtime.jsx)("div", { ref, role: "alert", className: cn("relative w-full rounded-lg border p-4", variant === "default" && "bg-background text-foreground", variant === "destructive" && "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive", className), ...props }));
Alert.displayName = "Alert";
var AlertTitle = (0, import_react.forwardRef)(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("h5", { ref, className: cn("mb-1 font-medium leading-none tracking-tight", className), ...props }));
AlertTitle.displayName = "AlertTitle";
var AlertDescription = (0, import_react.forwardRef)(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("div", { ref, className: cn("text-sm [&_p]:leading-relaxed", className), ...props }));
AlertDescription.displayName = "AlertDescription";
var Input = (0, import_react.forwardRef)(({ className, type, ...props }, ref) => {
  return (0, import_jsx_runtime.jsx)("input", { type, className: cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className), ref, ...props });
});
Input.displayName = "Input";
var Label = (0, import_react.forwardRef)(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("label", { ref, className: cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className), ...props }));
Label.displayName = "Label";
var badgeVariants = {
  default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
  outline: "text-foreground"
};
var Badge = (0, import_react.forwardRef)(({ className, variant = "default", ...props }, ref) => {
  return (0, import_jsx_runtime.jsx)("div", { ref, className: cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", badgeVariants[variant], className), ...props });
});
Badge.displayName = "Badge";
var Textarea = import_react.default.forwardRef(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("textarea", { ref, className: cn("flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className), ...props }));
Textarea.displayName = "Textarea";
var Select = import_react.default.forwardRef(({ className, children, ...props }, ref) => (0, import_jsx_runtime.jsx)("select", { ref, className: cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className), ...props, children }));
Select.displayName = "Select";
var Skeleton = ({ className, ...props }) => (0, import_jsx_runtime.jsx)("div", { className: cn("animate-pulse rounded-md bg-gray-200 dark:bg-gray-800", className), ...props });
var Tabs = import_react.default.forwardRef(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("div", { ref, className: cn(className), ...props }));
Tabs.displayName = "Tabs";
var TabsList = import_react.default.forwardRef(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("div", { ref, className: cn("flex gap-2", className), ...props }));
TabsList.displayName = "TabsList";
var TabsTrigger = import_react.default.forwardRef(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("button", { ref, className: cn("inline-flex items-center justify-center whitespace-nowrap rounded-md border px-3 py-1 text-sm", className), ...props }));
TabsTrigger.displayName = "TabsTrigger";
var TabsContent = import_react.default.forwardRef(({ className, ...props }, ref) => (0, import_jsx_runtime.jsx)("div", { ref, className: cn(className), ...props }));
TabsContent.displayName = "TabsContent";
export {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea
};
//# sourceMappingURL=@o4o_ui.js.map
