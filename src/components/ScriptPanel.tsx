import { motion } from "framer-motion";
import { FileText, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Scene {
  sceneNumber: number;
  visualDescription: string;
  narration: string;
  duration: number;
}

interface Script {
  title: string;
  scenes: Scene[];
}

interface ScriptPanelProps {
  script: Script | null;
  isLoading: boolean;
}

export const ScriptPanel = ({ script, isLoading }: ScriptPanelProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (script) {
      await navigator.clipboard.writeText(JSON.stringify(script, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div 
      className="panel h-full min-h-80 p-5 flex flex-col"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="panel-header mb-0">Generated Script</span>
        </div>
        {script && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCopy}
            className="h-8 px-2"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i}
                className="h-4 bg-border/50 rounded animate-shimmer"
                style={{ 
                  width: `${60 + Math.random() * 40}%`,
                  backgroundImage: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.1), transparent)",
                  backgroundSize: "200% 100%"
                }}
              />
            ))}
          </div>
        ) : script ? (
          <pre className="font-mono text-sm text-foreground/90 whitespace-pre-wrap">
            {JSON.stringify(script, null, 2)}
          </pre>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm text-center">
              Script will appear here after generation
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
