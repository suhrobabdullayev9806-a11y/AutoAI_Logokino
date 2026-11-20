import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { generateImageFile, synthesizeSpeech } from './ai.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MEDIA_ROOT = path.join(ROOT, 'web', 'public', 'media');
const FONT_SOURCE = path.join(__dirname, 'assets', 'fonts', 'NotoSans-Bold.ttf');
export const GENERATED_ROOT = path.join(ROOT, 'data', 'generated');

const FFMPEG = ffmpegPath || 'ffmpeg';
const FFPROBE = ffprobeStatic?.path || 'ffprobe';

function runFfmpeg(args, options = {}) {
  return execFileAsync(FFMPEG, args, {
    maxBuffer: 24 * 1024 * 1024,
    timeout: 10 * 60 * 1000,
    ...options
  }).catch((err) => {
    const tail = String(err.stderr || err.stdout || err.message || '').slice(-1400);
    const error = new Error(tail || 'ffmpeg xatosi');
    error.cause = err;
    throw error;
  });
}

async function probeDuration(file) {
  try {
    const { stdout } = await execFileAsync(
      FFPROBE,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
      { timeout: 30000, maxBuffer: 1024 * 1024 }
    );
    const value = Number.parseFloat(String(stdout).trim());
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function wrapText(text, maxChars = 30, maxLines = 3) {
  const words = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (!lines.length) lines.push('');

  const usedWords = lines.join(' ').split(' ').length;
  if (usedWords < words.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:!?]?$/, '')}вЂ¦`;
  }
  return lines.join('\n');
}

async function writeTextFile(file, content) {
  await fsp.writeFile(file, content, 'utf8');
}

function publicMediaUrl(workId, file) {
  return `/media/generated/${workId}/${file}`;
}

async function ensureFallbackImage(fallbackPath, outPath) {
  const raw = String(fallbackPath || '/media/abstract.jpg');
  const source = raw.startsWith('/media/')
    ? path.join(MEDIA_ROOT, raw.slice('/media/'.length))
    : path.isAbsolute(raw)
      ? raw
      : path.join(ROOT, raw);
  try {
    await fsp.copyFile(source, outPath);
    return true;
  } catch {
    return false;
  }
}

function splitAudioPath(file) {
  const ext = path.extname(file).toLowerCase();
  return ext || '.mp3';
}

async function makeSceneClip({
  cwd,
  image,
  audio,
  caption,
  duration,
  width,
  height,
  fps,
  outName,
  fontName
}) {
  const frames = Math.max(2, Math.round(duration * fps));
  const textFile = `${outName.replace(/\.mp4$/, '')}.txt`;
  await writeTextFile(path.join(cwd, textFile), wrapText(caption));

  const fontSize = Math.max(24, Math.round(width * 0.046));
  const bottom = Math.round(height * 0.13);
  const draw =
    `drawtext=fontfile=${fontName}:textfile=${textFile}:fontcolor=white:fontsize=${fontSize}` +
    `:line_spacing=${Math.round(fontSize * 0.28)}:box=1:boxcolor=black@0.48:boxborderw=${Math.round(fontSize * 0.5)}` +
    `:x=(w-text_w)/2:y=h-text_h-${bottom}`;
  const baseFilter =
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,` +
    `crop=${width}:${height},` +
    `zoompan=z='min(zoom+0.0007,1.14)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps},` +
    'format=yuv420p';
  const videoFilter = `${baseFilter},${draw}[v]`;

  const input = audio ? ['-i', audio] : ['-f', 'lavfi', '-t', String(duration), '-i', 'anullsrc=r=44100:cl=stereo'];
  const args = [
    '-y',
    '-i',
    image,
    ...input,
    '-filter_complex',
    videoFilter,
    '-map',
    '[v]',
    '-map',
    '1:a',
    '-t',
    String(duration),
    '-r',
    String(fps),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '22',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ar',
    '44100',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    outName
  ];
  if (audio) args.splice(args.indexOf('-t'), 0, '-af', `apad=pad_dur=${duration}`);

  try {
    await runFfmpeg(args, { cwd });
  } catch (err) {
    console.error('[render] scene xatosi, subtitrsiz urinish:', err.message.slice(-500));
    const filterIndex = args.indexOf('-filter_complex');
    if (filterIndex >= 0) args[filterIndex + 1] = `${baseFilter}[v]`;
    await runFfmpeg(args, { cwd });
  }
}

