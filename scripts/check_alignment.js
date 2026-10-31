import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';

function getDuration(filePath) {
  const res = spawnSync(ffmpeg, ['-i', filePath, '-f', 'null', '-'], { encoding: 'utf8' });
  const out = (res.stderr || '') + (res.stdout || '');
  const m = out.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
  if (m) {
    return parseFloat(m[1]) * 3600 + parseFloat(m[2]) * 60 + parseFloat(m[3]);
  }
  return 0;
}

console.log('Scene Alignment Check:');
for (let i = 1; i <= 9; i++) {
  const aPath = path.resolve('scene_audio', `scene_${i}.mp3`);
  const vPath = path.resolve('raw_recordings', `scene_${i}.webm`);
  const aDur = getDuration(aPath);
  const vDur = getDuration(vPath);
  console.log(`Scene ${i}: Audio = ${aDur.toFixed(2)}s | Video = ${vDur.toFixed(2)}s | Diff = ${(vDur - aDur).toFixed(2)}s`);
}
