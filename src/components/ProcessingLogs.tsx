import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { useEffect, useRef } from "react";

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

interface ProcessingLogsProps {
  logs: LogEntry[];
}

export const ProcessingLogs = ({ logs }: ProcessingLogsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success": return "text-success";
      case "error": return "text-destructive";
      case "warning": return "text-primary";
      default: return "text-terminal-green";
    }
  };

  return (
    <motion.div 
      className="panel h-full min-h-80 p-5 flex flex-col"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.25 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Terminal className="w-4 h-4 text-primary" />
        <span className="panel-header mb-0">Processing Logs</span>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 bg-background rounded-lg p-4 overflow-auto scrollbar-thin font-mono text-xs"
      >
        {logs.length > 0 ? (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <motion.div
                key={index}
                className="flex gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                <span className="text-muted-foreground shrink-0">
                  [{log.timestamp}]
                </span>
                <span className={getLogColor(log.type)}>
                  {log.message}
                </span>
              </motion.div>
            ))}
            <span className="inline-block w-2 h-4 bg-terminal-green animate-pulse" />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-center">
              Logs will appear here during processing
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
