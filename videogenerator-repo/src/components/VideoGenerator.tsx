import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Video, Download } from "lucide-react";
import { assembleVideo } from "@/lib/videoAssembly";

interface Scene {
  sceneNumber: number;
  text: string;
  imageUrl: string;
  audioUrl?: string;
}

interface VideoGeneratorProps {
  scenes: Scene[];
  scriptTitle: string;
}

export const VideoGenerator = ({ scenes, scriptTitle }: VideoGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerateVideo = async () => {
    // Validate all scenes have audio
    const scenesWithoutAudio = scenes.filter(s => !s.audioUrl);
    if (scenesWithoutAudio.length > 0) {
      toast.error("Please generate narration for all scenes first");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setProgressMessage("Initializing video generation...");

    try {
      const videoBlob = await assembleVideo(
        scenes,
        (prog, msg) => {
          setProgress(prog);
          setProgressMessage(msg);
        }
      );

      // Create download URL
      const url = URL.createObjectURL(videoBlob);
      setVideoUrl(url);

      toast.success("Video generated successfully!");
    } catch (error) {
      console.error("Video generation error:", error);
      toast.error("Failed to generate video");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadVideo = () => {
    if (!videoUrl) return;

    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = `${scriptTitle.replace(/\s+/g, "_")}_video.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Video downloaded!");
  };

  const allScenesReady = scenes.every(s => s.imageUrl && s.audioUrl);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Generation
          </h3>
        </div>

        {!allScenesReady && (
          <p className="text-sm text-muted-foreground">
            Generate images and narration for all scenes first
          </p>
        )}

        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{progressMessage}</p>
          </div>
        )}

        {videoUrl && (
          <div className="space-y-3">
            <video
              src={videoUrl}
              controls
              className="w-full rounded-lg border"
            />
            <Button
              onClick={handleDownloadVideo}
              className="w-full"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Video (.mp4)
            </Button>
          </div>
        )}

        {!videoUrl && (
          <Button
            onClick={handleGenerateVideo}
            disabled={!allScenesReady || isGenerating}
            className="w-full"
          >
            <Video className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating Video..." : "Generate Video"}
          </Button>
        )}
      </div>
    </Card>
  );
};
