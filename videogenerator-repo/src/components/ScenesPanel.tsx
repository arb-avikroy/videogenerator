import { motion } from "framer-motion";
import { Image, Loader2, Download, Play, Pause, DownloadIcon, Edit2, Check, X, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceSelector } from "@/components/VoiceSelector";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

interface Scene {
  sceneNumber: number;
  visualDescription: string;
  narration: string;
  duration: number;
  imageUrl?: string;
  audioUrl?: string;
}

interface ScenesPanelProps {
  scenes: Scene[];
  isLoading: boolean;
  currentlyGenerating: number | null;
  onDownloadZip: () => void;
  canDownload: boolean;
  onNarrationEdit?: (sceneNumber: number, newNarration: string) => void;
  narrationReady?: boolean;
  selectedVoice?: string;
  onVoiceChange?: (voice: string) => void;
  onGenerateNarration?: () => void;
  isGeneratingAudio?: boolean;
  onRegenerateNarration?: () => void;
  currentWorkflowStep?: string;
}

export const ScenesPanel = ({ 
  scenes, 
  isLoading, 
  currentlyGenerating, 
  onDownloadZip, 
  canDownload,
  onNarrationEdit,
  narrationReady = false,
  selectedVoice,
  onVoiceChange,
  onGenerateNarration,
  isGeneratingAudio = false,
  onRegenerateNarration,
  currentWorkflowStep = "narration"
}: ScenesPanelProps) => {
  const [editingScene, setEditingScene] = useState<number | null>(null);
  const [editedNarration, setEditedNarration] = useState("");
  const [playingAudio, setPlayingAudio] = useState<{ [key: number]: boolean }>({});
  const audioRefs = useRef<{ [key: number]: HTMLAudioElement }>({});

  const handlePlayPauseAudio = async (scene: Scene) => {
    if (!scene.audioUrl) return;

    const sceneNumber = scene.sceneNumber;
    const isPlaying = playingAudio[sceneNumber];

    // Stop all other playing audios
    Object.keys(audioRefs.current).forEach(key => {
      const num = parseInt(key);
      if (num !== sceneNumber && audioRefs.current[num]) {
        audioRefs.current[num].pause();
        audioRefs.current[num].currentTime = 0;
        setPlayingAudio(prev => ({ ...prev, [num]: false }));
      }
    });

    if (isPlaying) {
      // Pause current audio
      if (audioRefs.current[sceneNumber]) {
        audioRefs.current[sceneNumber].pause();
        setPlayingAudio(prev => ({ ...prev, [sceneNumber]: false }));
      }
    } else {
      // Play audio
      if (scene.audioUrl.startsWith('data:text/plain')) {
        // Browser TTS
        try {
          const base64Data = scene.audioUrl.split(',')[1];
          const metadata = JSON.parse(atob(base64Data));
          
          const synth = window.speechSynthesis;
          synth.cancel(); // Cancel any ongoing speech
          
          const utterance = new SpeechSynthesisUtterance(metadata.text);
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          
          utterance.onstart = () => {
            setPlayingAudio(prev => ({ ...prev, [sceneNumber]: true }));
          };
          
          utterance.onend = () => {
            setPlayingAudio(prev => ({ ...prev, [sceneNumber]: false }));
          };
          
          synth.speak(utterance);
        } catch (error) {
          console.error('Browser TTS error:', error);
          toast.error('Failed to play audio');
        }
      } else {
        // Real audio file
        // Always create a new Audio object to avoid caching issues
        if (audioRefs.current[sceneNumber]) {
          audioRefs.current[sceneNumber].pause();
          audioRefs.current[sceneNumber].src = '';
          delete audioRefs.current[sceneNumber];
        }
        
        const audio = new Audio(scene.audioUrl);
        audio.onended = () => {
          setPlayingAudio(prev => ({ ...prev, [sceneNumber]: false }));
        };
        audio.onerror = () => {
          toast.error('Failed to load audio');
          setPlayingAudio(prev => ({ ...prev, [sceneNumber]: false }));
        };
        audioRefs.current[sceneNumber] = audio;
        
        try {
          await audio.play();
          setPlayingAudio(prev => ({ ...prev, [sceneNumber]: true }));
        } catch (error) {
          console.error('Audio play error:', error);
          toast.error('Failed to play audio');
        }
      }
    }
  };

  const handleDownloadAudio = async (scene: Scene) => {
    if (!scene.audioUrl || scene.audioUrl.startsWith('data:text/plain')) {
      toast.error('No audio file to download (browser TTS)');
      return;
    }

    try {
      const response = await fetch(scene.audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scene_${scene.sceneNumber}_narration.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Scene ${scene.sceneNumber} audio downloaded`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download audio');
    }
  };

  const startEditingNarration = (scene: Scene) => {
    setEditingScene(scene.sceneNumber);
    setEditedNarration(scene.narration);
  };

  const saveNarrationEdit = (sceneNumber: number) => {
    if (onNarrationEdit && editedNarration.trim()) {
      onNarrationEdit(sceneNumber, editedNarration.trim());
      toast.success(`Scene ${sceneNumber} narration updated`);
    }
    setEditingScene(null);
    setEditedNarration("");
  };

  const cancelNarrationEdit = () => {
    setEditingScene(null);
    setEditedNarration("");
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = "";
      });
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <motion.div 
      className="panel h-full min-h-80 p-5 flex flex-col"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15 }}
    >
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-primary" />
            <span className="panel-header mb-0">Generated Scenes</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={onDownloadZip}
            disabled={!canDownload || isLoading}
          >
            <Download className="w-4 h-4" />
            Download .zip
          </Button>
        </div>
        
        {narrationReady && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-primary/10 border border-primary/30 rounded-lg"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary" />
                  Narration Ready
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Edit text below, select voice, then generate audio
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedVoice !== undefined && onVoiceChange && (
                  <VoiceSelector 
                    selectedVoice={selectedVoice}
                    onVoiceChange={onVoiceChange}
                  />
                )}
                {onGenerateNarration && (
                  <Button
                    onClick={onGenerateNarration}
                    disabled={isGeneratingAudio}
                    size="sm"
                    className="gap-2"
                  >
                    <Volume2 className="w-4 h-4" />
                    {isGeneratingAudio ? "Generating..." : "Generate"}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
        
        {!narrationReady && scenes.some(s => s.audioUrl) && onRegenerateNarration && currentWorkflowStep === "narration" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-muted border border-border rounded-lg"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">Narration Generated</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Audio has been generated for all scenes
                </p>
              </div>
              <Button
                onClick={onRegenerateNarration}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Volume2 className="w-4 h-4" />
                Regenerate
              </Button>
            </div>
          </motion.div>
        )}
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
              className="flex flex-col gap-3 p-3 bg-secondary/50 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex gap-3">
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
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-primary">
                      Scene {scene.sceneNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {scene.duration}s
                    </span>
                  </div>
                  
                  {editingScene === scene.sceneNumber ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedNarration}
                        onChange={(e) => setEditedNarration(e.target.value)}
                        className="text-sm min-h-[60px]"
                        placeholder="Edit narration..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1"
                          onClick={() => saveNarrationEdit(scene.sceneNumber)}
                        >
                          <Check className="w-3 h-3" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={cancelNarrationEdit}
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/80 line-clamp-2 mb-2">
                      {scene.narration}
                    </p>
                  )}
                </div>
              </div>

              {/* Audio Controls */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                {editingScene !== scene.sceneNumber && (
                  <>
                    {!scene.audioUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 h-7 text-xs"
                        onClick={() => startEditingNarration(scene)}
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </Button>
                    )}
                    
                    {scene.audioUrl && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 h-7 text-xs"
                          onClick={() => handlePlayPauseAudio(scene)}
                        >
                          {playingAudio[scene.sceneNumber] ? (
                            <>
                              <Pause className="w-3 h-3" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              Play
                            </>
                          )}
                        </Button>
                        
                        {!scene.audioUrl.startsWith('data:text/plain') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 h-7 text-xs"
                            onClick={() => handleDownloadAudio(scene)}
                          >
                            <DownloadIcon className="w-3 h-3" />
                            Download
                          </Button>
                        )}
                      </>
                    )}
                  </>
                )}
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
