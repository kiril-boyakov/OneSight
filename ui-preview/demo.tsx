import { useState } from "react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

function InteractiveHoverButtonDemo() {
  const [activated, setActivated] = useState(false);
  return (
    <main className="grid min-h-dvh place-content-center gap-5 bg-background p-6 text-center text-foreground">
      <h1 className="text-2xl font-semibold">OneSight button preview</h1>
      <div>
        <InteractiveHoverButton text="Start a project" onClick={() => setActivated(true)} />
      </div>
      <p role="status">{activated ? "Button activated." : "Hover or press Tab to preview."}</p>
    </main>
  );
}

export { InteractiveHoverButtonDemo };
