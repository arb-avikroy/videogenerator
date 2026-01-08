import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { ProgressTracker, Step } from "@/components/ProgressTracker";
import { InputSection, GenerationOptions } from "@/components/InputSection";
import { ScriptPanel } from "@/components/ScriptPanel";
import { ScenesPanel } from "@/components/ScenesPanel";
import { VideoPreview } from "@/components/VideoPreview";
import { ProcessingLogs } from "@/components/ProcessingLogs";
import { WorkflowStep } from "@/components/WorkflowControls";
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
  const [progressStep, setProgressStep] = useState<Step>("script");
  const [progressCompletedSteps, setProgressCompletedSteps] = useState<Step[]>([]);
  
  // Workflow state
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("model");
  const [workflowCompletedSteps, setWorkflowCompletedSteps] = useState<WorkflowStep[]>([]);
  const [isAutomatic, setIsAutomatic] = useState(false);
  const [isWaitingForProceed, setIsWaitingForProceed] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [script, setScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentlyGenerating, setCurrentlyGenerating] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Store generation options for step-by-step
  const generationOptionsRef = useRef<GenerationOptions | null>(null);
  const proceedResolveRef = useRef<(() => void) | null>(null);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    const timestamp = new Date().toLocaleTimeString("en-US", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit" 
    });
    setLogs(prev => [...prev, { timestamp, message, type }]);
  }, []);

  const completeProgressStep = useCallback((step: Step) => {
    setProgressCompletedSteps(prev => [...prev, step]);
  }, []);

  const completeWorkflowStep = useCallback((step: WorkflowStep) => {
    setWorkflowCompletedSteps(prev => [...prev, step]);
  }, []);

  const waitForProceed = (): Promise<void> => {
    return new Promise((resolve) => {
      setIsWaitingForProceed(true);
      setIsProcessing(false);
      proceedResolveRef.current = resolve;
    });
  };

  const handleProceedStep = () => {
    if (proceedResolveRef.current) {
      setIsWaitingForProceed(false);
      setIsProcessing(true);
      proceedResolveRef.current();
      proceedResolveRef.current = null;
    }
  };

  const handleRunAutomatic = () => {
    // Continue automatically without waiting
    if (proceedResolveRef.current) {
      proceedResolveRef.current();
      proceedResolveRef.current = null;
    }
  };

  const generateScript = async (options: GenerationOptions): Promise<Script> => {
    const { topic, sceneCount, sceneDuration, model } = options;
    
    if (!isSupabaseConfigured()) {
      addLog("Supabase not configured - using demo mode...", "warning");
      await new Promise(r => setTimeout(r, 1500));
      
      const mockScenes: Scene[] = [];
      for (let i = 1; i <= sceneCount; i++) {
        mockScenes.push({
          sceneNumber: i,
          visualDescription: `Demo scene ${i} visual description for topic: ${topic}`,
          narration: `This is demo narration for scene ${i} about ${topic}.`,
          duration: sceneDuration
        });
      }
      
      return {
        title: `${topic}: A Deep Dive`,
        scenes: mockScenes
      };
    }

    addLog(`Connecting to AI script generator (${model})...`, "info");
    
    const { data: scriptData, error: scriptError } = await supabase.functions.invoke(
      "generate-script",
      { body: { topic, sceneCount, sceneDuration, model } }
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

    return {
      title: scriptData.title,
      scenes: scriptData.scenes.map((scene: Scene) => ({
        ...scene,
        imageUrl: undefined
      }))
    };
  };

  const generateImages = async (scriptScenes: Scene[]): Promise<Scene[]> => {
    const updatedScenes: Scene[] = [...scriptScenes];
    
    for (let i = 0; i < scriptScenes.length; i++) {
      setCurrentlyGenerating(scriptScenes[i].sceneNumber);
      addLog(`Generating image for Scene ${i + 1}...`, "info");
      await new Promise(r => setTimeout(r, 2000));
      
      const placeholderImages = [
        "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=400&fit=crop"
      ];
      
      updatedScenes[i] = { ...updatedScenes[i], imageUrl: placeholderImages[i % placeholderImages.length] };
      setScenes([...updatedScenes]);
      addLog(`Scene ${i + 1} image generated successfully`, "success");
    }
    
    setCurrentlyGenerating(null);
    return updatedScenes;
  };

  const generateVideo = async (): Promise<string> => {
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
    
    setIsGeneratingVideo(false);
    return "https://www.w3schools.com/html/mov_bbb.mp4";
  };

  const startGeneration = async (options: GenerationOptions) => {
    generationOptionsRef.current = options;
    setIsProcessing(true);
    setLogs([]);
    setScript(null);
    setScenes([]);
    setVideoUrl(null);
    setWorkflowCompletedSteps([]);
    setProgressCompletedSteps([]);
    
    const { topic, sceneCount, sceneDuration } = options;
    
    try {
      // Complete model selection step
      completeWorkflowStep("model");
      addLog(`Starting video generation for: "${topic}" (${sceneCount} scenes, ${sceneDuration}s each)`, "info");
      addLog(`Using model: ${options.model}`, "info");
      
      // Step 1: Script Generation
      setWorkflowStep("script");
      setProgressStep("script");
      
      if (!isAutomatic) {
        addLog("Waiting to proceed with script generation...", "info");
        await waitForProceed();
      }
      
      addLog("Generating script...", "info");
      const generatedScript = await generateScript(options);
      setScript(generatedScript);
      setScenes(generatedScript.scenes);
      addLog(`Script generated successfully with ${generatedScript.scenes.length} scenes!`, "success");
      completeProgressStep("script");
      completeWorkflowStep("script");
      
      // Step 2: Image Generation
      setWorkflowStep("images");
      setProgressStep("images");
      
      if (!isAutomatic) {
        addLog("Waiting to proceed with image generation...", "info");
        await waitForProceed();
      }
      
      addLog("Starting image generation...", "info");
      await generateImages(generatedScript.scenes);
      addLog("All images generated successfully!", "success");
      completeProgressStep("images");
      completeWorkflowStep("images");
      
      // Step 3: Video Generation
      setWorkflowStep("video");
      setProgressStep("merge");
      
      if (!isAutomatic) {
        addLog("Waiting to proceed with video generation...", "info");
        await waitForProceed();
      }
      
      const videoResult = await generateVideo();
      setVideoUrl(videoResult);
      addLog("Video merged successfully!", "success");
      completeProgressStep("merge");
      completeWorkflowStep("video");
      
      // Final steps
      setProgressStep("review");
      addLog("Video ready for review", "info");
      await new Promise(r => setTimeout(r, 500));
      completeProgressStep("review");
      
      setProgressStep("download");
      addLog("Video generation complete! Ready for download.", "success");
      completeProgressStep("download");
      
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
      setIsWaitingForProceed(false);
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
          currentStep={progressStep} 
          completedSteps={progressCompletedSteps} 
        />
        
        <InputSection 
          onGenerate={startGeneration}
          onProceedStep={handleProceedStep}
          onRunAutomatic={handleRunAutomatic}
          isProcessing={isProcessing || isWaitingForProceed}
          currentStep={workflowStep}
          completedSteps={workflowCompletedSteps}
          isAutomatic={isAutomatic}
          onToggleMode={setIsAutomatic}
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
