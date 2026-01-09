import { Mountain, Sun } from "lucide-react";

export const Header = () => {
  return (
    <header className="relative py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-4">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary tracking-wide">
            The adventurous investor
          </h1>
          <div className="relative flex items-end gap-1">
            <Mountain className="w-8 h-8 text-primary" strokeWidth={1.5} />
            <Mountain className="w-6 h-6 text-primary/70" strokeWidth={1.5} />
            <Sun className="absolute -top-2 right-0 w-4 h-4 text-primary animate-float" strokeWidth={2} />
          </div>
        </div>
        
        {/* Tagline */}
        <p className="text-muted-foreground text-sm md:text-base tracking-widest uppercase">
          AI-Powered Video Generation Platform
        </p>

        {/* Decorative dotted trail */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
    </header>
  );
};
