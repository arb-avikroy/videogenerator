import { motion } from "framer-motion";
import { Image, Loader2 } from "lucide-react";

interface Scene {
  sceneNumber: number;
  visualDescription: string;
  narration: string;
  duration: number;
  imageUrl?: string;
}

interface ScenesPanelProps {
  scenes: Scene[];
  isLoading: boolean;
  currentlyGenerating: number | null;
}

export const ScenesPanel = ({ scenes, isLoading, currentlyGenerating }: ScenesPanelProps) => {
  return (
    <motion.div 
      className="panel h-full min-h-80 p-5 flex flex-col"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Image className="w-4 h-4 text-primary" />
        <span className="panel-header mb-0">Generated Scenes</span>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin space-y-3">
        {isLoading && scenes.length === 0 ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3 p-3 bg-secondary/50 rounded-lg animate-pulse">
                <div className="w-20 h-20 bg-border/50 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-border/50 rounded w-1/3" />
                  <div className="h-3 bg-border/50 rounded w-full" />
                  <div className="h-3 bg-border/50 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : scenes.length > 0 ? (
          scenes.map((scene, index) => (
            <motion.div
              key={scene.sceneNumber}
              className="flex gap-3 p-3 bg-secondary/50 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Thumbnail */}
              <div className="w-20 h-20 bg-muted rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                {scene.imageUrl ? (
                  <img 
                    src={scene.imageUrl} 
                    alt={`Scene ${scene.sceneNumber}`}
                    className="w-full h-full object-cover"
                  />
                ) : currentlyGenerating === scene.sceneNumber ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <Image className="w-6 h-6 text-muted-foreground/50" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-primary">
                    Scene {scene.sceneNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {scene.duration}s
                  </span>
                </div>
                <p className="text-sm text-foreground/80 line-clamp-2">
                  {scene.narration}
                </p>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm text-center">
              Scene images will appear here
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
