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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Volume2 } from "lucide-react";

interface VoiceOption {
  value: string;
  label: string;
  gender: string;
}

// AIML API (OpenAI TTS) voices
const aimlVoices: VoiceOption[] = [
  { value: "alloy", label: "Alloy (Neutral)", gender: "Neutral" },
  { value: "echo", label: "Echo (Male)", gender: "Male" },
  { value: "fable", label: "Fable (British Male)", gender: "Male" },
  { value: "onyx", label: "Onyx (Deep Male)", gender: "Male" },
  { value: "nova", label: "Nova (Female)", gender: "Female" },
  { value: "shimmer", label: "Shimmer (Female)", gender: "Female" },
  { value: "coral", label: "Coral (Warm Female)", gender: "Female" },
];

// Voice RSS voices (language codes)
const voiceRssVoices: VoiceOption[] = [
  { value: "en-us", label: "English US (Male)", gender: "Male" },
  { value: "en-gb", label: "English UK (Male)", gender: "Male" },
  { value: "en-au", label: "English AU (Male)", gender: "Male" },
  { value: "en-in", label: "English India (Male)", gender: "Male" },
  { value: "es-es", label: "Spanish Spain (Male)", gender: "Male" },
  { value: "es-mx", label: "Spanish Mexico (Male)", gender: "Male" },
  { value: "fr-fr", label: "French (Male)", gender: "Male" },
  { value: "de-de", label: "German (Male)", gender: "Male" },
  { value: "it-it", label: "Italian (Male)", gender: "Male" },
  { value: "pt-br", label: "Portuguese Brazil (Male)", gender: "Male" },
  { value: "ja-jp", label: "Japanese (Female)", gender: "Female" },
  { value: "ko-kr", label: "Korean (Female)", gender: "Female" },
  { value: "zh-cn", label: "Chinese Mandarin (Female)", gender: "Female" },
  { value: "hi-in", label: "Hindi (Female)", gender: "Female" },
];

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
  disabled?: boolean;
}

export const VoiceSelector = ({ 
  selectedVoice, 
  onVoiceChange, 
  selectedProvider,
  onProviderChange,
  disabled = false 
}: VoiceSelectorProps) => {
  const [open, setOpen] = useState(false);

  const getCurrentVoices = () => {
    return selectedProvider === "voicerss" ? voiceRssVoices : aimlVoices;
  };

  const selectedVoiceData = getCurrentVoices().find(v => v.value === selectedVoice);

  const handleProviderChange = (provider: string) => {
    onProviderChange(provider);
    // Set default voice for the provider
    if (provider === "voicerss") {
      onVoiceChange("en-us");
    } else {
      onVoiceChange("coral");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} className="w-full">
          <Volume2 className="w-4 h-4 mr-2" />
          {selectedVoiceData ? selectedVoiceData.label : "Select Voice"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Narration Voice</DialogTitle>
          <DialogDescription>
            Choose a TTS provider and voice for narrating your video scenes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={selectedProvider} onValueChange={handleProviderChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="aiml">AIML (OpenAI)</TabsTrigger>
              <TabsTrigger value="voicerss">Voice RSS</TabsTrigger>
            </TabsList>
            
            <TabsContent value="aiml" className="space-y-4">
              <Select value={selectedVoice} onValueChange={onVoiceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>OpenAI TTS Voices</SelectLabel>
                    {aimlVoices.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        {voice.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <p className="font-medium">About AIML (OpenAI TTS)</p>
                <p className="text-muted-foreground">
                  High-quality, natural-sounding voices powered by OpenAI's latest TTS models.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="voicerss" className="space-y-4">
              <Select value={selectedVoice} onValueChange={onVoiceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Voice RSS Languages</SelectLabel>
                    {voiceRssVoices.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        {voice.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <p className="font-medium">About Voice RSS</p>
                <p className="text-muted-foreground">
                  Multi-language TTS service with support for 40+ languages and dialects.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <Button 
            onClick={() => setOpen(false)} 
            className="w-full"
          >
            Confirm Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