async function makeIntroClip({ cwd, image, title, subtitle, width, height, fps, outName, duration = 2.6 }) {
  const titleFile = `${outName.replace(/\.mp4$/, '')}-title.txt`;
  const subFile = `${outName.replace(/\.mp4$/, '')}-sub.txt`;
  await writeTextFile(path.join(cwd, titleFile), wrapText(title, 20, 2));
  await writeTextFile(path.join(cwd, subFile), subtitle);
  const frames = Math.max(2, Math.round(duration * fps));
  const filter =
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},` +
    `zoompan=z='min(zoom+0.0004,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps},` +
    `format=yuv420p,` +
    `drawtext=fontfile=font.ttf:textfile=${titleFile}:fontcolor=white:fontsize=${Math.round(width * 0.087)}` +
    `:line_spacing=10:box=1:boxcolor=black@0.35:boxborderw=18:x=(w-text_w)/2:y=h*0.56,` +
    `drawtext=fontfile=font.ttf:textfile=${subFile}:fontcolor=0xc5ff4d:fontsize=${Math.round(width * 0.031)}` +
    `:x=(w-text_w)/2:y=h*0.56+${Math.round(width * 0.19)},` +
    `drawtext=fontfile=font.ttf:text='MINISTUDIO':fontcolor=white@0.72:fontsize=${Math.round(width * 0.024)}` +
    `:x=(w-text_w)/2:y=h*0.1,` +
    `fade=t=in:st=0:d=0.35,fade=t=out:st=${Math.max(0, duration - 0.45)}:d=0.45[v]`;
  await runFfmpeg(
    [
      '-y',
      '-loop',
      '1',
      '-t',
      String(duration),
      '-i',
      image,
      '-f',
      'lavfi',
      '-t',
      String(duration),
      '-i',
      'anullsrc=r=44100:cl=stereo',
      '-filter_complex',
      filter,
      '-map',
      '[v]',
      '-map',
      '1:a',
      '-t',
      String(duration),
      '-r',
      String(fps),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '22',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ar',
      '44100',
      '-ac',
      '2',
      '-movflags',
      '+faststart',
      outName
    ],
    { cwd }
  );
}

async function makeOutroClip({ cwd, width, height, fps, outName, duration = 1.7 }) {
  await writeTextFile(path.join(cwd, 'outro-brand.txt'), 'MINISTUDIO');
  await writeTextFile(path.join(cwd, 'outro-sub.txt'), 'AI bilan yaratilgan');
  const filter =
    `[0:v]format=yuv420p,` +
    `drawtext=fontfile=font.ttf:textfile=outro-brand.txt:fontcolor=0xc5ff4d:fontsize=${Math.round(width * 0.06)}` +
    `:x=(w-text_w)/2:y=(h-text_h)/2-${Math.round(height * 0.03)},` +
    `drawtext=fontfile=font.ttf:textfile=outro-sub.txt:fontcolor=white@0.7:fontsize=${Math.round(width * 0.026)}` +
    `:x=(w-text_w)/2:y=(h-text_h)/2+${Math.round(height * 0.07)}[v]`;
  await runFfmpeg(
    [
      '-y',
      '-f',
      'lavfi',
      '-t',
      String(duration),
      '-i',
      `color=c=0x07080c:s=${width}x${height}:r=${fps}`,
      '-f',
      'lavfi',
      '-t',
      String(duration),
      '-i',
      'anullsrc=r=44100:cl=stereo',
      '-filter_complex',
      filter,
      '-map',
      '[v]',
      '-map',
      '1:a',
      '-t',
      String(duration),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '22',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ar',
      '44100',
      '-ac',
      '2',
      '-movflags',
      '+faststart',
      outName
    ],
    { cwd }
  );
}

