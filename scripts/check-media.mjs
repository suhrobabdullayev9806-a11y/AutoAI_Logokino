import { execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

console.log('ffmpeg', ffmpegPath);
console.log('ffprobe', ffprobeStatic.path);

const filters = execFileSync(ffmpegPath, ['-hide_banner', '-filters'], { encoding: 'utf8' });
console.log('drawtext', filters.includes(' drawtext '));
console.log('subtitles', filters.includes(' subtitles '));
console.log('zoompan', filters.includes(' zoompan '));

const encoders = execFileSync(ffmpegPath, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
console.log('libx264', encoders.includes('libx264'));
console.log('aac', encoders.includes(' aac '));
