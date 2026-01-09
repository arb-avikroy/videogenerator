import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true });

export async function createVideoFromImage(imageDataUrl: string, duration = 3, filenameBase = 'scene_img') {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  const imgName = `${filenameBase}.png`;
  const outName = `${filenameBase}_img.mp4`;

  // fetch image and write
  const imgRes = await fetch(imageDataUrl);
  const imgBuf = await imgRes.arrayBuffer();
  ffmpeg.FS('writeFile', imgName, new Uint8Array(imgBuf));

  // Create a short video from the single image
  await ffmpeg.run('-loop', '1', '-i', imgName, '-c:v', 'libx264', '-t', `${duration}`, '-pix_fmt', 'yuv420p', '-vf', 'scale=1280:720', '-y', outName);

  const data = ffmpeg.FS('readFile', outName);
  const blob = new Blob([data.buffer], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);

  // Clean up
  try {
    ffmpeg.FS('unlink', imgName);
    ffmpeg.FS('unlink', outName);
  } catch (e) {}

  return url;
}

export async function mergeScenesToMp4(scenes: Array<{ videoDataUrl: string; audioDataUrl?: string; filenameBase: string }>) {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  // Write each scene video and audio to FS, merge audio into video
  const outFiles: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const { videoDataUrl, audioDataUrl, filenameBase } = scenes[i];
    const videoName = `${filenameBase}_video_${i}.mp4`;
    const audioName = `${filenameBase}_audio_${i}.mp3`;
    const outName = `${filenameBase}_out_${i}.mp4`;

    // Write video
    const videoRes = await fetch(videoDataUrl);
    const videoBuf = await videoRes.arrayBuffer();
    ffmpeg.FS('writeFile', videoName, new Uint8Array(videoBuf));

    if (audioDataUrl) {
      const audioRes = await fetch(audioDataUrl);
      const audioBuf = await audioRes.arrayBuffer();
      ffmpeg.FS('writeFile', audioName, new Uint8Array(audioBuf));

      // Merge audio + video
      await ffmpeg.run('-i', videoName, '-i', audioName, '-c:v', 'libx264', '-c:a', 'aac', '-shortest', '-y', outName);
    } else {
      // Re-encode to ensure uniform codec
      await ffmpeg.run('-i', videoName, '-c:v', 'libx264', '-c:a', 'aac', '-y', outName);
    }

    outFiles.push(outName);
  }

  // Create concat file
  const concatList = outFiles.map((f) => `file '${f}'`).join('\n');
  ffmpeg.FS('writeFile', 'concat.txt', concatList);

  // Concatenate
  await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', '-y', 'final.mp4');

  const data = ffmpeg.FS('readFile', 'final.mp4');
  const blob = new Blob([data.buffer], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);

  // Cleanup files
  try {
    outFiles.forEach((f) => ffmpeg.FS('unlink', f));
    ffmpeg.FS('unlink', 'concat.txt');
    ffmpeg.FS('unlink', 'final.mp4');
  } catch (e) {
    // ignore cleanup errors
  }

  return url;
}