async function concatClips({ cwd, files, outName }) {
  const listName = `${outName.replace(/\.mp4$/, '')}-list.txt`;
  await fsp.writeFile(
    path.join(cwd, listName),
    files.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n'),
    'utf8'
  );
  try {
    await runFfmpeg(
      ['-y', '-fflags', '+genpts', '-f', 'concat', '-safe', '0', '-i', listName, '-c', 'copy', '-movflags', '+faststart', outName],
      { cwd }
    );
  } catch (err) {
    console.error('[render] concat copy xatosi, qayta encode:', err.message.slice(-500));
    await runFfmpeg(
      [
        '-y',
        '-fflags',
        '+genpts',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listName,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '22',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-movflags',
        '+faststart',
        outName
      ],
      { cwd }
    );
  }
}

function renderPrompt(scene, story) {
  if (scene.imagePrompt && scene.imagePrompt.length > 8) return scene.imagePrompt;
  const character = story.characters?.[0]?.look || 'Central Asian hero';
  return (
    `${story.styleLabel} style cinematic frame, ${scene.caption}. ` +
    `Character: ${character}. Dramatic lighting, vertical 9:16, detailed, no text.`
  );
}

export async function renderSerial({ work, settings, onProgress = () => {} }) {
  const story = work.story;
  if (!story?.episodes?.length) throw new Error('Serial ssenariysi topilmadi');

  const width = Math.max(360, Math.min(1080, Number(settings.ai?.renderWidth) || 720));
  const height = Math.max(640, Math.min(1920, Number(settings.ai?.renderHeight) || 1280));
  const fps = Math.max(18, Math.min(30, Number(settings.ai?.fps) || 24));
  const workDir = path.join(GENERATED_ROOT, work.id);
  const scenesDir = path.join(workDir, 'scenes');
  const audioDir = path.join(workDir, 'audio');
  const clipsDir = path.join(workDir, 'clips');
  await fsp.mkdir(scenesDir, { recursive: true });
  await fsp.mkdir(audioDir, { recursive: true });
  await fsp.mkdir(clipsDir, { recursive: true });
  await fsp.copyFile(FONT_SOURCE, path.join(workDir, 'font.ttf'));

  const allScenes = story.episodes.flatMap((episode, epIndex) =>
    episode.scenes.map((scene, sceneIndex) => ({ episode, epIndex, scene, sceneIndex }))
  );
  const totalScenes = allScenes.length;
  let doneImages = 0;

  onProgress(10, 1, 'Kadrlar generatsiya qilinmoqda');

  for (const item of allScenes) {
    const fileName = `ep${item.epIndex + 1}-scene${item.sceneIndex + 1}.jpg`;
    const outPath = path.join(scenesDir, fileName);
    try {
      const result = await generateImageFile({
        settings,
        prompt: renderPrompt(item.scene, story),
        outPath,
        fallbackPath: item.scene.fallback || story.posterFallback,
        seed: 1000 + item.epIndex * 97 + item.sceneIndex * 13,
        width,
        height
      });
      item.scene.img = publicMediaUrl(work.id, `scenes/${fileName}`);
      item.scene.imageProvider = result.provider;
    } catch (err) {
      console.error('[render] kadr xatosi:', err.message);
      const copied = await ensureFallbackImage(item.scene.fallback, outPath);
      if (copied) {
        item.scene.img = publicMediaUrl(work.id, `scenes/${fileName}`);
        item.scene.imageProvider = 'local';
      }
    }
    doneImages += 1;
    onProgress(10 + Math.round((doneImages / totalScenes) * 34), 1, 'Kadrlar generatsiya qilinmoqda');
  }

  story.poster = story.episodes[0]?.scenes?.[0]?.img || story.poster;
  story.posterFallback = story.episodes[0]?.scenes?.[0]?.fallback || story.posterFallback;
  work.poster = story.poster;
  work.posterFallback = story.posterFallback;

  onProgress(46, 2, 'Ovoz Google AI Studio / Edge TTS bilan yaratilmoqda');

  let doneAudio = 0;
  buttonLoop: for (const item of allScenes) {
    const base = `ep${item.epIndex + 1}-scene${item.sceneIndex + 1}`;
    const outBase = path.join(audioDir, base);
    if (doneAudio > 0) await new Promise((r) => setTimeout(r, 1400));
    try {
      const result = await synthesizeSpeech({
        settings,
        text: item.scene.caption,
        outPath: `${outBase}.mp3`,
        voice: story.voice
      });
      if (result?.file) {
        item.scene.audio = publicMediaUrl(work.id, `audio/${path.basename(result.file)}`);
        item.scene.audioFile = result.file;
        item.scene.voiceProvider = result.provider;
      } else {
        item.scene.voiceProvider = 'none';
      }
    } catch (err) {
      console.error('[render] ovoz xatosi:', err.message);
      item.scene.voiceProvider = 'none';
    }
    doneAudio += 1;
    onProgress(46 + Math.round((doneAudio / totalScenes) * 14), 2, 'Ovoz yaratilmoqda');
    if (doneAudio >= totalScenes) break buttonLoop;
  }

  onProgress(61, 3, 'MP4 video render qilinmoqda');

  const episodeFiles = [];
  let doneClips = 0;
  const totalClips = totalScenes + story.episodes.length * 2; // scenes + intro/outro

  for (let epIndex = 0; epIndex < story.episodes.length; epIndex += 1) {
    const episode = story.episodes[epIndex];
    const epTag = `ep${epIndex + 1}`;
    const clipFiles = [];

    const first = episode.scenes[0];
    const firstPath = first?.img
      ? path.join(workDir, first.img.replace(`/media/generated/${work.id}/`, ''))
      : '';
    const introName = `${epTag}-intro.mp4`;
    await makeIntroClip({
      cwd: workDir,
      image: firstPath && fs.existsSync(firstPath) ? firstPath : path.join(MEDIA_ROOT, 'frame-1.jpg'),
      title: episode.title,
      subtitle: `${story.title} вЂў ${story.styleLabel}`,
      width,
      height,
      fps,
      outName: `clips/${introName}`
    });
    clipFiles.push(`clips/${introName}`);
    doneClips += 1;
    onProgress(61 + Math.round((doneClips / totalClips) * 33), 3, 'MP4 video render qilinmoqda');

    for (let sceneIndex = 0; sceneIndex < episode.scenes.length; sceneIndex += 1) {
      const scene = episode.scenes[sceneIndex];
      const tag = `${epTag}-scene${sceneIndex + 1}`;
      const audioFile = scene.audioFile && fs.existsSync(scene.audioFile) ? scene.audioFile : null;
      const audioDuration = audioFile ? await probeDuration(audioFile) : 0;
      const duration = Math.max(3.4, Math.min(14, audioDuration > 0 ? audioDuration + 0.75 : 4.2));
      scene.durationSec = Number(duration.toFixed(2));

      const imageFile = path.join(workDir, scene.img.replace(`/media/generated/${work.id}/`, ''));
      const outName = `${tag}.mp4`;
      await makeSceneClip({
        cwd: workDir,
        image: path.relative(workDir, imageFile),
        audio: audioFile ? path.relative(workDir, audioFile) : null,
        caption: scene.caption,
        duration,
        width,
        height,
        fps,
        outName: `clips/${outName}`,
        fontName: 'font.ttf'
      });
      clipFiles.push(`clips/${outName}`);
      doneClips += 1;
      onProgress(61 + Math.round((doneClips / totalClips) * 33), 3, 'MP4 video render qilinmoqda');
    }

    const outroName = `${epTag}-outro.mp4`;
    await makeOutroClip({ cwd: workDir, width, height, fps, outName: `clips/${outroName}` });
    clipFiles.push(`clips/${outroName}`);
    doneClips += 1;
    onProgress(61 + Math.round((doneClips / totalClips) * 33), 3, 'MP4 video render qilinmoqda');

    const epOut = `${epTag}.mp4`;
    await concatClips({ cwd: workDir, files: clipFiles, outName: epOut });
    const epDuration = await probeDuration(path.join(workDir, epOut));
    episode.videoUrl = publicMediaUrl(work.id, epOut);
    episode.durationSec = Number(epDuration.toFixed(1));
    episode.sceneCount = episode.scenes.length;
    episodeFiles.push(epOut);
  }

  onProgress(96, 4, 'Yakunlanmoqda');

  let fullUrl = episodeFiles[0] ? publicMediaUrl(work.id, episodeFiles[0]) : '';
  if (episodeFiles.length > 1) {
    await concatClips({ cwd: workDir, files: episodeFiles, outName: 'full.mp4' });
    fullUrl = publicMediaUrl(work.id, 'full.mp4');
  }
  const fullDuration = await probeDuration(path.join(workDir, episodeFiles.length > 1 ? 'full.mp4' : episodeFiles[0]));

  work.video = {
    url: fullUrl,
    poster: work.poster,
    width,
    height,
    fps,
    duration: Number(fullDuration.toFixed(1)),
    provider:
      story.episodes[0]?.scenes?.[0]?.voiceProvider === 'gemini'
        ? 'Google AI Studio (Gemini) + FFmpeg'
        : 'Edge TTS + FFmpeg',
    episodes: story.episodes.map((ep) => ({
      n: ep.n,
      title: ep.title,
      url: ep.videoUrl,
      duration: ep.durationSec
    }))
  };
  for (const episode of story.episodes) {
    for (const scene of episode.scenes) {
      delete scene.audioFile;
    }
  }
  work.story.episodes = story.episodes;
  work.story.poster = story.poster;
  work.story.posterFallback = story.posterFallback;
  work.story.provider = work.provider || 'ai';
  onProgress(100, 4, 'Tayyor');
  return work;
}

