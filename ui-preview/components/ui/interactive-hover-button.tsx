import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
}

const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ text = "Button", className, type = "button", ...props }, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "group relative isolate min-w-32 cursor-pointer overflow-hidden rounded-full border bg-background px-6 py-2 text-center font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="inline-block translate-x-1 transition-all duration-300 group-enabled:group-hover:translate-x-12 group-enabled:group-hover:opacity-0 group-focus-visible:translate-x-12 group-focus-visible:opacity-0 motion-reduce:transition-none">
        {text}
      </span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 flex translate-x-12 items-center justify-center gap-2 text-primary-foreground opacity-0 transition-all duration-300 group-enabled:group-hover:translate-x-0 group-enabled:group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
        <span>{text}</span>
        <ArrowRight className="size-4 shrink-0" />
      </span>
      <span aria-hidden="true" className="pointer-events-none absolute left-[12%] top-[40%] h-2 w-2 rounded-lg bg-primary transition-all duration-300 group-enabled:group-hover:inset-0 group-enabled:group-hover:h-full group-enabled:group-hover:w-full group-enabled:group-hover:scale-[1.8] group-focus-visible:inset-0 group-focus-visible:h-full group-focus-visible:w-full group-focus-visible:scale-[1.8] motion-reduce:transition-none" />
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };
