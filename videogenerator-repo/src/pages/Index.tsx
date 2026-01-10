import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ProgressTracker, Step } from "@/components/ProgressTracker";
import { InputSection, GenerationOptions, GenerationStage } from "@/components/InputSection";
import { ScriptPanel } from "@/components/ScriptPanel";
import { ScenesPanel } from "@/components/ScenesPanel";
import { VideoPreview } from "@/components/VideoPreview";
import { ProcessingLogs } from "@/components/ProcessingLogs";
import { WorkflowStep } from "@/components/WorkflowControls";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Scene {
  sceneNumber: number;
  visualDescription: string;
  narration: string;
  duration: number;
  imageUrl?: string;
  audioUrl?: string;
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
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { user, isGuest, guestSessionId, updateActivity, loading } = useAuth();
  const navigate = useNavigate();

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
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hasError, setHasError] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [failedStage, setFailedStage] = useState<GenerationStage>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>("en-US-Neural2-J");
  const [narrationReady, setNarrationReady] = useState(false);
  
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
    setFailedStage(null);
    setGenerationId(null);
    setNarrationReady(false);
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

  const handleRetryVideo = useCallback(async () => {
    if (!scenes || scenes.length === 0) {
      toast.error("No scenes available", {
        description: "Cannot retry video generation without scenes."
      });
      return;
    }

    setIsProcessing(true);
    setHasError(false);
    setLastError(null);
    setFailedStage(null);
    setProgressStep("merge");
    setWorkflowStep("video");
    addLog("Retrying video generation...", "info");

    try {
      const videoResult = await generateVideo(scenes, generationId);
      setVideoUrl(videoResult);
      addLog("Video merged successfully!", "success");

      completeProgressStep("merge");
      completeWorkflowStep("video");

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
      console.error("Video generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addLog(`Error: ${errorMessage}`, "error");
      setHasError(true);
      setLastError(errorMessage);
      setFailedStage('video');
      toast.error("Failed to generate video", {
        description: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  }, [scenes, generationId, addLog, completeProgressStep, completeWorkflowStep]);

  const waitForProceed = (): Promise<void> => {
    return new Promise((resolve) => {
      setIsWaitingForProceed(true);
      setIsProcessing(false);
      proceedResolveRef.current = resolve;
    });
  };

  const handleProceedStep = async () => {
    // Handle narration step - proceed to image generation
    if (workflowStep === "narration" && workflowCompletedSteps.includes("narration")) {
      // User has generated narration and wants to proceed to images
      setIsProcessing(true);
      setProgressStep("images");
      setWorkflowStep("images");
      addLog("Starting image generation...", "info");
      
      try {
        const scenesWithImages = await generateImages(scenes, generationId);
        setScenes(scenesWithImages);
        addLog("All images generated successfully!", "success");
        
        // Mark images as complete
        completeProgressStep("images");
        completeWorkflowStep("images");
        
        toast.success("Images generated successfully!");
      } catch (error) {
        console.error("Image generation error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        addLog(`Error: ${errorMessage}`, "error");
        setHasError(true);
        setLastError(errorMessage);
        setFailedStage('image');
        toast.error("Failed to generate images", {
          description: errorMessage
        });
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    
    // Handle images step - proceed to video generation
    if (workflowStep === "images" && workflowCompletedSteps.includes("images")) {
      // User has generated images and wants to proceed to video
      setIsProcessing(true);
      setProgressStep("merge");
      setWorkflowStep("video");
      addLog("Starting video generation...", "info");
      
      try {
        const videoResult = await generateVideo(scenes, generationId);
        setVideoUrl(videoResult);
        addLog("Video merged successfully!", "success");
        
        // Mark video as complete
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
        console.error("Video generation error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        addLog(`Error: ${errorMessage}`, "error");
        setHasError(true);
        setLastError(errorMessage);
        setFailedStage('video');
        toast.error("Failed to generate video", {
          description: errorMessage
        });
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    
    // Normal flow for other steps
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

  const generateScript = async (options: GenerationOptions): Promise<{ script: Script; generationId: string | null }> => {
    const { topic, sceneCount, sceneDuration, model } = options;
    
    updateActivity(); // Track user activity
    
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
        script: {
          title: `${topic}: A Deep Dive`,
          scenes: mockScenes
        },
        generationId: null
      };
    }

    addLog(`Connecting to AI script generator (${model})...`, "info");
    
    // Prepare request body with auth context
    const requestBody = { 
      topic, 
      sceneCount, 
      sceneDuration, 
      model,
      guestSessionId: isGuest ? guestSessionId : undefined
    };
    
    const { data: scriptData, error: scriptError } = await supabase.functions.invoke(
      "generate-script",
      { 
        body: requestBody,
        headers: user ? { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } : {}
      }
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

    // Store and return generation ID from response
    const genId = scriptData.generationId || null;
    if (genId) {
      setGenerationId(genId);
    }

    return {
      script: {
        title: scriptData.title,
        scenes: scriptData.scenes.map((scene: Scene) => ({
          ...scene,
          imageUrl: undefined
        }))
      },
      generationId: genId
    };
  };

  const generateImages = async (scriptScenes: Scene[], genId: string | null): Promise<Scene[]> => {
    const updatedScenes: Scene[] = [...scriptScenes];
    
    updateActivity(); // Track user activity
    
    for (let i = 0; i < scriptScenes.length; i++) {
      setCurrentlyGenerating(scriptScenes[i].sceneNumber);
      const scene = scriptScenes[i];
      addLog(`Generating image for Scene ${i + 1}...`, "info");
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: {
            prompt: `Create a high-quality, cinematic image for a video scene: ${scene.visualDescription}. Style: Professional, visually striking, suitable for video content.`,
            sceneNumber: scene.sceneNumber,
            provider: generationOptionsRef.current?.imageProvider,
            guestSessionId: isGuest ? guestSessionId : undefined,
            scriptTitle: script?.title,
            generationId: genId
          },
          headers: user ? { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } : {}
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
  const generateNarrationAudio = async (scriptScenes: Scene[], genId: string | null): Promise<Scene[]> => {
    const updatedScenes: Scene[] = [...scriptScenes];
    const audioUrls: Array<{ sceneNumber: number; audioUrl: string }> = [];
    
    setIsGeneratingAudio(true);
    updateActivity();
    addLog("Starting narration audio generation...", "info");
    
    for (let i = 0; i < scriptScenes.length; i++) {
      const scene = scriptScenes[i];
      addLog(`Generating narration audio for Scene ${i + 1}...`, "info");
      
      try {
        if (!isSupabaseConfigured()) {
          // Fallback to browser TTS in demo mode
          addLog("Demo mode: using browser TTS", "warning");
          const synth = window.speechSynthesis;
          const utterance = new SpeechSynthesisUtterance(scene.narration);
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          synth.speak(utterance);
          
          const metadata = {
            text: scene.narration,
            sceneNumber: scene.sceneNumber,
          };
          const placeholderUrl = `data:text/plain;base64,${btoa(JSON.stringify(metadata))}`;
          updatedScenes[i] = { ...updatedScenes[i], audioUrl: placeholderUrl };
          setScenes([...updatedScenes]);
          addLog(`Scene ${i + 1} narration queued (browser TTS)`, "success");
          continue;
        }

        // Call Edge Function for server-side TTS generation
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
        
        console.log("TTS Request:", {
          url: `${SUPABASE_URL}/functions/v1/generate-narration`,
          hasKey: !!SUPABASE_ANON_KEY,
          keyPrefix: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 20) + "..." : "empty",
          voice: selectedVoice,
          sceneNumber: scene.sceneNumber
        });
        
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/generate-narration`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              text: scene.narration,
              sceneNumber: scene.sceneNumber,
              generationId: genId,
              voice: selectedVoice, // User-selected voice from VoiceSelector
            }),
          }
        );

        console.log("TTS Response:", response.status, response.statusText);
        const data = await response.json();
        console.log("TTS Data:", data);

        if (!data.success) {
          throw new Error(data.error || "Narration generation failed");
        }

        // If API returned useBrowserTTS flag, fallback to browser TTS
        if (data.useBrowserTTS) {
          addLog(`Scene ${i + 1}: No TTS API configured, using browser TTS`, "warning");
          const synth = window.speechSynthesis;
          const utterance = new SpeechSynthesisUtterance(scene.narration);
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          synth.speak(utterance);
          
          const metadata = {
            text: scene.narration,
            sceneNumber: scene.sceneNumber,
          };
          const placeholderUrl = `data:text/plain;base64,${btoa(JSON.stringify(metadata))}`;
          updatedScenes[i] = { ...updatedScenes[i], audioUrl: placeholderUrl };
        } else {
          // Use the audio URL from server
          updatedScenes[i] = { ...updatedScenes[i], audioUrl: data.audioUrl };
          audioUrls.push({ sceneNumber: scene.sceneNumber, audioUrl: data.audioUrl });
          addLog(`Scene ${i + 1} narration generated (${data.provider})`, "success");
        }
        
        setScenes([...updatedScenes]);
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        addLog(`Failed to generate audio for Scene ${i + 1}: ${errorMsg}`, "warning");
        
        // Fallback to browser TTS on error
        try {
          const synth = window.speechSynthesis;
          const utterance = new SpeechSynthesisUtterance(scene.narration);
          utterance.rate = 0.9;
          synth.speak(utterance);
          addLog(`Scene ${i + 1}: Fallback to browser TTS`, "info");
        } catch {
          // Silently fail if browser TTS also fails
        }
      }
    }
    
    // Save narration audio URLs to database if generationId exists
    if (genId && audioUrls.length > 0) {
      try {
        const { error: updateError } = await supabase
          .from('generations')
          .update({ narration_audio: audioUrls })
          .eq('id', genId);
        
        if (updateError) {
          console.error('Error saving narration audio:', updateError);
          addLog('Failed to save narration audio to database', 'warning');
        } else {
          addLog('Narration audio saved to database', 'success');
        }
      } catch (err) {
        console.error('Error updating generation:', err);
      }
    }
    
    setIsGeneratingAudio(false);
    addLog("All narration audio generated successfully!", "success");
    return updatedScenes;
  };
  const generateVideo = async (videoScenes: Scene[], genId: string | null): Promise<string> => {
    setIsGeneratingVideo(true);
    addLog("Starting Vertex AI video generation for scenes...", "info");
    addLog(`Scenes available: ${videoScenes.length}`, 'info');
    
    updateActivity(); // Track user activity

    try {
      if (!videoScenes || videoScenes.length === 0) {
        throw new Error('No scenes available for video generation');
      }

      // Get generation options
      const options = generationOptionsRef.current;
      if (!options) {
        throw new Error('Generation options not available');
      }

      // Prepare scenes for Vertex AI Edge Function
      const requestScenes = videoScenes.map(s => ({ 
        sceneNumber: s.sceneNumber, 
        imageUrl: s.imageUrl || '', 
        duration: s.duration,
        audioUrl: s.audioUrl || ''
      }));
      
      addLog(`Calling Vertex AI Veo 3.1 for ${requestScenes.length} scenes...`, 'info');
      addLog(`Aspect Ratio: ${options.aspectRatio}, Resolution: ${options.resolution}`, 'info');

      // Call Vertex AI Edge Function
      const { data, error } = await supabase.functions.invoke('generate-video', { 
        body: { 
          scenes: requestScenes,
          aspectRatio: options.aspectRatio || '16:9',
          resolution: options.resolution || '1080p',
          generationId: genId,
          guestSessionId: isGuest ? guestSessionId : undefined
        }
      });

      if (error) throw new Error(error.message || 'Failed to call generate-video');
      if (!data || !data.success) throw new Error(data?.error || 'Vertex AI video generation failed');

      addLog(`Generated ${data.videos.length} scene videos successfully!`, 'success');

      // Prepare scenes for audio mixing
      const { mergeVideosWithAudioMixing } = await import('@/lib/ffmpeg');
      
      const scenesForMixing = data.videos.map((v: any) => ({
        videoUrl: v.videoUrl,
        narrationUrl: videoScenes[v.sceneNumber - 1]?.audioUrl || '',
        filenameBase: `scene_${v.sceneNumber}`
      }));

      addLog('Merging videos with audio (narration 100%, video sound 40%)...', 'info');
      const finalUrl = await mergeVideosWithAudioMixing(scenesForMixing);

      addLog('Video merged and uploaded successfully!', 'success');
      
      // Upload final video to Supabase Storage
      if (genId && finalUrl) {
        try {
          // Convert blob URL to blob
          const response = await fetch(finalUrl);
          const blob = await response.blob();
          
          const fileName = `${genId}/final_video.mp4`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('generated-content')
            .upload(fileName, blob, { upsert: true });

          if (uploadError) {
            addLog(`Failed to upload final video: ${uploadError.message}`, 'warning');
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('generated-content')
              .getPublicUrl(fileName);
            
            // Update database with final video URL
            await supabase
              .from('generations')
              .update({ 
                video_url: publicUrl,
                status: 'complete'
              })
              .eq('id', genId);
            
            addLog('Final video uploaded to storage', 'success');
          }
        } catch (uploadErr) {
          console.error('Upload error:', uploadErr);
          addLog('Failed to upload final video to storage', 'warning');
        }
      }

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
    
    let generatedScript: Script;
    let genId: string | null = null;
    let scenesWithImages: Scene[];
    let scenesWithAudio: Scene[];
    
    try {
      // Complete model selection step
      completeWorkflowStep("model");
      addLog(`Starting video generation for: "${topic}" (${sceneCount} scenes, ${sceneDuration}s each)`, "info");
      addLog(`Using model: ${options.model}`, "info");
      
      // Step 1: Script Generation
      try {
        setWorkflowStep("script");
        setProgressStep("script");

        addLog("Generating script...", "info");
        const scriptResult = await generateScript(options);
        generatedScript = scriptResult.script;
        genId = scriptResult.generationId;
        setScript(generatedScript);
        setScenes(generatedScript.scenes);
        addLog(`Script generated successfully with ${generatedScript.scenes.length} scenes!`, "success");
        completeProgressStep("script");
        completeWorkflowStep("script");
      } catch (scriptError) {
        setFailedStage('script');
        throw scriptError;
      }
      
      // Step 2: Narration Audio Generation
      setProgressStep("narration");
      setNarrationReady(true);
      addLog("Script complete. Ready for narration generation.", "info");
      
      // If manual mode, stop here and wait for user to generate narration
      if (!isAutomatic) {
        addLog("Review and edit narration text, then click Generate Narration", "info");
        setScenes(generatedScript.scenes);
        setProgressStep("narration");
        setWorkflowStep("narration");
        // Stop here and wait for manual narration trigger
        return;
      }
      
      // Automatic mode: continue with narration
      setProgressStep("narration");
      setWorkflowStep("narration");
      addLog("Starting narration audio generation...", "info");
      scenesWithAudio = await generateNarrationAudio(generatedScript.scenes, genId);
      setScenes(scenesWithAudio);
      addLog("All narration audio generated successfully!", "success");
      completeProgressStep("narration");
      completeWorkflowStep("narration");
      setNarrationReady(false);
      
      // Step 3: Image Generation
      try {
        setWorkflowStep("images");
        setProgressStep("images");
        
        addLog("Starting image generation...", "info");
        scenesWithImages = await generateImages(scenesWithAudio, genId);
        setScenes(scenesWithImages);
        addLog("All images generated successfully!", "success");
        completeProgressStep("images");
        completeWorkflowStep("images");
      } catch (imageError) {
        setFailedStage('image');
        throw imageError;
      }
      
      // Step 4: Video Generation
      try {
        setWorkflowStep("video");
        setProgressStep("merge");
        addLog("Starting video generation...", "info");
        const videoResult = await generateVideo(scenesWithImages, genId);
        setVideoUrl(videoResult);
        addLog("Video merged successfully!", "success");
        completeProgressStep("merge");
        completeWorkflowStep("video");
      } catch (videoError) {
        setFailedStage('video');
        throw videoError;
      }
      
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

  const generateNarrationStep = async (scenesToNarrate: Scene[], genId: string | null) => {
    addLog("Starting narration audio generation...", "info");
    const scenesWithAudio = await generateNarrationAudio(scenesToNarrate, genId);
    setScenes(scenesWithAudio);
    addLog("All narration audio generated successfully!", "success");
    return scenesWithAudio;
  };

  const handleGenerateNarration = async () => {
    if (!scenes.length || !narrationReady) return;
    
    setIsProcessing(true);
    addLog(`Using voice: ${selectedVoice}`, "info");
    setProgressStep("narration");
    setWorkflowStep("narration");
    
    try {
      await generateNarrationStep(scenes, generationId);
      setNarrationReady(false);
      
      // Mark narration as complete
      completeProgressStep("narration");
      completeWorkflowStep("narration");
      
      addLog("Narration generated successfully!", "success");
      addLog("Click 'Proceed Next' to continue with image generation", "info");
      toast.success("Narration generated!", {
        description: "Audio has been generated for all scenes."
      });
    } catch (error) {
      console.error("Narration generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addLog(`Error: ${errorMessage}`, "error");
      toast.error("Failed to generate narration", {
        description: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNarrationEdit = (sceneNumber: number, newNarration: string) => {
    setScenes(prevScenes => 
      prevScenes.map(scene => 
        scene.sceneNumber === sceneNumber 
          ? { ...scene, narration: newNarration } 
          : scene
      )
    );
  };

  const handleRegenerateNarration = () => {
    // Clear all audio URLs and reset workflow to narration only
    setScenes(prevScenes => 
      prevScenes.map(scene => ({ ...scene, audioUrl: undefined }))
    );
    setNarrationReady(true);
    setProgressStep("narration");
    setWorkflowStep("narration");
    // Remove narration and all subsequent steps from completed steps
    setProgressCompletedSteps(prev => prev.filter(step => step === "script"));
    setWorkflowCompletedSteps(prev => prev.filter(step => step === "model" || step === "script"));
    addLog("Narration cleared. Ready to regenerate.", "info");
    toast.info("You can now edit and regenerate narration");
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
    setFailedStage(null);
    startGeneration(newOptions);
  };

  const handleDownloadImagesZip = async () => {
    try {
      const scenesWithImages = scenes.filter((s) => s.imageUrl);
      const scenesWithAudio = scenes.filter((s) => s.audioUrl);
      
      if (scenesWithImages.length === 0 && scenesWithAudio.length === 0) {
        toast.error("No images or audio to download yet.");
        return;
      }

      addLog("Preparing scenes zip with images and narration...", "info");

      const JSZip = (await import("jszip")).default;
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

      // Add images folder
      if (scenesWithImages.length > 0) {
        const imagesFolder = zip.folder("images");
        for (const scene of scenesWithImages) {
          const blob = await toBlob(scene.imageUrl!);
          const filename = `scene-${scene.sceneNumber || scenesWithImages.indexOf(scene) + 1}.png`;
          imagesFolder?.file(filename, blob);
        }
        addLog(`Added ${scenesWithImages.length} images`, "info");
      }

      // Add audio folder
      if (scenesWithAudio.length > 0) {
        const audioFolder = zip.folder("narration");
        for (const scene of scenesWithAudio) {
          const blob = await toBlob(scene.audioUrl!);
          // Audio files are typically MP3
          const filename = `scene-${scene.sceneNumber || scenesWithAudio.indexOf(scene) + 1}.mp3`;
          audioFolder?.file(filename, blob);
        }
        addLog(`Added ${scenesWithAudio.length} narration audio files`, "info");
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${script?.title?.toLowerCase().replace(/\s+/g, "-") || "scenes"}-content.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog("Scenes zip download started", "success");
      toast.success("Scenes zip ready with images and narration");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Failed to download scenes zip: ${msg}`, "error");
      toast.error("Could not create scenes zip", { description: msg });
    }
  };

  // Check authentication - redirect to login if needed
  // MUST BE AFTER ALL HOOKS
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Allow both authenticated users and guests
  if (!user && !isGuest) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background mountain-pattern">
      <Header isProcessing={isProcessing} isWaitingForProceed={isWaitingForProceed} />
      
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
          failedStage={failedStage}
          onRetry={handleRetry}
          onRetryVideo={handleRetryVideo}
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
              onNarrationEdit={handleNarrationEdit}
              narrationReady={narrationReady}
              selectedVoice={selectedVoice}
              onVoiceChange={setSelectedVoice}
              onGenerateNarration={handleGenerateNarration}
              isGeneratingAudio={isGeneratingAudio}
              onRegenerateNarration={handleRegenerateNarration}
              currentWorkflowStep={workflowStep}
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
