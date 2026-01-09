import { motion } from "framer-motion";
import { FileText, Copy, Check, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Scene {
  sceneNumber: number;
  visualDescription: string;
  narration: string;
  duration: number;
  audioUrl?: string;
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">{script.title}</h3>
            {script.scenes.map((scene, index) => (
              <Card key={index} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Scene {scene.sceneNumber}</h4>
                  {scene.audioUrl && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        // Check if it's a real audio URL or browser TTS metadata
                        if (scene.audioUrl.startsWith('data:text/plain')) {
                          // Browser TTS fallback
                          try {
                            const base64Data = scene.audioUrl.split(',')[1];
                            const metadata = JSON.parse(atob(base64Data));
                            
                            const synth = window.speechSynthesis;
                            synth.cancel(); // Stop any ongoing speech
                            
                            const utterance = new SpeechSynthesisUtterance(metadata.text);
                            utterance.rate = 0.9;
                            utterance.pitch = 1.0;
                            utterance.volume = 1.0;
                            
                            const voices = synth.getVoices();
                            const englishVoice = voices.find(v => v.lang.startsWith('en-')) || voices[0];
                            if (englishVoice) {
                              utterance.voice = englishVoice;
                            }
                            
                            synth.speak(utterance);
                          } catch (err) {
                            console.error('Error playing browser TTS:', err);
                          }
                        } else {
                          // Real audio file - use audio element
                          const audio = new Audio(scene.audioUrl);
                          audio.play().catch(err => console.error('Error playing audio:', err));
                        }
                      }}
                    >
                      <Volume2 className="w-4 h-4 mr-1" />
                      Play Narration
                    </Button>
                  )}
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Visual:</p>
                  <p className="text-foreground/90 mb-3">{scene.visualDescription}</p>
                  <p className="text-muted-foreground mb-1">Narration:</p>
                  <p className="text-foreground/90 italic">{scene.narration}</p>
                  
                  {/* Show audio player for real audio files */}
                  {scene.audioUrl && !scene.audioUrl.startsWith('data:text/plain') && (
                    <audio controls className="w-full mt-2" src={scene.audioUrl}>
                      Your browser does not support the audio element.
                    </audio>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Duration: {scene.duration}s</p>
              </Card>
            ))}
          </div>
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
