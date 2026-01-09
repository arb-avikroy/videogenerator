import { motion } from "framer-motion";
import { Film, Download, Play, Pause } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

interface VideoPreviewProps {
  videoUrl: string | null;
  isGenerating: boolean;
  onDownload: () => void;
}

export const VideoPreview = ({ videoUrl, isGenerating, onDownload }: VideoPreviewProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <motion.div 
      className="panel h-full min-h-80 p-5 flex flex-col"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Film className="w-4 h-4 text-primary" />
        <span className="panel-header mb-0">Video Preview</span>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {/* Video Container */}
        <div className="flex-1 bg-muted rounded-lg overflow-hidden relative flex items-center justify-center aspect-video">
          {videoUrl ? (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onEnded={() => setIsPlaying(false)}
              />
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 hover:opacity-100 transition-opacity"
              >
                {isPlaying ? (
                  <Pause className="w-16 h-16 text-foreground" />
                ) : (
                  <Play className="w-16 h-16 text-foreground" />
                )}
              </button>
            </>
          ) : isGenerating ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/30 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">Merging video clips...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Film className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Video preview will appear here</p>
            </div>
          )}
        </div>

        {/* Download Button */}
        {videoUrl && (
          <Button
            variant="gold"
            onClick={onDownload}
            className="w-full"
          >
            <Download className="w-4 h-4" />
            Download Video
          </Button>
        )}
      </div>
    </motion.div>
  );
};
