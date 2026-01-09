import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Info, Volume2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceOption {
  value: string;
  label: string;
  provider: string;
  language?: string;
  gender?: string;
  quality?: string;
}

interface TTSProvider {
  name: string;
  icon: string;
  freeCredits: string;
  quality: string;
  voices: VoiceOption[];
  setup: string;
  recommended?: boolean;
}

// Only Google Cloud TTS is configured
const ttsProviders: TTSProvider[] = [
  {
    name: "Google Cloud TTS",
    icon: "🎙️",
    freeCredits: "1M chars/month",
    quality: "⭐⭐⭐⭐⭐",
    recommended: true,
    setup: "Currently configured",
    voices: [
      { value: "en-US-Neural2-J", label: "US Male (Neural2-J)", provider: "google", language: "en-US", gender: "Male", quality: "High" },
      { value: "en-US-Neural2-F", label: "US Female (Neural2-F)", provider: "google", language: "en-US", gender: "Female", quality: "High" },
      { value: "en-US-Neural2-D", label: "US Warm Male (Neural2-D)", provider: "google", language: "en-US", gender: "Male", quality: "High" },
      { value: "en-US-Neural2-C", label: "US Professional Female (Neural2-C)", provider: "google", language: "en-US", gender: "Female", quality: "High" },
      { value: "en-GB-Neural2-D", label: "UK Male (Neural2-D)", provider: "google", language: "en-GB", gender: "Male", quality: "High" },
      { value: "en-GB-Neural2-F", label: "UK Female (Neural2-F)", provider: "google", language: "en-GB", gender: "Female", quality: "High" },
      { value: "en-AU-Neural2-B", label: "AU Male (Neural2-B)", provider: "google", language: "en-AU", gender: "Male", quality: "High" },
      { value: "en-AU-Neural2-C", label: "AU Female (Neural2-C)", provider: "google", language: "en-AU", gender: "Female", quality: "High" },
    ],
  },
];

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
}

export const VoiceSelector = ({ selectedVoice, onVoiceChange }: VoiceSelectorProps) => {
  const [open, setOpen] = useState(false);

  // Find current provider and voice
  const getCurrentVoice = () => {
    for (const provider of ttsProviders) {
      const voice = provider.voices.find(v => v.value === selectedVoice);
      if (voice) return { provider, voice };
    }
    return null;
  };

  const current = getCurrentVoice();
  const displayLabel = current?.voice.label || "Select Voice";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Volume2 className="w-4 h-4" />
          {displayLabel}
          <Info className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-primary" />
            Select Narration Voice
          </DialogTitle>
          <DialogDescription>
            Choose a voice for high-quality narration using Google Cloud Text-to-Speech.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {ttsProviders.map((provider) => (
            <div key={provider.name} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{provider.icon}</span>
                <h3 className="font-semibold text-lg">{provider.name}</h3>
                <Badge variant="default" className="gap-1">
                  <Sparkles className="w-3 h-3" />
                  Active
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <strong>Free:</strong> {provider.freeCredits}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <strong>Quality:</strong> {provider.quality}
                </span>
              </div>

              <Select
                value={selectedVoice}
                onValueChange={onVoiceChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available Voices</SelectLabel>
                    {provider.voices.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        <div className="flex items-center gap-2">
                          <span>{voice.label}</span>
                          {voice.gender && (
                            <Badge variant="outline" className="text-xs">
                              {voice.gender}
                            </Badge>
                          )}
                          {voice.language && voice.language !== "en-US" && (
                            <Badge variant="secondary" className="text-xs">
                              {voice.language}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Note:</strong> If Google Cloud TTS fails, the system automatically falls back to browser TTS.
          </p>
        </div>

        <Button onClick={() => setOpen(false)} className="w-full">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
};
