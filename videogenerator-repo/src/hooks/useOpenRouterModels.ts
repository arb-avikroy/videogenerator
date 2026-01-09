import { useState, useEffect } from "react";

export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
}

export const useOpenRouterModels = () => {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("https://openrouter.ai/api/v1/models");
        if (!response.ok) throw new Error("Failed to fetch models");
        
        const data = await response.json();
        
        // Filter only free models (pricing.prompt = "0" AND pricing.completion = "0")
        const freeModels = data.data.filter((model: OpenRouterModel) => 
          model.pricing?.prompt === "0" && model.pricing?.completion === "0"
        );
        
        setModels(freeModels);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load models");
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, []);

  return { models, isLoading, error };
};
