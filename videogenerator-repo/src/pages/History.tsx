import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Download, Loader2, Trash2, FileText, Image, Volume2, Video } from "lucide-react";
import JSZip from "jszip";
import { motion } from "framer-motion";

interface Generation {
  id: string;
  title: string;
  topic: string | null;
  created_at: string;
  script: any;
  images: any[];
  narration_audio: any[];
  merged_video: string | null;
  metadata: any;
}

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchGenerations = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("generations")
        .select("id, title, topic, created_at, script, metadata")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map data without additional queries
      const generationsWithCounts = (data || []).map((gen) => ({
        ...gen,
        images: gen.script?.scenes || [],
        narration_audio: gen.script?.scenes || [],
        merged_video: null,
      }));

      setGenerations(generationsWithCounts as Generation[]);
    } catch (error) {
      console.error("Error fetching generations:", error);
      toast.error("Failed to load generation history");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    let mounted = true;
    
    if (user && !authLoading && mounted) {
      fetchGenerations();
    }
    
    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  const downloadGeneration = async (generation: Generation) => {
    setDownloadingId(generation.id);
    try {
      // Fetch the full generation data including large fields
      const { data: fullData, error } = await supabase
        .from("generations")
        .select("*")
        .eq("id", generation.id)
        .single();

      if (error) throw error;
      if (!fullData) throw new Error("Generation not found");

      const zip = new JSZip();

      // Add script as JSON
      if (fullData.script) {
        zip.file("script.json", JSON.stringify(fullData.script, null, 2));
      }

      // Download and add images
      if (fullData.images && fullData.images.length > 0) {
        const imagesFolder = zip.folder("images");
        for (let i = 0; i < fullData.images.length; i++) {
          const img = fullData.images[i];
          if (img.url) {
            try {
              const response = await fetch(img.url);
              const blob = await response.blob();
              imagesFolder?.file(`scene_${i + 1}.jpg`, blob);
            } catch (err) {
              console.error(`Failed to download image ${i + 1}:`, err);
            }
          }
        }
      }

      // Download and add audio files
      if (fullData.narration_audio && fullData.narration_audio.length > 0) {
        const audioFolder = zip.folder("audio");
        for (let i = 0; i < fullData.narration_audio.length; i++) {
          const audio = fullData.narration_audio[i];
          if (audio.audioUrl) {
            try {
              // Handle base64 data URLs
              if (audio.audioUrl.startsWith("data:")) {
                const base64Data = audio.audioUrl.split(",")[1];
                const binaryData = atob(base64Data);
                const bytes = new Uint8Array(binaryData.length);
                for (let j = 0; j < binaryData.length; j++) {
                  bytes[j] = binaryData.charCodeAt(j);
                }
                audioFolder?.file(`scene_${i + 1}.mp3`, bytes);
              } else {
                const response = await fetch(audio.audioUrl);
                const blob = await response.blob();
                audioFolder?.file(`scene_${i + 1}.mp3`, blob);
              }
            } catch (err) {
              console.error(`Failed to download audio ${i + 1}:`, err);
            }
          }
        }
      }

      // Add video if available
      if (fullData.merged_video) {
        try {
          if (fullData.merged_video.startsWith("data:")) {
            const base64Data = fullData.merged_video.split(",")[1];
            const binaryData = atob(base64Data);
            const bytes = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
              bytes[i] = binaryData.charCodeAt(i);
            }
            zip.file("video.mp4", bytes);
          } else {
            const response = await fetch(fullData.merged_video);
            const blob = await response.blob();
            zip.file("video.mp4", blob);
          }
        } catch (err) {
          console.error("Failed to download video:", err);
        }
      }

      // Generate and download zip
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${generation.title.replace(/\s+/g, "_")}_${new Date(generation.created_at).toISOString().split("T")[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Generation downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download generation");
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteGeneration = async (id: string) => {
    if (!confirm("Are you sure you want to delete this generation? This action cannot be undone.")) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("generations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setGenerations(generations.filter((g) => g.id !== id));
      toast.success("Generation deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete generation");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAssetCounts = (generation: Generation) => {
    const scriptCount = generation.script ? 1 : 0;
    const imageCount = generation.script?.scenes?.length || 0;
    const audioCount = generation.script?.scenes?.length || 0;
    const videoCount = generation.merged_video ? 1 : 0;
    return { scriptCount, imageCount, audioCount, videoCount };
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Generation History</h1>
              <p className="text-muted-foreground mt-1">
                View and download your previous generations
              </p>
            </div>
            <Button onClick={() => navigate("/")}>
              Back to Generator
            </Button>
          </div>

          {generations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No generations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start creating content to see your generation history here
                </p>
                <Button onClick={() => navigate("/")}>
                  Create New Generation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Topic</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-center">Assets</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generations.map((generation) => {
                        const { scriptCount, imageCount, audioCount, videoCount } = getAssetCounts(generation);
                        return (
                          <TableRow key={generation.id}>
                            <TableCell className="font-medium">{generation.title}</TableCell>
                            <TableCell>{generation.topic || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(generation.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-3 text-sm">
                                {scriptCount > 0 && (
                                  <div className="flex items-center gap-1" title="Script">
                                    <FileText className="w-4 h-4" />
                                    <span>{scriptCount}</span>
                                  </div>
                                )}
                                {imageCount > 0 && (
                                  <div className="flex items-center gap-1" title="Images">
                                    <Image className="w-4 h-4" />
                                    <span>{imageCount}</span>
                                  </div>
                                )}
                                {audioCount > 0 && (
                                  <div className="flex items-center gap-1" title="Audio">
                                    <Volume2 className="w-4 h-4" />
                                    <span>{audioCount}</span>
                                  </div>
                                )}
                                {videoCount > 0 && (
                                  <div className="flex items-center gap-1" title="Video">
                                    <Video className="w-4 h-4" />
                                    <span>{videoCount}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  onClick={() => downloadGeneration(generation)}
                                  disabled={downloadingId === generation.id}
                                  size="sm"
                                  variant="outline"
                                >
                                  {downloadingId === generation.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  onClick={() => deleteGeneration(generation.id)}
                                  disabled={deletingId === generation.id}
                                  size="sm"
                                  variant="outline"
                                >
                                  {deletingId === generation.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default History;
