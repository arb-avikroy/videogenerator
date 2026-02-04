import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle, RotateCw } from "lucide-react";
import { ModelSelector } from "@/components/ModelSelector";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface GenerationOptions {
  topic: string;
  sceneCount: number;
  sceneDuration: number;
  model: string;
}

export type GenerationStage = 'script' | 'image' | null;

interface InputSectionProps {
  onGenerate: (options: GenerationOptions) => void;
  isProcessing: boolean;
  hasError?: boolean;
  lastError?: string | null;
  failedStage?: GenerationStage;
  onRetry?: () => void;
}

const randomTopics = [
  "Why Most Startups Fail in Their First Year",
  "AI Tools That Can Replace an Entire Team",
  "How Algorithms Control What You See Online",
  "The Dark Side of Hustle Culture",
  "How Billionaires Actually Think About Money",
  "The Psychology Behind Viral Content",
  "Future Jobs That Don't Exist Yet",
  "How Tech Addiction Is Rewiring Our Brains",
  "The Truth About Passive Income",
  "Why Time Is More Valuable Than Money",
];

export const InputSection = ({
  onGenerate,
  isProcessing,
  hasError = false,
  lastError = null,
  failedStage = null,
  onRetry,
}: InputSectionProps) => {
  const [topic, setTopic] = useState("");
  const [sceneCount, setSceneCount] = useState("6");
  const [sceneDuration, setSceneDuration] = useState("4");
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash-exp:free");

  const handleRandomTopic = () => {
    const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
    setTopic(randomTopic);
  };

  const handleGenerate = () => {
    if (!topic.trim()) return;
    
    const options: GenerationOptions = {
      topic: topic.trim(),
      sceneCount: parseInt(sceneCount),
      sceneDuration: parseInt(sceneDuration),
      model: selectedModel,
    };
    
    onGenerate(options);
  };

  const isFormValid = topic.trim().length > 0 && !isProcessing;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Generate Script & Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasError && lastError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error in {failedStage} generation</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>{lastError}</span>
                {onRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRetry}
                    className="ml-4"
                  >
                    <RotateCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="topic">Video Topic</Label>
            <div className="flex gap-2">
              <Input
                id="topic"
                placeholder="Enter your video topic..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isProcessing}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleRandomTopic}
                disabled={isProcessing}
              >
                Random
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sceneCount">Number of Scenes</Label>
              <Select
                value={sceneCount}
                onValueChange={setSceneCount}
                disabled={isProcessing}
              >
                <SelectTrigger id="sceneCount">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} scenes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sceneDuration">Scene Duration (seconds)</Label>
              <Select
                value={sceneDuration}
                onValueChange={setSceneDuration}
                disabled={isProcessing}
              >
                <SelectTrigger id="sceneDuration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7, 8, 10].map((duration) => (
                    <SelectItem key={duration} value={duration.toString()}>
                      {duration}s
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>AI Model for Script Generation</Label>
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              disabled={isProcessing}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!isFormValid}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Script & Images
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
