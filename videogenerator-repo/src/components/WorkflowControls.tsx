import { motion } from "framer-motion";
import { Play, FastForward, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export type WorkflowStep = "model" | "script" | "narration" | "images" | "video";

interface WorkflowControlsProps {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  isAutomatic: boolean;
  onToggleMode: (automatic: boolean) => void;
  onProceedNext: () => void;
  onRunAutomatic: () => void;
  isProcessing: boolean;
  isWaitingForProceed: boolean;
  canProceed: boolean;
  onReset: () => void;
}

const WORKFLOW_STEPS: { id: WorkflowStep; label: string }[] = [
  { id: "model", label: "Model Selection" },
  { id: "script", label: "Script Generation" },
  { id: "narration", label: "Narration Generation" },
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
  isWaitingForProceed,
  canProceed,
  onReset,
}: WorkflowControlsProps) => {
  const hasStarted = completedSteps.length > 0 || isProcessing || isWaitingForProceed;
  const isWorkflowActive = isProcessing || isWaitingForProceed;
  
  // In manual mode: button enabled when:
  // 1. At model step with valid input
  // 2. At narration step and narration is completed
  // 3. At images step and images are completed
  // 4. Waiting for proceed at any step
  const canProceedManual = !isAutomatic && (
    (currentStep === "model" && canProceed && !isProcessing) ||
    (currentStep === "narration" && completedSteps.includes("narration") && !isProcessing) ||
    (currentStep === "images" && completedSteps.includes("images") && !isProcessing) ||
    isWaitingForProceed
  );
  
  // In automatic mode: button enabled only at model step with valid input and not already running
  const canRunAutomatic = isAutomatic && currentStep === "model" && canProceed && !isProcessing && !isWaitingForProceed;

  return (
    <div className="space-y-4">
      {/* Step Indicator - Only show in Manual mode */}
      {!isAutomatic && (
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
      )}

      {/* Mode Toggle */}
      <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <Switch
            id="mode-toggle"
            checked={isAutomatic}
            onCheckedChange={onToggleMode}
            disabled={isWorkflowActive}
          />
          <Label htmlFor="mode-toggle" className="cursor-pointer">
            {isAutomatic ? "Automatic Mode" : "Manual Mode"}
          </Label>
        </div>
        
        <div className="flex gap-3">
          {hasStarted && (
            <Button
              variant="outline"
              onClick={onReset}
              disabled={isProcessing}
              className="min-w-24"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
          
          {!isAutomatic ? (
            <Button
              variant="hero"
              onClick={onProceedNext}
              disabled={!canProceedManual}
              className="min-w-32"
            >
              <Play className="w-4 h-4 mr-2" />
              Proceed Next
            </Button>
          ) : (
            <Button
              variant="hero"
              onClick={onRunAutomatic}
              disabled={!canRunAutomatic}
              className="min-w-32"
            >
              <FastForward className="w-4 h-4 mr-2" />
              Run Automatic
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
