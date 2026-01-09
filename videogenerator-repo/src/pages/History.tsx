import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, Trash2, ChevronLeft, ChevronRight, PackageOpen } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface Generation {
  id: string;
  title: string;
  topic: string | null;
  script: any;
  images: any[];
  videos: any[];
  merged_video: string | null;
  narration_audio: any[];
  metadata: any;
  created_at: string;
  updated_at: string;
}

const ITEMS_PER_PAGE = 20;

const History = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Extract stable userId to avoid reference changes
  const userId = user?.id;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const fetchGenerations = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const start = currentPage * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from('generations')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;

      setGenerations(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching generations:', error);
      toast.error('Failed to load generation history');
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentPage]);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  const handleDownloadProject = async (generation: Generation) => {
    try {
      const zip = new JSZip();
      const projectFolder = zip.folder(generation.title.replace(/[^a-z0-9]/gi, '_'));
      
      if (!projectFolder) {
        throw new Error('Failed to create project folder');
      }

      // Add script
      if (generation.script) {
        const scriptsFolder = projectFolder.folder('scripts');
        scriptsFolder?.file('script.json', JSON.stringify(generation.script, null, 2));
      }

      // Add images
      if (generation.images && generation.images.length > 0) {
        const imagesFolder = projectFolder.folder('images');
        for (const img of generation.images) {
          if (img.url && img.url.startsWith('data:image')) {
            const base64Data = img.url.split(',')[1];
            imagesFolder?.file(`scene_${img.sceneNumber || 'unknown'}.png`, base64Data, { base64: true });
          }
        }
      }

      // Add videos
      if (generation.videos && generation.videos.length > 0) {
        const videosFolder = projectFolder.folder('videos');
        for (const vid of generation.videos) {
          if (vid.videoUrl && vid.videoUrl.startsWith('data:video')) {
            const base64Data = vid.videoUrl.split(',')[1];
            videosFolder?.file(`scene_${vid.sceneNumber || 'unknown'}.mp4`, base64Data, { base64: true });
          }
        }
      }

      // Add merged video
      if (generation.merged_video && generation.merged_video.startsWith('data:video')) {
        const base64Data = generation.merged_video.split(',')[1];
        projectFolder.file('final_video.mp4', base64Data, { base64: true });
      }

      // Add audio
      if (generation.narration_audio && generation.narration_audio.length > 0) {
        const audioFolder = projectFolder.folder('audio');
        for (const audio of generation.narration_audio) {
          if (audio.audioUrl && audio.audioUrl.startsWith('data:audio')) {
            const base64Data = audio.audioUrl.split(',')[1];
            audioFolder?.file(`scene_${audio.sceneNumber || 'unknown'}.mp3`, base64Data, { base64: true });
          }
        }
      }

      // Add metadata
      projectFolder.file('metadata.json', JSON.stringify({
        id: generation.id,
        title: generation.title,
        topic: generation.topic,
        created_at: generation.created_at,
        updated_at: generation.updated_at,
        metadata: generation.metadata
      }, null, 2));

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generation.title.replace(/[^a-z0-9]/gi, '_')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Project downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download project');
    }
  };

  const handleDownloadAll = async () => {
    if (generations.length === 0) {
      toast.error('No generations to download');
      return;
    }

    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    setIsDownloading(true);
    try {
      const zip = new JSZip();

      // Fetch all generations (not just current page)
      const { data: allGenerations, error } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      for (const gen of allGenerations || []) {
        const projectFolderName = `${gen.title.replace(/[^a-z0-9]/gi, '_')}_${gen.id.substring(0, 8)}`;
        const projectFolder = zip.folder(projectFolderName);
        
        if (!projectFolder) continue;

        // Add script
        if (gen.script) {
          const scriptsFolder = projectFolder.folder('scripts');
          scriptsFolder?.file('script.json', JSON.stringify(gen.script, null, 2));
        }

        // Add images
        if (gen.images && gen.images.length > 0) {
          const imagesFolder = projectFolder.folder('images');
          for (const img of gen.images) {
            if (img.url && img.url.startsWith('data:image')) {
              const base64Data = img.url.split(',')[1];
              imagesFolder?.file(`scene_${img.sceneNumber || 'unknown'}.png`, base64Data, { base64: true });
            }
          }
        }

        // Add videos
        if (gen.videos && gen.videos.length > 0) {
          const videosFolder = projectFolder.folder('videos');
          for (const vid of gen.videos) {
            if (vid.videoUrl && vid.videoUrl.startsWith('data:video')) {
              const base64Data = vid.videoUrl.split(',')[1];
              videosFolder?.file(`scene_${vid.sceneNumber || 'unknown'}.mp4`, base64Data, { base64: true });
            }
          }
        }

        // Add merged video
        if (gen.merged_video && gen.merged_video.startsWith('data:video')) {
          const base64Data = gen.merged_video.split(',')[1];
          projectFolder.file('final_video.mp4', base64Data, { base64: true });
        }

        // Add audio
        if (gen.narration_audio && gen.narration_audio.length > 0) {
          const audioFolder = projectFolder.folder('audio');
          for (const audio of gen.narration_audio) {
            if (audio.audioUrl && audio.audioUrl.startsWith('data:audio')) {
              const base64Data = audio.audioUrl.split(',')[1];
              audioFolder?.file(`scene_${audio.sceneNumber || 'unknown'}.mp3`, base64Data, { base64: true });
            }
          }
        }

        // Add metadata
        projectFolder.file('metadata.json', JSON.stringify({
          id: gen.id,
          title: gen.title,
          topic: gen.topic,
          created_at: gen.created_at,
          updated_at: gen.updated_at,
          metadata: gen.metadata
        }, null, 2));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all_projects_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('All projects downloaded successfully');
    } catch (error) {
      console.error('Download all error:', error);
      toast.error('Failed to download all projects');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Generation deleted');
      fetchGenerations();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete generation');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('All generations deleted');
      setGenerations([]);
      setTotalCount(0);
      setCurrentPage(0);
    } catch (error) {
      console.error('Delete all error:', error);
      toast.error('Failed to delete all generations');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Generation History</h1>
            <p className="text-muted-foreground mt-1">{totalCount} total generations</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleDownloadAll}
              disabled={isDownloading || generations.length === 0}
              variant="outline"
            >
              <PackageOpen className="w-4 h-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download All as ZIP'}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  disabled={isDeleting || generations.length === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Generations?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {totalCount} generations. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground">
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {generations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No generations yet. Create your first video!</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Go to Generator
            </Button>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Artifacts</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generations.map((gen) => {
                    const artifactCount = [
                      gen.script && 'Script',
                      gen.images?.length && `${gen.images.length} Images`,
                      gen.videos?.length && `${gen.videos.length} Videos`,
                      gen.merged_video && 'Merged Video',
                      gen.narration_audio?.length && `${gen.narration_audio.length} Audio`
                    ].filter(Boolean);

                    return (
                      <TableRow key={gen.id}>
                        <TableCell className="font-medium">{gen.title}</TableCell>
                        <TableCell>{gen.topic || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {artifactCount.map((artifact, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {artifact}
                              </Badge>
                            ))}
                            {artifactCount.length === 0 && <span className="text-muted-foreground text-sm">No artifacts</span>}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(gen.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadProject(gen)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={isDeleting}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Generation?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{gen.title}". This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(gen.id)} className="bg-destructive text-destructive-foreground">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </p>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handlePrevPage}
                    disabled={currentPage === 0}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  
                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages - 1}
                    variant="outline"
                    size="sm"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default History;
