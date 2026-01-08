import { motion } from "framer-motion";
import { Play, FastForward, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export type WorkflowStep = "model" | "script" | "images" | "video";

interface WorkflowControlsProps {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  isAutomatic: boolean;
  onToggleMode: (automatic: boolean) => void;
  onProceedNext: () => void;
  onRunAutomatic: () => void;
  isProcessing: boolean;
  canProceed: boolean;
}

const WORKFLOW_STEPS: { id: WorkflowStep; label: string }[] = [
  { id: "model", label: "Model Selection" },
  { id: "script", label: "Script Generation" },
  { id: "images", label: "Image Generation" },
  { id: "video", label: "Video Generation" },
];

export const WorkflowControls = ({
  currentStep,
  completedSteps,
  isAutomatic,
  onToggleMode,
  onProceedNext,
  onRunAutomatic,
  isProcessing,
  canProceed,
}: WorkflowControlsProps) => {
  const currentStepIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="space-y-4">
      {/* Step Indicator */}
      <div className="flex items-center justify-between gap-2">
        {WORKFLOW_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          
          return (
            <div key={step.id} className="flex items-center gap-2 flex-1">
              <motion.div
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  transition-colors duration-200
                  ${isCompleted 
                    ? "bg-primary text-primary-foreground" 
                    : isCurrent 
                      ? "bg-primary/20 border-2 border-primary text-primary" 
                      : "bg-muted text-muted-foreground"
                  }
                `}
                initial={false}
                animate={{ scale: isCurrent ? 1.1 : 1 }}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </motion.div>
              <span className={`text-xs hidden sm:block ${isCurrent ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {step.label}
              </span>
              {index < WORKFLOW_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${isCompleted ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <Switch
            id="mode-toggle"
            checked={isAutomatic}
            onCheckedChange={onToggleMode}
            disabled={isProcessing}
          />
          <Label htmlFor="mode-toggle" className="cursor-pointer">
            {isAutomatic ? "Automatic Mode" : "Manual Mode"}
          </Label>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onProceedNext}
            disabled={isAutomatic || isProcessing || !canProceed}
            className="min-w-32"
          >
            <Play className="w-4 h-4 mr-2" />
            Proceed Next
          </Button>
          <Button
            variant="hero"
            onClick={onRunAutomatic}
            disabled={!isAutomatic || isProcessing || !canProceed}
            className="min-w-32"
          >
            <FastForward className="w-4 h-4 mr-2" />
            Run Automatic
          </Button>
        </div>
      </div>
    </div>
  );
};
