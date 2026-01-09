import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle, RotateCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelSelector } from "@/components/ModelSelector";
import { WorkflowControls, WorkflowStep } from "@/components/WorkflowControls";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface GenerationOptions {
  topic: string;
  sceneCount: number;
  sceneDuration: number;
  model: string;
  imageProvider?: string;
  videoModel?: string;
  aspectRatio?: string;
  resolution?: string;
}

export type GenerationStage = 'script' | 'image' | 'video' | null;

interface InputSectionProps {
  onGenerate: (options: GenerationOptions) => void;
  onProceedStep: () => void;
  onRunAutomatic: () => void;
  isProcessing: boolean;
  isWaitingForProceed: boolean;
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  isAutomatic: boolean;
  onToggleMode: (automatic: boolean) => void;
  onReset: () => void;
  hasError?: boolean;
  lastError?: string | null;
  failedStage?: GenerationStage;
  onRetry?: (options: GenerationOptions) => void;
  onRetryVideo?: () => void;
  lastOptions?: GenerationOptions | null;
}

export const InputSection = ({
  onGenerate,
  onProceedStep,
  onRunAutomatic,
  isProcessing,
  isWaitingForProceed,
  currentStep,
  completedSteps,
  isAutomatic,
  onToggleMode,
  onReset,
  hasError = false,
  lastError = null,
  failedStage = null,
  onRetry,
  onRetryVideo,
  lastOptions,
}: InputSectionProps) => {
  const [topic, setTopic] = useState(lastOptions?.topic || "");
  const [sceneCount, setSceneCount] = useState(lastOptions?.sceneCount.toString() || "6");
  const [sceneDuration, setSceneDuration] = useState(lastOptions?.sceneDuration.toString() || "4");
  const [selectedModel, setSelectedModel] = useState(lastOptions?.model || "google/gemini-2.5-flash-exp:free");
  const [selectedProvider, setSelectedProvider] = useState(lastOptions?.imageProvider || "imagegen");
  const [aspectRatio, setAspectRatio] = useState(lastOptions?.aspectRatio || "16:9");
  const [resolution, setResolution] = useState(lastOptions?.resolution || "1080p");
  const [retryModel, setRetryModel] = useState("");
  const [retryProvider, setRetryProvider] = useState("");

  const randomTopics = [
    "Why Most Startups Fail in Their First Year",
    "AI Tools That Can Replace an Entire Team",
    "How Algorithms Control What You See Online",
    "The Dark Side of Hustle Culture",
    "How Billionaires Actually Think About Money",
    "The Psychology Behind Viral Content",
    "Why Minimalism Is Making a Comeback",
    "Future Jobs That Don’t Exist Yet",
    "How Tech Addiction Is Rewiring Our Brains",
    "The Truth About Passive Income",
    "Why Time Is More Valuable Than Money",
    "How Side Hustles Turn Into Full-Time Businesses",
    "The Rise of Creator-Owned Platforms",
    "What Happens When Cash Completely Disappears",
    "How Branding Shapes Your Identity Online",
    "The Real Cost of Free Apps",
    "Why Attention Is the New Currency",
    "How Small Habits Create Massive Life Changes",
    "The Science Behind Decision Making",
    "Why Consistency Beats Talent Every Time",
    "How AI Is Changing Everyday Life",
    "Why Most People Stay Broke Without Realizing It",
    "The Hidden Business Model of Social Media",
    "How to Build Wealth Without a High Salary",
    "Why Motivation Is Overrated",
    "The Future of Work After Automation",
    "How Fear Controls Human Decisions",
    "Why Comfort Zones Kill Growth",
    "The Rise of Personal Brands",
    "What Schools Don’t Teach About Money",
    "How Trends Are Manufactured Online",
    "Why Discipline Beats Motivation",
    "The Loneliness Epidemic in the Digital Age",
    "How Technology Shapes Human Behavior",
    "Why Long-Term Thinking Is Rare",
    "The Economics of Influencer Marketing",
    "How Sleep Affects Success",
    "Why Simplicity Wins in Business",
    "The Myth of Overnight Success",
    "How Data Is Becoming the New Oil",
    "Why Focus Is a Superpower",
    "How Small Decisions Compound Over Time",
    "The Evolution of Online Communities",
    "Why Most Goals Fail",
    "How AI Personal Assistants Will Change Life",
    "The Future of Money and Digital Payments",
    "Why People Follow Trends Blindly",
    "How Curiosity Drives Innovation",
    "The Hidden Cost of Convenience",
    "Why Thinking Alone Is Becoming Rare",
    "How Technology Is Redefining Privacy",
    "The Science of Building Habits",
    "Why Deep Work Is Disappearing",
    "How Automation Creates New Opportunities",
    "The Power of Saying No",
    "Why Attention Spans Are Shrinking",
    "How Ideas Spread Faster Than Ever",
    "The Real Meaning of Financial Freedom",
    "The Future of AI in Investing",
    "Sustainable Energy Solutions for Tomorrow",
    "The Rise of Digital Nomads in 2026",
    "Blockchain Technology and Financial Freedom",
    "Mental Health in the Tech Industry",
    "The Evolution of Electric Vehicles",
    "Space Tourism: The Next Frontier",
    "Cryptocurrency Trading Strategies",
    "Climate Change and Global Investment Trends",
    "The Metaverse and Virtual Real Estate",
    "Remote Work Revolution",
    "NFTs and Digital Art Markets",
    "Quantum Computing Breakthroughs",
    "The Impact of 5G Technology",
    "Artificial Intelligence in Healthcare",
    "The Future of Online Education",
    "Smart Cities and Urban Development",
    "Personal Finance Tips for Millennials",
    "The Growth of E-commerce Giants",
    "Robotics and Automation in Manufacturing"
  ];

  const generateRandomTopic = () => {
    if (!isInputDisabled) {
      const randomIndex = Math.floor(Math.random() * randomTopics.length);
      setTopic(randomTopics[randomIndex]);
    }
  };

  const isModelStepComplete = completedSteps.includes("model");
  const isInputDisabled = isProcessing || isWaitingForProceed || isModelStepComplete || hasError;
  const canProceed = topic.trim() !== "" && selectedModel !== "";

  const handleRetry = () => {
    if (canProceed && onRetry) {
      onRetry({
        topic: topic.trim(),
        sceneCount: parseInt(sceneCount),
        sceneDuration: parseInt(sceneDuration),
        model: failedStage === 'script' && retryModel ? retryModel : selectedModel,
        imageProvider: failedStage === 'image' && retryProvider ? retryProvider : selectedProvider,
        aspectRatio,
        resolution
      });
      
      // Reset retry selections
      setRetryModel("");
      setRetryProvider("");
    }
  };

  const handleProceedNext = () => {
    if (currentStep === "model" && canProceed) {
      onGenerate({
        topic: topic.trim(),
        sceneCount: parseInt(sceneCount),
        sceneDuration: parseInt(sceneDuration),
        model: selectedModel,
        imageProvider: selectedProvider,
        aspectRatio,
        resolution
      });
    } else {
      onProceedStep();
    }
  };

  const handleRunAutomatic = () => {
    if (canProceed) {
      onGenerate({
        topic: topic.trim(),
        sceneCount: parseInt(sceneCount),
        sceneDuration: parseInt(sceneDuration),
        model: selectedModel,
        imageProvider: selectedProvider,
        aspectRatio,
        resolution
      });
      onRunAutomatic();
    }
  };

  return (
    <motion.section
      className="w-full px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-6">
          {/* Topic Input */}
          <div className="relative">
            <label className="block text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Enter Your Video Topic
            </label>
            <div className="relative group">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., 'The Future of AI in Investing'"
                disabled={isInputDisabled}
                className="w-full px-6 py-5 bg-secondary border-2 border-border rounded-xl text-foreground text-lg placeholder:text-muted-foreground/60 transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_hsl(30_45%_64%_/_0.3),0_0_20px_hsl(30_45%_64%_/_0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={generateRandomTopic}
                disabled={isInputDisabled}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-primary/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                title="Generate random topic"
              >
                <Sparkles className="w-5 h-5 text-muted-foreground/40 group-hover/btn:text-primary group-focus-within:text-primary transition-colors" />
              </button>
            </div>
          </div>

          {/* Model Selector */}
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={isInputDisabled}
          />

          {/* Scene Count and Duration */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Number of Scenes
              </label>
              <Select
                value={sceneCount}
                onValueChange={setSceneCount}
                disabled={isInputDisabled}
              >
                <SelectTrigger className="w-full bg-secondary border-2 border-border">
                  <SelectValue placeholder="Select scenes" />
                </SelectTrigger>
                <SelectContent>
                  {[4, 5, 6, 7, 8, 9, 10, 12, 15].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} scenes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Scene Duration
              </label>
              <Select
                value={sceneDuration}
                onValueChange={setSceneDuration}
                disabled={isInputDisabled}
              >
                <SelectTrigger className="w-full bg-secondary border-2 border-border">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {[4, 6, 8].map((sec) => (
                    <SelectItem key={sec} value={sec.toString()}>
                      {sec} seconds
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Image Provider
              </label>
              <Select
                value={selectedProvider}
                onValueChange={setSelectedProvider}
                disabled={isInputDisabled}
              >
                <SelectTrigger className="w-full bg-secondary border-2 border-border">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imagegen">ImageGen (Free API)</SelectItem>
                  <SelectItem value="huggingface">Hugging Face</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="none">No Provider (Demo) - client-only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Video Generation Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Aspect Ratio
              </label>
              <Select
                value={aspectRatio}
                onValueChange={setAspectRatio}
                disabled={isInputDisabled}
              >
                <SelectTrigger className="w-full bg-secondary border-2 border-border">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Resolution
              </label>
              <Select
                value={resolution}
                onValueChange={setResolution}
                disabled={isInputDisabled}
              >
                <SelectTrigger className="w-full bg-secondary border-2 border-border">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                  <SelectItem value="720p">720p (HD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Error Retry Section */}
        {hasError && (
          <Alert variant="destructive" className="border-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Generation Failed</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p className="text-sm">{lastError}</p>
              
              {/* Model selector for failed stage */}
              {failedStage === 'script' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2">Choose Different Script AI Model:</label>
                  <ModelSelector
                    selectedModel={retryModel || selectedModel}
                    onModelChange={setRetryModel}
                    disabled={false}
                  />
                </div>
              )}
              
              {failedStage === 'image' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2">Choose Different Image Provider:</label>
                  <Select
                    value={retryProvider || selectedProvider}
                    onValueChange={setRetryProvider}
                  >
                    <SelectTrigger className="w-full bg-secondary border-2 border-border">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imagegen">ImageGen.AI (Fast, Good Quality)</SelectItem>
                      <SelectItem value="huggingface">Hugging Face (Free, Slower)</SelectItem>
                      <SelectItem value="openrouter">OpenRouter (Best Quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex gap-3">
                {failedStage === 'video' ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRetryVideo}
                      disabled={isProcessing}
                      className="gap-2"
                    >
                      <RotateCw className="w-4 h-4" />
                      Retry Video Generation
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onReset}
                    >
                      Start Fresh
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      disabled={!canProceed || isProcessing}
                      className="gap-2"
                    >
                      <RotateCw className="w-4 h-4" />
                      Retry with {failedStage === 'script' ? 'Different Model' : failedStage === 'image' ? 'Different Provider' : 'Changes'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onReset}
                    >
                      Start Fresh
                    </Button>
                  </>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Workflow Controls */}
        <WorkflowControls
          currentStep={currentStep}
          completedSteps={completedSteps}
          isAutomatic={isAutomatic}
          onToggleMode={onToggleMode}
          onProceedNext={handleProceedNext}
          onRunAutomatic={handleRunAutomatic}
          isProcessing={isProcessing}
          isWaitingForProceed={isWaitingForProceed}
          canProceed={canProceed}
          onReset={onReset}
        />
      </div>
    </motion.section>
  );
};
