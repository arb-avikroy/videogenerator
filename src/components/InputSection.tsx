import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelSelector } from "@/components/ModelSelector";
import { WorkflowControls, WorkflowStep } from "@/components/WorkflowControls";

export interface GenerationOptions {
  topic: string;
  sceneCount: number;
  sceneDuration: number;
  model: string;
}

interface InputSectionProps {
  onGenerate: (options: GenerationOptions) => void;
  onProceedStep: () => void;
  onRunAutomatic: () => void;
  isProcessing: boolean;
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  isAutomatic: boolean;
  onToggleMode: (automatic: boolean) => void;
}

export const InputSection = ({ 
  onGenerate, 
  onProceedStep,
  onRunAutomatic,
  isProcessing,
  currentStep,
  completedSteps,
  isAutomatic,
  onToggleMode,
}: InputSectionProps) => {
  const [topic, setTopic] = useState("");
  const [sceneCount, setSceneCount] = useState("6");
  const [sceneDuration, setSceneDuration] = useState("5");
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash-exp:free");

  const isModelStepComplete = completedSteps.includes("model");
  const canProceed = topic.trim() !== "" && selectedModel !== "";

  const handleProceedNext = () => {
    if (currentStep === "model" && canProceed) {
      onGenerate({
        topic: topic.trim(),
        sceneCount: parseInt(sceneCount),
        sceneDuration: parseInt(sceneDuration),
        model: selectedModel,
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
                disabled={isProcessing || isModelStepComplete}
                className="w-full px-6 py-5 bg-secondary border-2 border-border rounded-xl text-foreground text-lg placeholder:text-muted-foreground/60 transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_hsl(30_45%_64%_/_0.3),0_0_20px_hsl(30_45%_64%_/_0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          {/* Model Selector */}
          <ModelSelector 
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={isProcessing || isModelStepComplete}
          />

          {/* Scene Count and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Number of Scenes
              </label>
              <Select 
                value={sceneCount} 
                onValueChange={setSceneCount} 
                disabled={isProcessing || isModelStepComplete}
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
                disabled={isProcessing || isModelStepComplete}
              >
                <SelectTrigger className="w-full bg-secondary border-2 border-border">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7, 8, 10].map((sec) => (
                    <SelectItem key={sec} value={sec.toString()}>
                      {sec} seconds
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Workflow Controls */}
        <WorkflowControls
          currentStep={currentStep}
          completedSteps={completedSteps}
          isAutomatic={isAutomatic}
          onToggleMode={onToggleMode}
          onProceedNext={handleProceedNext}
          onRunAutomatic={handleRunAutomatic}
          isProcessing={isProcessing}
          canProceed={canProceed}
        />
      </div>
    </motion.section>
  );
};
