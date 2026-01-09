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
  const [hasError, setHasError] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Store generation options for step-by-step
  const generationOptionsRef = useRef<GenerationOptions | null>(null);
  const proceedResolveRef = useRef<(() => void) | null>(null);

  const handleReset = useCallback(() => {
    setProgressStep("script");
    setProgressCompletedSteps([]);
    setWorkflowStep("model");
    setWorkflowCompletedSteps([]);
    setIsProcessing(false);
    setIsWaitingForProceed(false);
    setScript(null);
    setScenes([]);
    setCurrentlyGenerating(null);
    setVideoUrl(null);
    setIsGeneratingVideo(false);
    setLogs([]);
    setHasError(false);
    setLastError(null);
    generationOptionsRef.current = null;
    proceedResolveRef.current = null;
  }, []);

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
      type ScriptError = { message?: string; context?: { body?: unknown } };
      const scriptErr = scriptError as ScriptError;
      const body = scriptErr?.context?.body;

      let message = scriptErr?.message || "Failed to generate script";
      if (body) {
        if (typeof body === "string") {
          try {
            const parsed = JSON.parse(body);
            message = parsed?.error || parsed?.message || message;
          } catch {
            // ignore
          }
        } else if (typeof body === "object") {
          const b = body as Record<string, unknown>;
          if (typeof b.error === 'string') message = b.error;
          else if (typeof b.message === 'string') message = b.message;
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
      const scene = scriptScenes[i];
      addLog(`Generating image for Scene ${i + 1}...`, "info");
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: {
            prompt: `Create a high-quality, cinematic image for a video scene: ${scene.visualDescription}. Style: Professional, visually striking, suitable for video content.`,
            sceneNumber: scene.sceneNumber,
            provider: generationOptionsRef.current?.imageProvider
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data.success) {
          throw new Error(data.error || 'Image generation failed');
        }

        updatedScenes[i] = { ...updatedScenes[i], imageUrl: data.imageUrl };
        setScenes([...updatedScenes]);
        addLog(`Scene ${i + 1} image generated successfully`, "success");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        addLog(`Failed to generate image for Scene ${i + 1}: ${errorMsg}`, "error");
        // Use a placeholder on failure
        updatedScenes[i] = { 
          ...updatedScenes[i], 
          imageUrl: `https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=400&fit=crop` 
        };
        setScenes([...updatedScenes]);
      }
    }
    
    setCurrentlyGenerating(null);
    return updatedScenes;
  };

  const generateVideo = async (videoScenes: Scene[]): Promise<string> => {
    setIsGeneratingVideo(true);
    addLog("Requesting video generation for scenes...", "info");
    addLog(`Scenes available: ${videoScenes.length}`, 'info');

    try {
      if (!videoScenes || videoScenes.length === 0) {
        throw new Error('No scenes available for video generation');
      }

      const requestScenes = videoScenes.map(s => ({ sceneNumber: s.sceneNumber, imageUrl: s.imageUrl, prompt: s.visualDescription, narration: s.narration }));
      addLog(`Sending ${requestScenes.length} scenes to backend...`, 'info');

      const { data, error } = await supabase.functions.invoke('generate-video', { body: { scenes: requestScenes, provider: generationOptionsRef.current?.imageProvider } });

      if (error) throw new Error(error.message || 'Failed to call generate-video');
      if (!data || !data.success) throw new Error(data?.error || 'Video generation function failed');

      addLog('Received video pieces from backend. Merging with ffmpeg...', 'info');

      // Prepare inputs for ffmpeg helper
      const sceneMediaRaw = data.scenes;

      // Dynamic import of ffmpeg helper (to avoid loading during app start)
      const { mergeScenesToMp4, createVideoFromImage } = await import('@/lib/ffmpeg');

      const sceneMedia: Array<{ videoDataUrl: string; audioDataUrl?: string; filenameBase: string }> = [];

      for (let i = 0; i < sceneMediaRaw.length; i++) {
        const s = sceneMediaRaw[i];
        if (s.error || !s.video) {
          // Fallback: create short video from original image (client-side)
          addLog(`Scene ${s.sceneNumber || i + 1}: server generation failed, creating placeholder clip locally`, 'warning');
          const imageSource = videoScenes[i]?.imageUrl || videoScenes[i]?.image || videoScenes[i]?.imageUrl;
          const placeholderVideoUrl = imageSource ? await createVideoFromImage(imageSource, videoScenes[i]?.duration || 3, `fallback_${i}`) : '';
          sceneMedia.push({ videoDataUrl: placeholderVideoUrl, audioDataUrl: s.audio, filenameBase: `scene_${i}` });
        } else {
          sceneMedia.push({ videoDataUrl: s.video, audioDataUrl: s.audio, filenameBase: `scene_${i}` });
        }
      }

      const finalUrl = await mergeScenesToMp4(sceneMedia);

      addLog('Video merged successfully', 'success');
      setIsGeneratingVideo(false);
      return finalUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Video generation failed: ${msg}`, 'error');
      setIsGeneratingVideo(false);
      throw err;
    }
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
      const scenesWithImages = await generateImages(generatedScript.scenes);
      setScenes(scenesWithImages);
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
      
      const videoResult = await generateVideo(scenesWithImages);
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
      setHasError(true);
      setLastError(errorMessage);
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

  const handleRetry = (newOptions: GenerationOptions) => {
    setHasError(false);
    setLastError(null);
    startGeneration(newOptions);
  };

  const handleDownloadImagesZip = async () => {
    try {
      const scenesWithImages = scenes.filter((s) => s.imageUrl);
      if (scenesWithImages.length === 0) {
        toast.error("No images to download yet.");
        return;
      }

      addLog("Preparing images zip...", "info");

      const JSZip = (await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")).default;
      const zip = new JSZip();

      const toBlob = async (url: string) => {
        if (url.startsWith("data:")) {
          const [meta, data] = url.split(",");
          const isBase64 = meta.includes("base64");
          const bytes = isBase64 ? Uint8Array.from(atob(data), (c) => c.charCodeAt(0)) : new TextEncoder().encode(data);
          const mime = meta.split(":")[1]?.split(";")[0] || "image/png";
          return new Blob([bytes], { type: mime });
        }
        const resp = await fetch(url);
        const buf = await resp.arrayBuffer();
        const mime = resp.headers.get("content-type") || "image/png";
        return new Blob([buf], { type: mime });
      };

      for (const scene of scenesWithImages) {
        const blob = await toBlob(scene.imageUrl!);
        const filename = `scene-${scene.sceneNumber || scenesWithImages.indexOf(scene) + 1}.png`;
        zip.file(filename, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${script?.title?.toLowerCase().replace(/\s+/g, "-") || "scenes"}-images.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog("Images zip download started", "success");
      toast.success("Images zip ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Failed to download images zip: ${msg}`, "error");
      toast.error("Could not create images zip", { description: msg });
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
          isProcessing={isProcessing}
          isWaitingForProceed={isWaitingForProceed}
          currentStep={workflowStep}
          completedSteps={workflowCompletedSteps}
          isAutomatic={isAutomatic}
          onToggleMode={setIsAutomatic}
          onReset={handleReset}
          hasError={hasError}
          lastError={lastError}
          onRetry={handleRetry}
          lastOptions={generationOptionsRef.current}
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
              onDownloadZip={handleDownloadImagesZip}
              canDownload={scenes.some((s) => !!s.imageUrl)}
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
