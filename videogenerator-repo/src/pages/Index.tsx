import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { InputSection, GenerationOptions, GenerationStage } from "@/components/InputSection";
import { ScriptPanel } from "@/components/ScriptPanel";
import { VoiceSelector } from "@/components/VoiceSelector";
import { VideoGenerator } from "@/components/VideoGenerator";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Archive, ImageIcon, Volume2, Play, Pause } from "lucide-react";
import JSZip from "jszip";

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

const Index = () => {
  const { user, isGuest, guestSessionId, updateActivity, loading } = useAuth();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [script, setScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentlyGenerating, setCurrentlyGenerating] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [failedStage, setFailedStage] = useState<GenerationStage>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>("en-us");
  const [selectedProvider, setSelectedProvider] = useState<string>("voicerss");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  
  const generationOptionsRef = useRef<GenerationOptions | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clean up audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const getVoiceDisplayName = () => {
    const providerName = selectedProvider === "voicerss" ? "Voice RSS" : "AIML";
    let voiceName = selectedVoice;
    
    // Get friendly voice name
    if (selectedProvider === "voicerss") {
      const voiceMap: Record<string, string> = {
        "en-us": "English US",
        "en-gb": "English UK",
        "en-au": "English AU",
        "en-in": "English India",
        "es-es": "Spanish Spain",
        "es-mx": "Spanish Mexico",
        "fr-fr": "French",
        "de-de": "German",
        "it-it": "Italian",
        "pt-br": "Portuguese Brazil",
        "ja-jp": "Japanese",
        "ko-kr": "Korean",
        "zh-cn": "Chinese Mandarin",
        "hi-in": "Hindi",
      };
      voiceName = voiceMap[selectedVoice] || selectedVoice;
    } else {
      const voiceMap: Record<string, string> = {
        "alloy": "Alloy",
        "echo": "Echo",
        "fable": "Fable",
        "onyx": "Onyx",
        "nova": "Nova",
        "shimmer": "Shimmer",
        "coral": "Coral",
      };
      voiceName = voiceMap[selectedVoice] || selectedVoice;
    }
    
    return `${providerName} - ${voiceName}`;
  };

  const handleReset = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsProcessing(false);
    setScript(null);
    setScenes([]);
    setCurrentlyGenerating(null);
    setHasError(false);
    setLastError(null);
    setFailedStage(null);
    setGenerationId(null);
    setIsGeneratingAudio(false);
    setPlayingAudio(null);
    generationOptionsRef.current = null;
  }, []);

  const saveGenerationToDatabase = async (script: Script, scenes: Scene[], options: GenerationOptions, genId: string | null, videoUrl?: string) => {
    // Don't save anything for guest users
    if (!user || isGuest) return null;

    try {
      const generationData = {
        id: genId || undefined,
        user_id: user.id,
        title: script.title,
        topic: options.topic,
        script: {
          title: script.title,
          scenes: script.scenes
        },
        images: scenes.filter(s => s.imageUrl).map((s) => ({
          sceneNumber: s.sceneNumber,
          url: s.imageUrl,
          prompt: s.visualDescription
        })),
        narration_audio: scenes.filter(s => s.audioUrl).map((s) => ({
          sceneNumber: s.sceneNumber,
          audioUrl: s.audioUrl
        })),
        merged_video: videoUrl || null,
        metadata: {
          model: options.model,
          sceneCount: options.sceneCount,
          sceneDuration: options.sceneDuration,
          voice: selectedVoice,
          provider: selectedProvider
        }
      };

      const { data, error } = genId 
        ? await supabase.from("generations").update(generationData).eq("id", genId).select().single()
        : await supabase.from("generations").insert(generationData).select().single();

      if (error) {
        console.error("Error saving generation:", error);
        toast.warning("History not saved", {
          description: "Server is unavailable. Your content can still be downloaded locally."
        });
        return null;
      }

      return data?.id;
    } catch (error) {
      console.error("Save generation error:", error);
      toast.warning("History not saved", {
        description: "Server is unavailable. Your content can still be downloaded locally."
      });
      return null;
    }
  };

  const generateScript = async (options: GenerationOptions): Promise<{ script: Script; generationId: string | null }> => {
    const { topic, sceneCount, model } = options;
    
    updateActivity();
    
    if (!isSupabaseConfigured()) {
      toast.error("Supabase not configured");
      throw new Error("Supabase is not configured");
    }

    try {
      const { data, error } = await supabase.functions.invoke("generate-script", {
        body: {
          topic,
          sceneCount,
          model,
          userId: user?.id,
          guestSessionId: isGuest ? guestSessionId : null
        }
      });

      if (error) throw error;
      if (!data) throw new Error("Invalid response from script generation");

      // The function returns the script directly with title and scenes
      const script: Script = {
        title: data.title,
        scenes: data.scenes
      };

      return {
        script,
        generationId: data.generationId || null
      };
    } catch (err) {
      console.error("Script generation error:", err);
      // Check if it's a network/server error
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('AbortError') || errorMessage.includes('NetworkError')) {
        toast.error("Server unavailable", {
          description: "Cannot connect to generation server. Please check your connection and try again."
        });
      }
      throw err;
    }
  };

  const generateImages = async (scenes: Scene[], genId: string | null) => {
    if (!isSupabaseConfigured()) {
      toast.error("Supabase not configured");
      return scenes;
    }

    const updatedScenes = [...scenes];
    let hasServerError = false;

    for (let i = 0; i < scenes.length; i++) {
      if (!isMountedRef.current) break; // Stop if component unmounted
      
      const scene = scenes[i];
      setCurrentlyGenerating(i);

      try {
        updateActivity();

        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: {
            prompt: scene.visualDescription,
            sceneNumber: scene.sceneNumber,
            generationId: genId,
            userId: user?.id,
            guestSessionId: isGuest ? guestSessionId : null
          }
        });

        if (error) throw error;
        if (!data || !data.imageUrl) throw new Error("No image URL returned");

        updatedScenes[i] = {
          ...scene,
          imageUrl: data.imageUrl
        };

        if (isMountedRef.current) {
          setScenes([...updatedScenes]);
        }
      } catch (err) {
        console.error(`Error generating image for scene ${scene.sceneNumber}:`, err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        // Check if it's a server/network error
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('AbortError') || errorMessage.includes('NetworkError')) {
          if (!hasServerError) {
            hasServerError = true;
            toast.warning("Server connection issue", {
              description: "Images may not be saved to history, but you can still download them locally."
            });
          }
        }
        throw err;
      }
    }

    if (isMountedRef.current) {
      setCurrentlyGenerating(null);
    }
    return updatedScenes;
  };
  const generateNarration = async (scenes: Scene[], genId: string | null) => {
    if (!isSupabaseConfigured()) {
      toast.error("Supabase not configured");
      return scenes;
    }

    const updatedScenes = [...scenes];
    let hasServerError = false;
    
    if (isMountedRef.current) {
      setIsGeneratingAudio(true);
    }

    for (let i = 0; i < scenes.length; i++) {
      if (!isMountedRef.current) break; // Stop if component unmounted
      
      const scene = scenes[i];
      setCurrentlyGenerating(i);

      try {
        updateActivity();

        const { data, error } = await supabase.functions.invoke("generate-narration", {
          body: {
            text: scene.narration,
            voice: selectedVoice,
            provider: selectedProvider,
            sceneNumber: scene.sceneNumber,
            generationId: genId,
          }
        });

        if (error) throw error;
        if (!data || !data.audioUrl) throw new Error("No audio URL returned");

        updatedScenes[i] = {
          ...scene,
          audioUrl: data.audioUrl
        };

        if (isMountedRef.current) {
          setScenes([...updatedScenes]);
        }
      } catch (err) {
        console.error(`Error generating audio for scene ${scene.sceneNumber}:`, err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        // Check if it's a server/network error
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('AbortError') || errorMessage.includes('NetworkError')) {
          if (!hasServerError) {
            hasServerError = true;
            toast.warning("Server connection issue", {
              description: "Audio may not be saved to history, but you can still download it locally."
            });
          }
        }
        throw err;
      }
    }

    if (isMountedRef.current) {
      setCurrentlyGenerating(null);
      setIsGeneratingAudio(false);

      // Try to save to database after generating narration (non-blocking)
      if (script && generationOptionsRef.current) {
        try {
          await saveGenerationToDatabase(script, updatedScenes, generationOptionsRef.current, genId);
        } catch (err) {
          console.error("Failed to save to database:", err);
          // Error already shown in saveGenerationToDatabase
        }
      }
    }

    return updatedScenes;
  };
  const handleGenerate = async (options: GenerationOptions) => {
    setIsProcessing(true);
    setHasError(false);
    setLastError(null);
    setFailedStage(null);
    generationOptionsRef.current = options;

    try {
      // Generate Script
      toast.info("Generating script...");
      const { script: generatedScript, generationId: genId } = await generateScript(options);
      
      setScript(generatedScript);
      setScenes(generatedScript.scenes);
      setGenerationId(genId);
      toast.success("Script generated successfully!");

      // Generate Images
      toast.info("Generating images...");
      await generateImages(generatedScript.scenes, genId);
      toast.success("Images generated successfully!");

    } catch (error) {
      console.error("Generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setHasError(true);
      setLastError(errorMessage);
      setFailedStage(script ? 'image' : 'script');
      toast.error("Failed to generate content", {
        description: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    if (!generationOptionsRef.current) return;

    if (failedStage === 'script') {
      handleGenerate(generationOptionsRef.current);
    } else if (failedStage === 'image' && script) {
      setIsProcessing(true);
      setHasError(false);
      setLastError(null);
      generateImages(script.scenes, generationId)
        .then(() => {
          toast.success("Images generated successfully!");
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          setHasError(true);
          setLastError(errorMessage);
          toast.error("Failed to generate images", {
            description: errorMessage
          });
        })
        .finally(() => {
          setIsProcessing(false);
        });
    }
  };

  const downloadImages = async () => {
    if (!scenes.length || !script) return;
    
    const scenesWithImages = scenes.filter(scene => scene.imageUrl);
    if (scenesWithImages.length === 0) {
      toast.error("No images to download");
      return;
    }

    try {
      toast.info("Preparing images for download...");
      const zip = new JSZip();
      
      // Fetch all images and add to zip
      for (const scene of scenesWithImages) {
        if (scene.imageUrl) {
          try {
            const response = await fetch(scene.imageUrl);
            const blob = await response.blob();
            const extension = scene.imageUrl.includes('.png') ? 'png' : 'jpg';
            zip.file(`scene_${scene.sceneNumber}.${extension}`, blob);
          } catch (err) {
            console.error(`Failed to fetch image for scene ${scene.sceneNumber}:`, err);
          }
        }
      }
      
      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${script.title.replace(/\s+/g, '_')}_images.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${scenesWithImages.length} images!`);
    } catch (error) {
      console.error("Error creating zip:", error);
      toast.error("Failed to download images");
    }
  };

  const downloadAudio = async () => {
    if (!scenes.length || !script) return;
    
    const scenesWithAudio = scenes.filter(scene => scene.audioUrl);
    if (scenesWithAudio.length === 0) {
      toast.error("No audio to download");
      return;
    }

    try {
      toast.info("Preparing audio files for download...");
      const zip = new JSZip();
      
      // Fetch all audio files and add to zip
      for (const scene of scenesWithAudio) {
        if (scene.audioUrl) {
          try {
            const response = await fetch(scene.audioUrl);
            const blob = await response.blob();
            // Audio files from AIML API are typically MP3
            const extension = 'mp3';
            zip.file(`scene_${scene.sceneNumber}_narration.${extension}`, blob);
          } catch (err) {
            console.error(`Failed to fetch audio for scene ${scene.sceneNumber}:`, err);
          }
        }
      }
      
      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${script.title.replace(/\s+/g, '_')}_audio.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${scenesWithAudio.length} audio files!`);
    } catch (error) {
      console.error("Error creating audio zip:", error);
      toast.error("Failed to download audio files");
    }
  };

  const handleGenerateNarration = async () => {
    if (!script || !scenes.length) return;

    setIsProcessing(true);
    try {
      toast.info("Generating narration...");
      await generateNarration(scenes, generationId);
      toast.success("Narration generated successfully!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to generate narration", {
        description: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayAudio = (sceneIndex: number, audioUrl: string) => {
    if (playingAudio === sceneIndex) {
      // Pause current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudio(null);
    } else {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Play new audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
      setPlayingAudio(sceneIndex);
      
      audio.onended = () => {
        setPlayingAudio(null);
        audioRef.current = null;
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Allow both authenticated users and guests
  if (!user && !isGuest) {
    console.log("No user and not guest, redirecting to login", { user, isGuest });
    navigate("/login");
    return null;
  }

  console.log("User state:", { user: !!user, isGuest, guestSessionId });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <Header onReset={handleReset} />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <InputSection
            onGenerate={handleGenerate}
            isProcessing={isProcessing}
            hasError={hasError}
            onRetry={handleRetry}
            lastError={lastError}
            failedStage={failedStage}
          />

          {script && (
            <>
              <ScriptPanel 
                script={script} 
                onRegenerate={() => generationOptionsRef.current && handleGenerate(generationOptionsRef.current)}
              />

              {scenes.length > 0 && (
                <>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">Generated Images</h2>
                        <Button 
                          onClick={downloadImages} 
                          variant="outline" 
                          size="sm"
                          disabled={!scenes.some(s => s.imageUrl)}
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          Download Images (.zip)
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {scenes.map((scene, index) => (
                          <motion.div
                            key={scene.sceneNumber}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="border rounded-lg overflow-hidden"
                          >
                            <div className="aspect-video bg-muted relative">
                              {scene.imageUrl ? (
                                <img
                                  src={scene.imageUrl}
                                  alt={`Scene ${scene.sceneNumber}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : currentlyGenerating === index && !isGeneratingAudio ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <ImageIcon className="w-12 h-12 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Scene {scene.sceneNumber}</h3>
                                {scene.audioUrl && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handlePlayAudio(index, scene.audioUrl!)}
                                  >
                                    {playingAudio === index ? (
                                      <Pause className="w-4 h-4" />
                                    ) : (
                                      <Play className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}
                                {isGeneratingAudio && currentlyGenerating === index && (
                                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {scene.visualDescription}
                              </p>
                              <p className="text-xs text-muted-foreground italic line-clamp-2">
                                "{scene.narration}"
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-bold">Narration</h2>
                          <div className="flex items-center gap-4">
                            {scenes.some(s => s.audioUrl) && (
                              <>
                                <div className="text-sm text-muted-foreground">
                                  {scenes.filter(s => s.audioUrl).length} / {scenes.length} scenes narrated
                                </div>
                                <Button 
                                  onClick={downloadAudio} 
                                  variant="outline" 
                                  size="sm"
                                  disabled={!scenes.some(s => s.audioUrl)}
                                >
                                  <Archive className="w-4 h-4 mr-2" />
                                  Download Audio (.zip)
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Volume2 className="w-4 h-4" />
                            <span className="font-medium">Selected:</span>
                            <span>{getVoiceDisplayName()}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <VoiceSelector
                              selectedVoice={selectedVoice}
                              onVoiceChange={setSelectedVoice}
                              selectedProvider={selectedProvider}
                              onProviderChange={setSelectedProvider}
                              disabled={isProcessing || isGeneratingAudio}
                            />
                            
                            <Button
                              onClick={handleGenerateNarration}
                              disabled={isProcessing || isGeneratingAudio || !scenes.some(s => s.imageUrl)}
                              size="lg"
                            >
                            {isGeneratingAudio ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating Audio...
                              </>
                            ) : scenes.some(s => s.audioUrl) ? (
                              <>
                                <Volume2 className="w-4 h-4 mr-2" />
                                Regenerate Narration
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-4 h-4 mr-2" />
                                Generate Narration
                              </>
                            )}
                          </Button>
                          </div>
                        </div>

                        <div className="bg-muted p-4 rounded-lg text-sm">
                          <p className="font-medium mb-2">About Narration</p>
                          <p className="text-muted-foreground">
                            High-quality text-to-speech narration using OpenAI TTS via AIML API. 
                            Select a voice and click "Generate Narration" to add audio to all scenes.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {isGuest ? (
                    <Card className="p-6">
                      <div className="space-y-4 text-center">
                        <div className="flex items-center justify-center">
                          <Video className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Video Generation</h3>
                          <p className="text-muted-foreground mb-4">
                            Video generation is only available for logged-in users.
                          </p>
                          <Button onClick={() => navigate("/login")} size="lg">
                            Login to Generate Video
                          </Button>
                        </div>
                        <div className="bg-muted p-4 rounded-lg text-sm text-left">
                          <p className="font-medium mb-2">Why login?</p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Videos are saved to your history</li>
                            <li>Download anytime from cloud storage</li>
                            <li>Track all your generations</li>
                          </ul>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <VideoGenerator 
                      scenes={scenes.map((scene) => ({
                        sceneNumber: scene.sceneNumber,
                        text: scene.narration,
                        imageUrl: scene.imageUrl || "",
                        audioUrl: scene.audioUrl
                      }))}
                      scriptTitle={script.title}
                      onVideoGenerated={async (videoUrl) => {
                        if (script && generationOptionsRef.current) {
                          try {
                            const savedId = await saveGenerationToDatabase(script, scenes, generationOptionsRef.current, generationId, videoUrl);
                            if (savedId) {
                              toast.success("Video saved to history!");
                            } else {
                              toast.info("Video generated successfully!", {
                                description: "History not saved due to server issues, but you can download it below."
                              });
                            }
                          } catch (err) {
                            toast.info("Video generated successfully!", {
                              description: "History not saved due to server issues, but you can download it below."
                            });
                          }
                        }
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
