import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter, UNSAFE_withComponentProps, Outlet, UNSAFE_withErrorBoundaryProps, isRouteErrorResponse, Meta, Links, ScrollRestoration, Scripts } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import * as React from "react";
import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { X, Menu, Columns2, Grid2x2, Loader2, Play, User, Settings } from "lucide-react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as SheetPrimitive from "@radix-ui/react-dialog";
const streamTimeout = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, routerContext, loadContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    let userAgent = request.headers.get("user-agent");
    let readyOption = userAgent && isbot(userAgent) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";
    let timeoutId = setTimeout(
      () => abort(),
      streamTimeout + 1e3
    );
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(ServerRouter, { context: routerContext, url: request.url }),
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = void 0;
              callback();
            }
          });
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          pipe(body);
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
const links = () => [{
  rel: "preconnect",
  href: "https://fonts.googleapis.com"
}, {
  rel: "preconnect",
  href: "https://fonts.gstatic.com",
  crossOrigin: "anonymous"
}, {
  rel: "stylesheet",
  href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
}];
function Layout({
  children
}) {
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      children: [children, /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
}
const root = UNSAFE_withComponentProps(function App() {
  return /* @__PURE__ */ jsx(Outlet, {});
});
const ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2({
  error
}) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack;
  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  }
  return /* @__PURE__ */ jsxs("main", {
    className: "pt-16 p-4 container mx-auto",
    children: [/* @__PURE__ */ jsx("h1", {
      children: message
    }), /* @__PURE__ */ jsx("p", {
      children: details
    }), stack]
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  Layout,
  default: root,
  links
}, Symbol.toStringTag, { value: "Module" }));
function ClientOnly({ children, fallback = null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? /* @__PURE__ */ jsx(Fragment, { children: children() }) : /* @__PURE__ */ jsx(Fragment, { children: fallback });
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function Tabs({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.Root,
    {
      "data-slot": "tabs",
      className: cn("flex flex-col gap-2", className),
      ...props
    }
  );
}
function TabsList({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.List,
    {
      "data-slot": "tabs-list",
      className: cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      ),
      ...props
    }
  );
}
function TabsTrigger({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.Trigger,
    {
      "data-slot": "tabs-trigger",
      className: cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      ),
      ...props
    }
  );
}
function TabsContent({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.Content,
    {
      "data-slot": "tabs-content",
      className: cn("flex-1 outline-none", className),
      ...props
    }
  );
}
function Card({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "card",
      className: cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      ),
      ...props
    }
  );
}
function CardHeader({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "card-header",
      className: cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      ),
      ...props
    }
  );
}
function CardTitle({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "card-title",
      className: cn("leading-none font-semibold", className),
      ...props
    }
  );
}
function CardContent({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "card-content",
      className: cn("px-6", className),
      ...props
    }
  );
}
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      "data-slot": "button",
      className: cn(buttonVariants({ variant, size, className })),
      ...props
    }
  );
}
const Input = React.forwardRef(
  ({ className, type, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "input",
      {
        type,
        className: cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        ),
        ref,
        ...props
      }
    );
  }
);
Input.displayName = "Input";
const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);
const Label = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  LabelPrimitive.Root,
  {
    ref,
    className: cn(labelVariants(), className),
    ...props
  }
));
Label.displayName = LabelPrimitive.Root.displayName;
const Sheet = SheetPrimitive.Root;
const SheetPortal = SheetPrimitive.Portal;
const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Overlay,
  {
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props,
    ref
  }
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
      }
    },
    defaultVariants: {
      side: "right"
    }
  }
);
const SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SheetPortal, { children: [
  /* @__PURE__ */ jsx(SheetOverlay, {}),
  /* @__PURE__ */ jsxs(
    SheetPrimitive.Content,
    {
      ref,
      className: cn(sheetVariants({ side }), className),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxs(SheetPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary", children: [
          /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
        ] })
      ]
    }
  )
] }));
SheetContent.displayName = SheetPrimitive.Content.displayName;
const SheetHeader = ({
  className,
  ...props
}) => /* @__PURE__ */ jsx(
  "div",
  {
    className: cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    ),
    ...props
  }
);
SheetHeader.displayName = "SheetHeader";
const SheetTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Title,
  {
    ref,
    className: cn("text-lg font-semibold text-foreground", className),
    ...props
  }
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;
const Dialog = SheetPrimitive.Root;
const DialogPortal = SheetPrimitive.Portal;
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Overlay,
  {
    ref,
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props
  }
));
DialogOverlay.displayName = SheetPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(DialogPortal, { children: [
  /* @__PURE__ */ jsx(DialogOverlay, {}),
  /* @__PURE__ */ jsxs(
    SheetPrimitive.Content,
    {
      ref,
      className: cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxs(SheetPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground", children: [
          /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
        ] })
      ]
    }
  )
] }));
DialogContent.displayName = SheetPrimitive.Content.displayName;
const DialogHeader = ({
  className,
  ...props
}) => /* @__PURE__ */ jsx(
  "div",
  {
    className: cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    ),
    ...props
  }
);
DialogHeader.displayName = "DialogHeader";
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Title,
  {
    ref,
    className: cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    ),
    ...props
  }
));
DialogTitle.displayName = SheetPrimitive.Title.displayName;
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
DialogDescription.displayName = SheetPrimitive.Description.displayName;
const API_BASE_URL = "/api/v1";
class APIError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = "APIError";
  }
}
class APIKeyStore {
  static KEY = "benchr_api_key";
  static set(apiKey) {
    localStorage.setItem(this.KEY, apiKey);
  }
  static get() {
    return localStorage.getItem(this.KEY);
  }
  static remove() {
    localStorage.removeItem(this.KEY);
  }
}
async function authenticatedFetch(endpoint, options = {}) {
  const apiKey = APIKeyStore.get();
  if (!apiKey) {
    throw new APIError("No API key found. Please login again.", 401);
  }
  const headers = new Headers(options.headers);
  headers.set("X-API-Key", apiKey);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIError(
      errorData.error || `Request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }
  return response;
}
const BenchrAPI = {
  // Auth Management
  auth: {
    setApiKey(apiKey) {
      APIKeyStore.set(apiKey);
    },
    getApiKey() {
      return APIKeyStore.get();
    },
    logout() {
      APIKeyStore.remove();
    },
    isAuthenticated() {
      return !!APIKeyStore.get();
    }
  },
  // Submit code for benchmarking
  async submitBenchmark(request) {
    const response = await authenticatedFetch("/jobs", {
      method: "POST",
      body: JSON.stringify(request)
    });
    return response.json();
  },
  // Get all user's programs
  async getPrograms() {
    const response = await authenticatedFetch("/programs");
    const data = await response.json();
    return data.programs || [];
  },
  // Get specific program with its latest metrics
  async getProgramWithMetrics(programId) {
    const response = await authenticatedFetch(`/programs/${programId}`);
    return response.json();
  },
  // Submit benchmark results for a program
  async submitSnapshot(programId, snapshot) {
    const response = await authenticatedFetch(`/programs/${programId}/snapshots`, {
      method: "POST",
      body: JSON.stringify(snapshot)
    });
    return response.json();
  },
  // Get program's snapshot history
  async getProgramSnapshots(programId) {
    const response = await authenticatedFetch(`/programs/${programId}/snapshots`);
    const data = await response.json();
    return data.snapshots || [];
  },
  // Helper: Run benchmark and wait for results
  async runBenchmarkComplete(code, language, name) {
    await this.submitBenchmark({
      code_text: code,
      language,
      name: name || `Benchmark ${(/* @__PURE__ */ new Date()).toISOString()}`
    });
    await new Promise((resolve) => setTimeout(resolve, 2e3));
    const programs = await this.getPrograms();
    if (programs.length === 0) {
      throw new APIError("No programs found after benchmark submission");
    }
    const latestProgram = programs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    return this.getProgramWithMetrics(latestProgram.id);
  }
};
const DEFAULT_CODE = {
  python: '# Write your Python code here\nprint("Hello, Benchr!")',
  cpp: '// Write your C++ code here\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, Benchr!" << std::endl;\n    return 0;\n}'
};
const validateUsername = (username) => {
  if (!username) return "Username is required";
  if (username.length < 3) return "Username must be at least 3 characters";
  if (username.length > 20) return "Username must be less than 20 characters";
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return "Username can only contain letters, numbers, and underscores";
  return null;
};
const validateApiKey = (apiKey) => {
  if (!apiKey) return "API key is required";
  if (apiKey.length < 10) return "Invalid API key format";
  return null;
};
const AuthModal = ({
  isOpen,
  onSuccess
}) => {
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    const usernameError = validateUsername(username);
    if (usernameError) newErrors.username = usernameError;
    const apiKeyError = validateApiKey(apiKey);
    if (apiKeyError) newErrors.apiKey = apiKeyError;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsLoading(true);
    setGeneralError("");
    try {
      BenchrAPI.auth.setApiKey(apiKey);
      await BenchrAPI.getPrograms();
      const user = {
        id: 0,
        // Will be determined by backend
        username,
        email: "",
        // Not required for basic auth
        api_key: apiKey
      };
      onSuccess(user);
    } catch (error) {
      if (error instanceof APIError) {
        if (error.statusCode === 401) {
          setGeneralError("Invalid API key. Please check your credentials.");
        } else {
          setGeneralError(error.message || "Authentication failed. Please try again.");
        }
      } else {
        setGeneralError("An unexpected error occurred. Please try again.");
      }
      BenchrAPI.auth.logout();
    } finally {
      setIsLoading(false);
    }
  };
  return /* @__PURE__ */ jsx(Dialog, {
    open: isOpen,
    children: /* @__PURE__ */ jsxs(DialogContent, {
      className: "sm:max-w-md",
      onPointerDownOutside: (e) => e.preventDefault(),
      children: [/* @__PURE__ */ jsxs(DialogHeader, {
        children: [/* @__PURE__ */ jsx(DialogTitle, {
          className: "text-2xl font-bold",
          children: "Welcome to Benchr"
        }), /* @__PURE__ */ jsx(DialogDescription, {
          children: "Enter your credentials to access your benchmarking workspace"
        })]
      }), /* @__PURE__ */ jsxs("form", {
        onSubmit: handleSubmit,
        className: "space-y-4 mt-4",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsx(Label, {
            htmlFor: "username",
            children: "Username"
          }), /* @__PURE__ */ jsx(Input, {
            id: "username",
            type: "text",
            placeholder: "Enter your username",
            value: username,
            onChange: (e) => {
              setUsername(e.target.value);
              setErrors({
                ...errors,
                username: ""
              });
            },
            disabled: isLoading
          }), errors.username && /* @__PURE__ */ jsx("p", {
            className: "text-sm text-destructive",
            children: errors.username
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsx(Label, {
            htmlFor: "apiKey",
            children: "API Key"
          }), /* @__PURE__ */ jsx(Input, {
            id: "apiKey",
            type: "password",
            placeholder: "Enter your API key",
            value: apiKey,
            onChange: (e) => {
              setApiKey(e.target.value);
              setErrors({
                ...errors,
                apiKey: ""
              });
            },
            disabled: isLoading
          }), errors.apiKey && /* @__PURE__ */ jsx("p", {
            className: "text-sm text-destructive",
            children: errors.apiKey
          })]
        }), generalError && /* @__PURE__ */ jsx("div", {
          className: "p-3 rounded-md bg-destructive/10 text-destructive text-sm",
          children: generalError
        }), /* @__PURE__ */ jsx(Button, {
          type: "submit",
          className: "w-full",
          disabled: isLoading,
          children: isLoading ? /* @__PURE__ */ jsxs(Fragment, {
            children: [/* @__PURE__ */ jsx(Loader2, {
              className: "mr-2 h-4 w-4 animate-spin"
            }), "Authenticating..."]
          }) : "Login"
        }), /* @__PURE__ */ jsx("p", {
          className: "text-xs text-muted-foreground text-center",
          children: "Need an API key? Contact your administrator or check the documentation."
        })]
      })]
    })
  });
};
const SettingsModal = ({
  isOpen,
  onClose,
  user,
  onUpdateUser
}) => {
  const [username, setUsername] = useState(user.username);
  const [apiKey, setApiKey] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const handleSave = async () => {
    const newErrors = {};
    if (username !== user.username) {
      const usernameError = validateUsername(username);
      if (usernameError) newErrors.username = usernameError;
    }
    if (apiKey) {
      const apiKeyError = validateApiKey(apiKey);
      if (apiKeyError) newErrors.apiKey = apiKeyError;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsLoading(true);
    setSuccessMessage("");
    try {
      if (apiKey) {
        BenchrAPI.auth.setApiKey(apiKey);
        await BenchrAPI.getPrograms();
      }
      const updatedUser = {
        ...user,
        username,
        api_key: apiKey || user.api_key
      };
      onUpdateUser(updatedUser);
      setSuccessMessage("Settings updated successfully!");
      setApiKey("");
      setTimeout(() => {
        onClose();
        setSuccessMessage("");
      }, 1500);
    } catch (error) {
      if (error instanceof APIError) {
        setErrors({
          apiKey: "Invalid API key"
        });
      } else {
        setErrors({
          general: "Failed to update settings"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleLogout = () => {
    BenchrAPI.auth.logout();
    window.location.reload();
  };
  return /* @__PURE__ */ jsx(Dialog, {
    open: isOpen,
    onOpenChange: onClose,
    children: /* @__PURE__ */ jsxs(DialogContent, {
      className: "sm:max-w-md",
      children: [/* @__PURE__ */ jsxs(DialogHeader, {
        children: [/* @__PURE__ */ jsx(DialogTitle, {
          children: "Account Settings"
        }), /* @__PURE__ */ jsx(DialogDescription, {
          children: "Update your account information"
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "space-y-4 mt-4",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsx(Label, {
            htmlFor: "settings-username",
            children: "Username"
          }), /* @__PURE__ */ jsx(Input, {
            id: "settings-username",
            type: "text",
            value: username,
            onChange: (e) => {
              setUsername(e.target.value);
              setErrors({
                ...errors,
                username: ""
              });
            },
            disabled: isLoading
          }), errors.username && /* @__PURE__ */ jsx("p", {
            className: "text-sm text-destructive",
            children: errors.username
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsx(Label, {
            htmlFor: "settings-apikey",
            children: "New API Key (optional)"
          }), /* @__PURE__ */ jsx(Input, {
            id: "settings-apikey",
            type: "password",
            placeholder: "Leave blank to keep current",
            value: apiKey,
            onChange: (e) => {
              setApiKey(e.target.value);
              setErrors({
                ...errors,
                apiKey: ""
              });
            },
            disabled: isLoading
          }), errors.apiKey && /* @__PURE__ */ jsx("p", {
            className: "text-sm text-destructive",
            children: errors.apiKey
          })]
        }), successMessage && /* @__PURE__ */ jsx("div", {
          className: "p-3 rounded-md bg-green-500/10 text-green-600 text-sm",
          children: successMessage
        }), errors.general && /* @__PURE__ */ jsx("div", {
          className: "p-3 rounded-md bg-destructive/10 text-destructive text-sm",
          children: errors.general
        }), /* @__PURE__ */ jsxs("div", {
          className: "flex gap-2 pt-2",
          children: [/* @__PURE__ */ jsx(Button, {
            onClick: handleSave,
            disabled: isLoading,
            className: "flex-1",
            children: isLoading ? /* @__PURE__ */ jsxs(Fragment, {
              children: [/* @__PURE__ */ jsx(Loader2, {
                className: "mr-2 h-4 w-4 animate-spin"
              }), "Saving..."]
            }) : "Save Changes"
          }), /* @__PURE__ */ jsx(Button, {
            onClick: handleLogout,
            variant: "destructive",
            disabled: isLoading,
            children: "Logout"
          })]
        })]
      })]
    })
  });
};
const SidePanel = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  savedRuns,
  onLoadRun,
  currentEditorMode
}) => {
  const [activeSection, setActiveSection] = useState("runs");
  const [showSettings, setShowSettings] = useState(false);
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [/* @__PURE__ */ jsx(Sheet, {
      open: isOpen,
      onOpenChange: onClose,
      children: /* @__PURE__ */ jsx(SheetContent, {
        side: "left",
        className: "w-80 p-0",
        children: /* @__PURE__ */ jsxs("div", {
          className: "flex flex-col h-full",
          children: [/* @__PURE__ */ jsx(SheetHeader, {
            className: "p-6 pb-4 border-b",
            children: /* @__PURE__ */ jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsx(SheetTitle, {
                children: "Benchr"
              }), /* @__PURE__ */ jsx("button", {
                onClick: onClose,
                className: "hover:bg-muted p-1.5 rounded transition-colors",
                children: /* @__PURE__ */ jsx(X, {
                  className: "h-4 w-4"
                })
              })]
            })
          }), /* @__PURE__ */ jsxs("div", {
            className: "flex-1 overflow-y-auto",
            children: [/* @__PURE__ */ jsx("div", {
              className: "p-4 border-b",
              children: /* @__PURE__ */ jsxs("button", {
                onClick: () => setShowSettings(true),
                className: "w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors",
                children: [/* @__PURE__ */ jsx("div", {
                  className: "flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground",
                  children: /* @__PURE__ */ jsx(User, {
                    className: "h-5 w-5"
                  })
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex-1 text-left",
                  children: [/* @__PURE__ */ jsx("p", {
                    className: "text-sm font-medium",
                    children: user.username
                  }), /* @__PURE__ */ jsx("p", {
                    className: "text-xs text-muted-foreground",
                    children: user.email || "No email set"
                  })]
                }), /* @__PURE__ */ jsx(Settings, {
                  className: "h-4 w-4 text-muted-foreground"
                })]
              })
            }), /* @__PURE__ */ jsx("div", {
              className: "p-4",
              children: /* @__PURE__ */ jsx("div", {
                className: "space-y-2",
                children: /* @__PURE__ */ jsx("button", {
                  onClick: () => setActiveSection("runs"),
                  className: `w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === "runs" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`,
                  children: "Saved Runs"
                })
              })
            }), activeSection === "runs" && /* @__PURE__ */ jsx("div", {
              className: "px-4 pb-4",
              children: /* @__PURE__ */ jsx("div", {
                className: "space-y-2",
                children: savedRuns.length === 0 ? /* @__PURE__ */ jsx("div", {
                  className: "text-center py-8 text-sm text-muted-foreground",
                  children: "No saved runs yet. Run a benchmark to get started!"
                }) : savedRuns.map((run) => /* @__PURE__ */ jsx("div", {
                  className: "p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors",
                  children: /* @__PURE__ */ jsxs("div", {
                    className: "flex items-start justify-between",
                    children: [/* @__PURE__ */ jsxs("div", {
                      className: "flex-1",
                      children: [/* @__PURE__ */ jsx("h4", {
                        className: "text-sm font-medium",
                        children: run.name
                      }), /* @__PURE__ */ jsxs("p", {
                        className: "text-xs text-muted-foreground mt-1",
                        children: [new Date(run.timestamp).toLocaleDateString(), " •", " ", run.editorMode === "single" ? "1" : "2", " Editor", run.editorMode === "dual" ? "s" : ""]
                      })]
                    }), currentEditorMode === "dual" && run.editorMode === "dual" ? /* @__PURE__ */ jsxs("div", {
                      className: "flex gap-1 ml-2",
                      children: [/* @__PURE__ */ jsx(Button, {
                        size: "sm",
                        variant: "ghost",
                        onClick: () => onLoadRun(run, 1),
                        className: "h-7 text-xs",
                        children: "Load to 1"
                      }), /* @__PURE__ */ jsx(Button, {
                        size: "sm",
                        variant: "ghost",
                        onClick: () => onLoadRun(run, 2),
                        className: "h-7 text-xs",
                        children: "Load to 2"
                      })]
                    }) : /* @__PURE__ */ jsx(Button, {
                      size: "sm",
                      variant: "ghost",
                      onClick: () => onLoadRun(run),
                      className: "h-7 text-xs ml-2",
                      children: "Load"
                    })]
                  })
                }, run.id))
              })
            })]
          })]
        })
      })
    }), /* @__PURE__ */ jsx(SettingsModal, {
      isOpen: showSettings,
      onClose: () => setShowSettings(false),
      user,
      onUpdateUser
    })]
  });
};
const CodeEditor = ({
  editorState,
  onCodeChange,
  onLanguageChange,
  title
}) => {
  return /* @__PURE__ */ jsxs("div", {
    className: "h-full flex flex-col",
    children: [/* @__PURE__ */ jsxs("div", {
      className: "flex items-center justify-between p-3 border-b border-border bg-muted/30",
      children: [/* @__PURE__ */ jsx("h3", {
        className: "text-sm font-medium",
        children: title
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex gap-1 bg-background rounded-md p-1",
        children: [/* @__PURE__ */ jsx("button", {
          onClick: () => onLanguageChange("python"),
          className: `px-3 py-1 text-xs font-medium rounded transition-colors ${editorState.language === "python" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`,
          children: "Python"
        }), /* @__PURE__ */ jsx("button", {
          onClick: () => onLanguageChange("cpp"),
          className: `px-3 py-1 text-xs font-medium rounded transition-colors ${editorState.language === "cpp" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`,
          children: "C++"
        })]
      })]
    }), /* @__PURE__ */ jsx("div", {
      className: "flex-1",
      children: /* @__PURE__ */ jsx(ClientOnly, {
        children: /* @__PURE__ */ jsx(Editor, {
          height: "100%",
          language: editorState.language === "cpp" ? "cpp" : "python",
          value: editorState.code,
          onChange: (value) => onCodeChange(value || ""),
          theme: "vs-dark",
          options: {
            minimap: {
              enabled: false
            },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true
          }
        })
      })
    })]
  });
};
const PerformancePanel = ({
  data,
  title,
  loading
}) => {
  const [activeTab, setActiveTab] = useState("perf");
  return /* @__PURE__ */ jsxs("div", {
    className: "h-full flex flex-col bg-muted/20",
    children: [/* @__PURE__ */ jsxs("div", {
      className: "flex items-center justify-between p-3 border-b border-border bg-muted/30",
      children: [/* @__PURE__ */ jsx("h3", {
        className: "text-sm font-medium",
        children: title
      }), loading && /* @__PURE__ */ jsxs("div", {
        className: "flex items-center gap-2 text-xs text-muted-foreground",
        children: [/* @__PURE__ */ jsx(Loader2, {
          className: "h-3 w-3 animate-spin"
        }), "Running benchmark..."]
      })]
    }), /* @__PURE__ */ jsxs(Tabs, {
      value: activeTab,
      onValueChange: (v) => setActiveTab(v),
      className: "flex-1 flex flex-col",
      children: [/* @__PURE__ */ jsx("div", {
        className: "border-b border-border bg-muted/20 px-3",
        children: /* @__PURE__ */ jsxs(TabsList, {
          className: "h-9",
          children: [/* @__PURE__ */ jsx(TabsTrigger, {
            value: "perf",
            className: "text-xs",
            children: "Perf"
          }), /* @__PURE__ */ jsx(TabsTrigger, {
            value: "vmstat",
            className: "text-xs",
            children: "VMStat"
          }), /* @__PURE__ */ jsx(TabsTrigger, {
            value: "iostat",
            className: "text-xs",
            children: "IOStat"
          })]
        })
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex-1 overflow-y-auto p-4",
        children: [!data && !loading && /* @__PURE__ */ jsx("div", {
          className: "flex items-center justify-center h-full text-sm text-muted-foreground",
          children: "Run a benchmark to see results"
        }), loading && /* @__PURE__ */ jsx("div", {
          className: "flex items-center justify-center h-full",
          children: /* @__PURE__ */ jsxs("div", {
            className: "text-center",
            children: [/* @__PURE__ */ jsx(Loader2, {
              className: "h-8 w-8 animate-spin mx-auto mb-2 text-primary"
            }), /* @__PURE__ */ jsx("p", {
              className: "text-sm text-muted-foreground",
              children: "Profiling your code..."
            })]
          })
        }), data && !loading && /* @__PURE__ */ jsxs(Fragment, {
          children: [/* @__PURE__ */ jsxs(TabsContent, {
            value: "perf",
            className: "space-y-3 mt-0",
            children: [/* @__PURE__ */ jsxs(Card, {
              children: [/* @__PURE__ */ jsx(CardHeader, {
                className: "pb-3",
                children: /* @__PURE__ */ jsx(CardTitle, {
                  className: "text-sm",
                  children: "CPU Metrics"
                })
              }), /* @__PURE__ */ jsxs(CardContent, {
                className: "space-y-2",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "CPU Cycles:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.perf_metrics.cpu_cycles.toLocaleString()
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Instructions:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.perf_metrics.instructions.toLocaleString()
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "IPC:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: (data.snapshot.perf_metrics.instructions / data.snapshot.perf_metrics.cpu_cycles).toFixed(2)
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxs(Card, {
              children: [/* @__PURE__ */ jsx(CardHeader, {
                className: "pb-3",
                children: /* @__PURE__ */ jsx(CardTitle, {
                  className: "text-sm",
                  children: "Cache Metrics"
                })
              }), /* @__PURE__ */ jsxs(CardContent, {
                className: "space-y-2",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Cache References:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.perf_metrics.cache_references.toLocaleString()
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Cache Misses:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.perf_metrics.cache_misses.toLocaleString()
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Miss Rate:"
                  }), /* @__PURE__ */ jsxs("span", {
                    className: "font-medium",
                    children: [(data.snapshot.perf_metrics.cache_misses / data.snapshot.perf_metrics.cache_references * 100).toFixed(2), "%"]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Branch Misses:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.perf_metrics.branch_misses.toLocaleString()
                  })]
                })]
              })]
            })]
          }), /* @__PURE__ */ jsxs(TabsContent, {
            value: "vmstat",
            className: "space-y-3 mt-0",
            children: [/* @__PURE__ */ jsxs(Card, {
              children: [/* @__PURE__ */ jsx(CardHeader, {
                className: "pb-3",
                children: /* @__PURE__ */ jsx(CardTitle, {
                  className: "text-sm",
                  children: "Process Info"
                })
              }), /* @__PURE__ */ jsxs(CardContent, {
                className: "space-y-2",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Running:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.vmstat_metrics.procs_running
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Blocked:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.vmstat_metrics.procs_blocked
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxs(Card, {
              children: [/* @__PURE__ */ jsx(CardHeader, {
                className: "pb-3",
                children: /* @__PURE__ */ jsx(CardTitle, {
                  className: "text-sm",
                  children: "Memory Usage"
                })
              }), /* @__PURE__ */ jsxs(CardContent, {
                className: "space-y-2",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Free Memory:"
                  }), /* @__PURE__ */ jsxs("span", {
                    className: "font-medium",
                    children: [(data.snapshot.vmstat_metrics.memory_free_kb / 1024).toFixed(0), " MB"]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Used Memory:"
                  }), /* @__PURE__ */ jsxs("span", {
                    className: "font-medium",
                    children: [(data.snapshot.vmstat_metrics.memory_used_kb / 1024).toFixed(0), " MB"]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Swap Used:"
                  }), /* @__PURE__ */ jsxs("span", {
                    className: "font-medium",
                    children: [(data.snapshot.vmstat_metrics.swap_used_kb / 1024).toFixed(0), " MB"]
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxs(Card, {
              children: [/* @__PURE__ */ jsx(CardHeader, {
                className: "pb-3",
                children: /* @__PURE__ */ jsx(CardTitle, {
                  className: "text-sm",
                  children: "CPU Usage"
                })
              }), /* @__PURE__ */ jsxs(CardContent, {
                className: "space-y-2",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "User:"
                  }), /* @__PURE__ */ jsxs("span", {
                    className: "font-medium",
                    children: [data.snapshot.vmstat_metrics.cpu_user_percent.toFixed(1), "%"]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "System:"
                  }), /* @__PURE__ */ jsxs("span", {
                    className: "font-medium",
                    children: [data.snapshot.vmstat_metrics.cpu_system_percent.toFixed(1), "%"]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Idle:"
                  }), /* @__PURE__ */ jsxs("span", {
                    className: "font-medium",
                    children: [data.snapshot.vmstat_metrics.cpu_idle_percent.toFixed(1), "%"]
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxs(Card, {
              children: [/* @__PURE__ */ jsx(CardHeader, {
                className: "pb-3",
                children: /* @__PURE__ */ jsx(CardTitle, {
                  className: "text-sm",
                  children: "I/O Blocks"
                })
              }), /* @__PURE__ */ jsxs(CardContent, {
                className: "space-y-2",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Blocks In:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.vmstat_metrics.io_blocks_in.toLocaleString()
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Blocks Out:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.vmstat_metrics.io_blocks_out.toLocaleString()
                  })]
                })]
              })]
            })]
          }), /* @__PURE__ */ jsx(TabsContent, {
            value: "iostat",
            className: "space-y-3 mt-0",
            children: /* @__PURE__ */ jsxs(Card, {
              children: [/* @__PURE__ */ jsx(CardHeader, {
                className: "pb-3",
                children: /* @__PURE__ */ jsxs(CardTitle, {
                  className: "text-sm",
                  children: ["Device: ", data.snapshot.iostat_metrics.device]
                })
              }), /* @__PURE__ */ jsxs(CardContent, {
                className: "space-y-2",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Total Reads:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.iostat_metrics.total_reads.toFixed(0)
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Total Writes:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.iostat_metrics.total_writes.toFixed(0)
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Read KB/s:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.iostat_metrics.read_kb_per_sec.toFixed(2)
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Write KB/s:"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.iostat_metrics.write_kb_per_sec.toFixed(2)
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "CPU Util:"
                  }), /* @__PURE__ */ jsxs("span", {
                    className: "font-medium",
                    children: [data.snapshot.iostat_metrics.cpu_util.toFixed(2), "%"]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "CPU Idle:"
                  }), /* @__PURE__ */ jsxs("span", {
                    className: "font-medium",
                    children: [data.snapshot.iostat_metrics.cpu_idle.toFixed(2), "%"]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "text-muted-foreground",
                    children: "Await (ms):"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "font-medium",
                    children: data.snapshot.iostat_metrics.await_ms.toFixed(2)
                  })]
                })]
              })]
            })
          })]
        })]
      })]
    })]
  });
};
const home = UNSAFE_withComponentProps(function BenchrLayout() {
  const [user, setUser] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("single");
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [error, setError] = useState("");
  const [editor1, setEditor1] = useState({
    code: DEFAULT_CODE.python,
    language: "python"
  });
  const [editor2, setEditor2] = useState({
    code: DEFAULT_CODE.python,
    language: "python"
  });
  const [perfData1, setPerfData1] = useState(null);
  const [perfData2, setPerfData2] = useState(null);
  const [savedRuns, setSavedRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  useEffect(() => {
    if (user && BenchrAPI.auth.isAuthenticated()) {
      loadSavedRuns();
    }
  }, [user]);
  const loadSavedRuns = async () => {
    setLoadingRuns(true);
    try {
      const programs = await BenchrAPI.getPrograms();
      const runs = programs.map((program) => ({
        id: program.id,
        name: program.name,
        timestamp: program.updated_at,
        editorMode: "single",
        // You might want to store this in the backend
        editor1: {
          code: program.code_text,
          language: program.language
        }
      }));
      setSavedRuns(runs);
    } catch (error2) {
      console.error("Failed to load saved runs:", error2);
    } finally {
      setLoadingRuns(false);
    }
  };
  const handleLanguageChange = (editor, newLang) => {
    const newCode = DEFAULT_CODE[newLang];
    if (editor === 1) {
      setEditor1({
        code: newCode,
        language: newLang
      });
    } else {
      setEditor2({
        code: newCode,
        language: newLang
      });
    }
  };
  const handleRunBenchmark = async () => {
    setError("");
    if (editorMode === "single") {
      setLoading1(true);
      try {
        const result = await BenchrAPI.runBenchmarkComplete(editor1.code, editor1.language, `Benchmark ${(/* @__PURE__ */ new Date()).toLocaleString()}`);
        if (result.latest_snapshot) {
          setPerfData1({
            snapshot: result.latest_snapshot
          });
        }
        await loadSavedRuns();
      } catch (error2) {
        if (error2 instanceof APIError) {
          setError(`Benchmark failed: ${error2.message}`);
        } else {
          setError("An unexpected error occurred while running the benchmark");
        }
        console.error("Benchmark error:", error2);
      } finally {
        setLoading1(false);
      }
    } else {
      setLoading1(true);
      setLoading2(true);
      try {
        const [result1, result2] = await Promise.all([BenchrAPI.runBenchmarkComplete(editor1.code, editor1.language, `Benchmark 1 ${(/* @__PURE__ */ new Date()).toLocaleString()}`), BenchrAPI.runBenchmarkComplete(editor2.code, editor2.language, `Benchmark 2 ${(/* @__PURE__ */ new Date()).toLocaleString()}`)]);
        if (result1.latest_snapshot) {
          setPerfData1({
            snapshot: result1.latest_snapshot
          });
        }
        if (result2.latest_snapshot) {
          setPerfData2({
            snapshot: result2.latest_snapshot
          });
        }
        await loadSavedRuns();
      } catch (error2) {
        if (error2 instanceof APIError) {
          setError(`Benchmark failed: ${error2.message}`);
        } else {
          setError("An unexpected error occurred while running the benchmarks");
        }
        console.error("Benchmark error:", error2);
      } finally {
        setLoading1(false);
        setLoading2(false);
      }
    }
  };
  const handleLoadRun = async (run, editorNum) => {
    try {
      const programData = await BenchrAPI.getProgramWithMetrics(run.id);
      if (editorMode === "single" || !editorNum) {
        setEditor1({
          code: programData.program.code_text,
          language: programData.program.language
        });
        if (programData.latest_snapshot) {
          setPerfData1({
            snapshot: programData.latest_snapshot
          });
        }
      } else if (editorNum === 1) {
        setEditor1({
          code: programData.program.code_text,
          language: programData.program.language
        });
        if (programData.latest_snapshot) {
          setPerfData1({
            snapshot: programData.latest_snapshot
          });
        }
      } else {
        setEditor2({
          code: programData.program.code_text,
          language: programData.program.language
        });
        if (programData.latest_snapshot) {
          setPerfData2({
            snapshot: programData.latest_snapshot
          });
        }
      }
      setIsPanelOpen(false);
    } catch (error2) {
      console.error("Failed to load run:", error2);
      setError("Failed to load saved run");
    }
  };
  useEffect(() => {
    if (BenchrAPI.auth.isAuthenticated()) {
      setUser({
        id: 0,
        username: "User",
        email: "",
        api_key: BenchrAPI.auth.getApiKey() || void 0
      });
    }
  }, []);
  if (!user) {
    return /* @__PURE__ */ jsx(AuthModal, {
      isOpen: true,
      onSuccess: setUser
    });
  }
  return /* @__PURE__ */ jsxs("div", {
    className: "h-screen flex flex-col bg-background",
    children: [/* @__PURE__ */ jsxs("header", {
      className: "border-b border-border bg-card",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "flex items-center justify-between px-4 py-3",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "flex items-center gap-3",
          children: [/* @__PURE__ */ jsx("button", {
            onClick: () => setIsPanelOpen(true),
            className: "hover:bg-muted p-1.5 rounded transition-colors",
            children: /* @__PURE__ */ jsx(Menu, {
              className: "h-5 w-5 text-muted-foreground"
            })
          }), /* @__PURE__ */ jsx("h1", {
            className: "text-xl font-semibold",
            children: "Benchr"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "flex items-center gap-3",
          children: [/* @__PURE__ */ jsxs("div", {
            className: "flex items-center gap-2 bg-muted rounded-md p-1",
            children: [/* @__PURE__ */ jsxs("button", {
              onClick: () => setEditorMode("single"),
              className: `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${editorMode === "single" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
              children: [/* @__PURE__ */ jsx(Columns2, {
                className: "h-4 w-4"
              }), "Single"]
            }), /* @__PURE__ */ jsxs("button", {
              onClick: () => setEditorMode("dual"),
              className: `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${editorMode === "dual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
              children: [/* @__PURE__ */ jsx(Grid2x2, {
                className: "h-4 w-4"
              }), "Dual"]
            })]
          }), /* @__PURE__ */ jsx("button", {
            onClick: handleRunBenchmark,
            disabled: loading1 || loading2,
            className: "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
            children: loading1 || loading2 ? /* @__PURE__ */ jsxs(Fragment, {
              children: [/* @__PURE__ */ jsx(Loader2, {
                className: "h-4 w-4 animate-spin"
              }), "Running..."]
            }) : /* @__PURE__ */ jsxs(Fragment, {
              children: [/* @__PURE__ */ jsx(Play, {
                className: "h-4 w-4"
              }), "Run Benchmark"]
            })
          })]
        })]
      }), error && /* @__PURE__ */ jsx("div", {
        className: "px-4 pb-3",
        children: /* @__PURE__ */ jsxs("div", {
          className: "p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center justify-between",
          children: [/* @__PURE__ */ jsx("span", {
            children: error
          }), /* @__PURE__ */ jsx("button", {
            onClick: () => setError(""),
            className: "hover:bg-destructive/20 p-1 rounded",
            children: /* @__PURE__ */ jsx(X, {
              className: "h-4 w-4"
            })
          })]
        })
      })]
    }), /* @__PURE__ */ jsx(SidePanel, {
      isOpen: isPanelOpen,
      onClose: () => setIsPanelOpen(false),
      user,
      onUpdateUser: setUser,
      savedRuns,
      onLoadRun: handleLoadRun,
      currentEditorMode: editorMode
    }), /* @__PURE__ */ jsx("div", {
      className: "flex-1 overflow-hidden",
      children: editorMode === "single" ? (
        // Single Editor Mode - 2 Panel Layout
        /* @__PURE__ */ jsxs("div", {
          className: "h-full grid grid-cols-2",
          children: [/* @__PURE__ */ jsx("div", {
            className: "border-r border-border",
            children: /* @__PURE__ */ jsx(CodeEditor, {
              editorState: editor1,
              onCodeChange: (code) => setEditor1({
                ...editor1,
                code
              }),
              onLanguageChange: (lang) => handleLanguageChange(1, lang),
              title: "Code Editor"
            })
          }), /* @__PURE__ */ jsx("div", {
            children: /* @__PURE__ */ jsx(PerformancePanel, {
              data: perfData1,
              title: "Performance Results",
              loading: loading1
            })
          })]
        })
      ) : (
        // Dual Editor Mode - 4 Panel Layout
        /* @__PURE__ */ jsxs("div", {
          className: "h-full grid grid-cols-2 grid-rows-2",
          children: [/* @__PURE__ */ jsx("div", {
            className: "border-r border-b border-border",
            children: /* @__PURE__ */ jsx(CodeEditor, {
              editorState: editor1,
              onCodeChange: (code) => setEditor1({
                ...editor1,
                code
              }),
              onLanguageChange: (lang) => handleLanguageChange(1, lang),
              title: "Editor 1"
            })
          }), /* @__PURE__ */ jsx("div", {
            className: "border-b border-border",
            children: /* @__PURE__ */ jsx(PerformancePanel, {
              data: perfData1,
              title: "Performance 1",
              loading: loading1
            })
          }), /* @__PURE__ */ jsx("div", {
            className: "border-r border-border",
            children: /* @__PURE__ */ jsx(CodeEditor, {
              editorState: editor2,
              onCodeChange: (code) => setEditor2({
                ...editor2,
                code
              }),
              onLanguageChange: (lang) => handleLanguageChange(2, lang),
              title: "Editor 2"
            })
          }), /* @__PURE__ */ jsx("div", {
            children: /* @__PURE__ */ jsx(PerformancePanel, {
              data: perfData2,
              title: "Performance 2",
              loading: loading2
            })
          })]
        })
      )
    }), /* @__PURE__ */ jsx("footer", {
      className: "border-t border-border bg-card px-4 py-2",
      children: /* @__PURE__ */ jsxs("div", {
        className: "flex items-center justify-between text-xs text-muted-foreground",
        children: [/* @__PURE__ */ jsxs("span", {
          children: ["Logged in as ", user.username]
        }), /* @__PURE__ */ jsxs("span", {
          children: [editorMode === "single" ? "1 Editor" : "2 Editors", " Active"]
        })]
      })
    })]
  });
});
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: home
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-umNQznKk.js", "imports": ["/assets/chunk-OIYGIGL5-CGakh1eo.js", "/assets/index-DP0m30K1.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": true, "module": "/assets/root-CT6JToJ1.js", "imports": ["/assets/chunk-OIYGIGL5-CGakh1eo.js", "/assets/index-DP0m30K1.js"], "css": ["/assets/root-BW4K6sRd.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/home": { "id": "routes/home", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/home-CiXHu0bg.js", "imports": ["/assets/chunk-OIYGIGL5-CGakh1eo.js", "/assets/index-DP0m30K1.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-52b4d244.js", "version": "52b4d244", "sri": void 0 };
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "v8_middleware": false, "unstable_optimizeDeps": false, "unstable_splitRouteModules": false, "unstable_subResourceIntegrity": false, "unstable_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/home": {
    id: "routes/home",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route1
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
