import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export const loadFFmpeg = async () => {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  // Add logging
  ffmpeg.on('log', ({ message }) => {
    console.log('FFmpeg:', message);
  });
  
  try {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    console.log('Loading FFmpeg from:', baseURL);
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    console.log('FFmpeg loaded successfully');
  } catch (error) {
    console.error('FFmpeg load error:', error);
    throw new Error(`Failed to load FFmpeg: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return ffmpeg;
};

interface Scene {
  imageUrl: string;
  audioUrl: string;
  text: string;
}

export const assembleVideo = async (
  scenes: Scene[],
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> => {
  const ffmpegInstance = await loadFFmpeg();
  
  if (!ffmpegInstance) {
    throw new Error('FFmpeg failed to load');
  }

  onProgress?.(10, 'Loading scenes...');

  // Download all images and audio
  const imageFiles: string[] = [];
  const audioFiles: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    
    onProgress?.(10 + (i / scenes.length) * 30, `Loading scene ${i + 1}...`);

    // Fetch image
    const imageData = await fetchFile(scene.imageUrl);
    const imageName = `image${i}.jpg`;
    await ffmpegInstance.writeFile(imageName, imageData);
    imageFiles.push(imageName);

    // Fetch audio
    const audioData = await fetchFile(scene.audioUrl);
    const audioName = `audio${i}.mp3`;
    await ffmpegInstance.writeFile(audioName, audioData);
    audioFiles.push(audioName);
  }

  onProgress?.(40, 'Creating video segments...');

  // Create video segment for each scene (image + audio)
  const videoSegments: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const segmentName = `segment${i}.mp4`;
    
    onProgress?.(40 + (i / scenes.length) * 30, `Processing scene ${i + 1}...`);

    // Create video from image and audio without fade effects (simpler and more reliable)
    await ffmpegInstance.exec([
      '-loop', '1',
      '-i', imageFiles[i],
      '-i', audioFiles[i],
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      segmentName
    ]);

    videoSegments.push(segmentName);
  }

  onProgress?.(70, 'Merging video segments...');

  // Create concat file
  const concatContent = videoSegments.map(seg => `file '${seg}'`).join('\n');
  await ffmpegInstance.writeFile('concat.txt', new TextEncoder().encode(concatContent));

  onProgress?.(80, 'Finalizing video...');

  // Concatenate all segments
  await ffmpegInstance.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat.txt',
    '-c', 'copy',
    'output.mp4'
  ]);

  onProgress?.(95, 'Exporting video...');

  // Read the final video
  const data = await ffmpegInstance.readFile('output.mp4');

  onProgress?.(100, 'Video complete!');

  // Clean up files
  for (const file of [...imageFiles, ...audioFiles, ...videoSegments, 'concat.txt', 'output.mp4']) {
    try {
      await ffmpegInstance.deleteFile(file);
    } catch (e) {
      console.warn(`Failed to delete ${file}:`, e);
    }
  }

  return new Blob([data], { type: 'video/mp4' });
};
