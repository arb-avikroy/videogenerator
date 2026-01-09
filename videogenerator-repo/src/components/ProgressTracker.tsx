import { motion } from "framer-motion";
import { FileText, Image, Film, Eye, Download, Check, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = "script" | "images" | "narration" | "merge" | "review" | "download";

interface ProgressTrackerProps {
  currentStep: Step;
  completedSteps: Step[];
}

const steps: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "script", label: "Generate Script", icon: FileText },
  { id: "narration", label: "Generate Narration", icon: Volume2 },
  { id: "images", label: "Generate Images", icon: Image },
  { id: "merge", label: "Merge Video", icon: Film },
  { id: "review", label: "Review", icon: Eye },
  { id: "download", label: "Download", icon: Download },
];

export const ProgressTracker = ({ currentStep, completedSteps }: ProgressTrackerProps) => {
  const getStepStatus = (stepId: Step) => {
    if (completedSteps.includes(stepId)) return "completed";
    if (currentStep === stepId) return "current";
    return "pending";
  };

  return (
    <div className="w-full py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Connecting Line */}
          <div className="absolute top-8 left-0 right-0 h-0.5 bg-border mx-16" />
          
          {/* Progress Line */}
          <motion.div 
            className="absolute top-8 left-0 h-0.5 bg-primary mx-16"
            initial={{ width: "0%" }}
            animate={{ 
              width: `${(completedSteps.length / (steps.length - 1)) * 100}%` 
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />

          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center gap-3 relative z-10">
                <motion.div
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
                    status === "completed" && "bg-success",
                    status === "current" && "bg-primary",
                    status === "pending" && "bg-secondary border-2 border-border"
                  )}
                  animate={status === "current" ? {
                    boxShadow: [
                      "0 0 0 0 hsl(30 45% 64% / 0.4)",
                      "0 0 20px 5px hsl(30 45% 64% / 0.3)",
                      "0 0 0 0 hsl(30 45% 64% / 0.4)"
                    ]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {status === "completed" ? (
                    <Check className="w-7 h-7 text-success-foreground" strokeWidth={2.5} />
                  ) : (
                    <Icon 
                      className={cn(
                        "w-7 h-7",
                        status === "current" ? "text-primary-foreground" : "text-muted-foreground"
                      )} 
                      strokeWidth={1.5} 
                    />
                  )}
                </motion.div>
                
                <span className={cn(
                  "text-xs md:text-sm font-medium text-center max-w-20 leading-tight",
                  status === "completed" && "text-success",
                  status === "current" && "text-primary",
                  status === "pending" && "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