export async function renderImages({ work, settings, onProgress = () => {} }) {
  const width = Number(work.imageWidth) || 720;
  const height = Number(work.imageHeight) || 1280;
  const workDir = path.join(GENERATED_ROOT, work.id);
  const imagesDir = path.join(workDir, 'images');
  await fsp.mkdir(imagesDir, { recursive: true });

  const images = work.images || [];
  for (let i = 0; i < images.length; i += 1) {
    const item = images[i];
    const file = `image-${i + 1}.jpg`;
    const outPath = path.join(imagesDir, file);
    try {
      const result = await generateImageFile({
        settings,
        prompt: item.prompt || work.prompt,
        outPath,
        fallbackPath: item.fallback,
        width,
        height
      });
      item.url = publicMediaUrl(work.id, `images/${file}`);
      item.provider = result.provider;
    } catch (err) {
      console.error('[render] rasm xatosi:', err.message);
      const copied = await ensureFallbackImage(item.fallback, outPath);
      if (copied) {
        item.url = publicMediaUrl(work.id, `images/${file}`);
        item.provider = 'local';
      }
    }
    onProgress(10 + Math.round(((i + 1) / images.length) * 86), 2, 'Rasm chizilmoqda');
  }

  const first = images[0];
  if (first?.url) {
    work.poster = first.url;
    work.posterFallback = first.fallback;
  }
  work.images = images;
  onProgress(100, 3, 'Tayyor');
  return work;
}

