import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOpenRouterModels } from "@/hooks/useOpenRouterModels";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export const ModelSelector = ({ selectedModel, onModelChange, disabled }: ModelSelectorProps) => {
  const { models, isLoading, error } = useOpenRouterModels();

  if (error) {
    return (
      <div className="text-destructive text-sm">
        Failed to load models: {error}
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
        AI Model (Free Models Only)
      </label>
      <Select value={selectedModel} onValueChange={onModelChange} disabled={disabled || isLoading}>
        <SelectTrigger className="w-full bg-secondary border-2 border-border">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading models...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select a model" />
          )}
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name || model.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
