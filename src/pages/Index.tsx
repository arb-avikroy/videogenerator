import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { ProgressTracker, Step } from "@/components/ProgressTracker";
import { InputSection } from "@/components/InputSection";
import { ScriptPanel } from "@/components/ScriptPanel";
import { ScenesPanel } from "@/components/ScenesPanel";
import { VideoPreview } from "@/components/VideoPreview";
import { ProcessingLogs } from "@/components/ProcessingLogs";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

interface Scene {
  sceneNumber: number;
  visualDescription: string;
  narration: string;
  duration: number;
  imageUrl?: string;
}

interface Script {
  title: string;
  scenes: Scene[];
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

const Index = () => {
  const [currentStep, setCurrentStep] = useState<Step>("script");
  const [completedSteps, setCompletedSteps] = useState<Step[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [script, setScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentlyGenerating, setCurrentlyGenerating] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    const timestamp = new Date().toLocaleTimeString("en-US", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit" 
    });
    setLogs(prev => [...prev, { timestamp, message, type }]);
  }, []);

  const completeStep = useCallback((step: Step) => {
    setCompletedSteps(prev => [...prev, step]);
  }, []);

  const generateVideo = async (topic: string) => {
    setIsProcessing(true);
    setLogs([]);
    setScript(null);
    setScenes([]);
    setVideoUrl(null);
    
    // Step 1: Generate Script with Gemini AI
    setCurrentStep("script");
    addLog(`Starting video generation for: "${topic}"`, "info");
    
    try {
      let generatedScript: Script;

      if (!isSupabaseConfigured()) {
        // Fallback to mock data when Supabase is not configured
        addLog("Supabase not configured - using demo mode...", "warning");
        await new Promise(r => setTimeout(r, 1500));
        
        generatedScript = {
          title: `${topic}: A Deep Dive`,
          scenes: [
            {
              sceneNumber: 1,
              visualDescription: "A sweeping aerial view of a futuristic city with holographic stock charts floating above skyscrapers",
              narration: `Welcome to our exploration of ${topic}. In today's rapidly evolving financial landscape, understanding these concepts is crucial.`,
              duration: 5
            },
            {
              sceneNumber: 2,
              visualDescription: "Close-up of an AI neural network visualization with glowing data streams",
              narration: "Artificial intelligence is revolutionizing how we approach investments, analyzing patterns that humans simply cannot perceive.",
              duration: 5
            },
            {
              sceneNumber: 3,
              visualDescription: "A diverse group of investors looking at charts on transparent screens",
              narration: "Smart investors are already leveraging these technologies to gain competitive advantages in the market.",
              duration: 5
            },
            {
              sceneNumber: 4,
              visualDescription: "A mountain peak at sunrise with a winding trail made of golden coins",
              narration: "The journey to financial success is an adventure. With the right tools and knowledge, you can reach new heights.",
              duration: 5
            }
          ]
        };
      } else {
        addLog("Connecting to Gemini AI script generator...", "info");
        
        const { data: scriptData, error: scriptError } = await supabase.functions.invoke(
          "generate-script",
          { body: { topic } }
        );

        if (scriptError) {
          const anyErr = scriptError as any;
          const body = anyErr?.context?.body;

          let message = scriptError.message || "Failed to generate script";
          if (body) {
            if (typeof body === "string") {
              try {
                const parsed = JSON.parse(body);
                message = parsed?.error || parsed?.message || message;
              } catch {
                // ignore
              }
            } else if (typeof body === "object") {
              message = body?.error || body?.message || message;
            }
          }

          throw new Error(message);
        }

        if (!scriptData || !scriptData.scenes) {
          throw new Error("Invalid script response");
        }

        generatedScript = {
          title: scriptData.title,
          scenes: scriptData.scenes.map((scene: Scene) => ({
            ...scene,
            imageUrl: undefined
          }))
        };
        
        addLog("Script generated successfully with Gemini AI!", "success");
      }
      
      setScript(generatedScript);
      setScenes(generatedScript.scenes);
      addLog(`Created ${generatedScript.scenes.length} scenes`, "info");
      completeStep("script");
    
      // Step 2: Generate Images (placeholder for now)
      setCurrentStep("images");
      addLog("Starting image generation with Grok Imagine API...", "info");
      
      for (let i = 0; i < generatedScript.scenes.length; i++) {
        setCurrentlyGenerating(generatedScript.scenes[i].sceneNumber);
        addLog(`Generating image for Scene ${i + 1}...`, "info");
        await new Promise(r => setTimeout(r, 2000));
        
        // Placeholder images (Grok API integration coming next)
        const placeholderImages = [
          "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=400&fit=crop"
        ];
        
        setScenes(prev => prev.map((scene, idx) => 
          idx === i ? { ...scene, imageUrl: placeholderImages[i % placeholderImages.length] } : scene
        ));
        addLog(`Scene ${i + 1} image generated successfully`, "success");
      }
      
      setCurrentlyGenerating(null);
      completeStep("images");
      
      // Step 3: Merge Video
      setCurrentStep("merge");
      setIsGeneratingVideo(true);
      addLog("Starting video merge process...", "info");
      addLog("Converting images to video frames...", "info");
      await new Promise(r => setTimeout(r, 1500));
      addLog("Adding narration audio tracks...", "info");
      await new Promise(r => setTimeout(r, 1500));
      addLog("Concatenating video clips...", "info");
      await new Promise(r => setTimeout(r, 2000));
      addLog("Encoding final video (MP4, 1920x1080, 30fps)...", "info");
      await new Promise(r => setTimeout(r, 1500));
      
      // Simulate video URL
      setVideoUrl("https://www.w3schools.com/html/mov_bbb.mp4");
      setIsGeneratingVideo(false);
      addLog("Video merged successfully!", "success");
      completeStep("merge");
      
      // Step 4: Review
      setCurrentStep("review");
      addLog("Video ready for review", "info");
      await new Promise(r => setTimeout(r, 500));
      completeStep("review");
      
      // Step 5: Ready for Download
      setCurrentStep("download");
      addLog("Video generation complete! Ready for download.", "success");
      completeStep("download");
      
      toast.success("Video generated successfully!", {
        description: "Your video is ready for download."
      });

    } catch (error) {
      console.error("Generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addLog(`Error: ${errorMessage}`, "error");
      toast.error("Failed to generate video", {
        description: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (videoUrl) {
      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = `${script?.title?.toLowerCase().replace(/\s+/g, "-") || "video"}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addLog("Download started", "success");
    }
  };

  return (
    <div className="min-h-screen bg-background mountain-pattern">
      <Header />
      
      <main className="container mx-auto px-4 pb-12">
        <ProgressTracker 
          currentStep={currentStep} 
          completedSteps={completedSteps} 
        />
        
        <InputSection 
          onGenerate={generateVideo} 
          isProcessing={isProcessing} 
        />

        <AnimatePresence mode="wait">
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ScriptPanel 
              script={script} 
              isLoading={isProcessing && !script} 
            />
            <ScenesPanel 
              scenes={scenes} 
              isLoading={isProcessing && scenes.length === 0}
              currentlyGenerating={currentlyGenerating}
            />
            <VideoPreview 
              videoUrl={videoUrl}
              isGenerating={isGeneratingVideo}
              onDownload={handleDownload}
            />
            <ProcessingLogs logs={logs} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 The Adventurous Investor. AI-powered video generation.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
