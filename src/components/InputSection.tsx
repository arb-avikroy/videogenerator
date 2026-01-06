import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InputSectionProps {
  onGenerate: (topic: string) => void;
  isProcessing: boolean;
}

export const InputSection = ({ onGenerate, isProcessing }: InputSectionProps) => {
  const [topic, setTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && !isProcessing) {
      onGenerate(topic.trim());
    }
  };

  return (
    <motion.section 
      className="w-full px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
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
                disabled={isProcessing}
                className="w-full px-6 py-5 bg-secondary border-2 border-border rounded-xl text-foreground text-lg placeholder:text-muted-foreground/60 transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_hsl(30_45%_64%_/_0.3),0_0_20px_hsl(30_45%_64%_/_0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              type="submit"
              variant="hero"
              disabled={!topic.trim() || isProcessing}
              className="min-w-64"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Generate Video
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </motion.section>
  );
};
