import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';

const durations = [];
for (let i = 1; i <= 9; i++) {
  const p = path.resolve('scene_audio', `scene_${i}.mp3`);
  const res = spawnSync(ffmpeg, ['-i', p, '-f', 'null', '-'], { encoding: 'utf8' });
  const out = (res.stderr || '') + (res.stdout || '');
  const m = out.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
  if (m) {
    const sec = parseFloat(m[1]) * 3600 + parseFloat(m[2]) * 60 + parseFloat(m[3]);
    durations.push({ scene: i, durationSec: sec });
  }
}
console.log(JSON.stringify(durations, null, 2));
fs.writeFileSync('scene_audio/durations.json', JSON.stringify(durations, null, 2));
