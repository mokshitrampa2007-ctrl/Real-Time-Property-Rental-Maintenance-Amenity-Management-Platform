import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';

const sceneTitles = {
  1: "System Overview • Multi-Tenant Architecture",
  2: "Authentication & Portal Landing • HttpOnly JWT Sessions",
  3: "Owner Management • Portfolio & Maintenance Analytics",
  4: "Tenant Portal • Maintenance Requests & Photo Uploads",
  5: "Staff Work Queue • SLA Tracking & Status Machine",
  6: "Amenity Scheduling • Shared Facility Booking Engine",
  7: "Concurrency Protection • PostgreSQL GiST Exclusion Constraint",
  8: "Check-In / Check-Out • Grace Periods & Auto No-Show",
  9: "Real-Time WebSocket Engine • Project Summary & Conclusion"
};

const processedDir = path.resolve(process.cwd(), 'processed_scenes');
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

const outputDir = path.resolve(process.cwd(), 'Website_Demonstration_Output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

function getDuration(filePath) {
  const res = spawnSync(ffmpeg, ['-i', filePath, '-f', 'null', '-'], { encoding: 'utf8' });
  const out = (res.stderr || '') + (res.stdout || '');
  const m = out.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
  if (m) {
    return parseFloat(m[1]) * 3600 + parseFloat(m[2]) * 60 + parseFloat(m[3]);
  }
  return 30;
}

async function processScene(i) {
  const vPath = path.resolve('raw_recordings', `scene_${i}.webm`);
  const aPath = path.resolve('scene_audio', `scene_${i}.mp3`);
  const outPath = path.resolve(processedDir, `scene_${i}.mp4`);

  const aDur = getDuration(aPath);
  console.log(`\nProcessing Scene ${i}: audio duration = ${aDur.toFixed(2)}s`);

  // Build filter complex
  let vf = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30';

  // Add lower-third title badge on scenes 2 through 8
  if (i >= 2 && i <= 8) {
    const title = sceneTitles[i].replace(/'/g, '').replace(/:/g, '\\:');
    const badgeFilter = `,drawbox=x=48:y=970:w=780:h=56:color=black@0.78:t=fill,drawbox=x=48:y=970:w=6:h=56:color=0x6366F1:t=fill,drawtext=fontfile='C\\:/Windows/Fonts/segoeui.ttf':text='${title}':fontsize=21:fontcolor=white:x=68:y=986`;
    vf += badgeFilter;
  }

  // FFMPEG command to sync video to audio duration exactly
  const args = [
    '-y',
    '-i', vPath,
    '-i', aPath,
    '-t', aDur.toFixed(2),
    '-vf', vf,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    outPath
  ];

  console.log(`Running ffmpeg for Scene ${i}...`);
  const res = spawnSync(ffmpeg, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error(`FFmpeg failed for Scene ${i} with code ${res.status}`);
  }
  console.log(`Scene ${i} processed successfully: ${outPath}`);
}

async function main() {
  console.log('=== Starting Video Assembly & Muxing Pipeline ===');

  for (let i = 1; i <= 9; i++) {
    await processScene(i);
  }

  // Generate concat list
  const concatListFile = path.resolve(processedDir, 'concat_list.txt');
  let concatContent = '';
  for (let i = 1; i <= 9; i++) {
    const p = path.resolve(processedDir, `scene_${i}.mp4`).replace(/\\/g, '/');
    concatContent += `file '${p}'\n`;
  }
  fs.writeFileSync(concatListFile, concatContent);

  const finalVideoTemp = path.resolve(processedDir, 'combined_raw.mp4');
  console.log('\nConcatenating all 9 processed scenes...');
  const concatRes = spawnSync(ffmpeg, [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListFile,
    '-c', 'copy',
    finalVideoTemp
  ], { stdio: 'inherit' });

  if (concatRes.status !== 0) {
    throw new Error(`Concat failed with status ${concatRes.status}`);
  }

  // Mix subtle background ambient track with final video
  const bgMusicPath = path.resolve('scene_audio', 'ambient_bg.m4a');
  const finalOutput = path.resolve(outputDir, 'Complete_Website_Demonstration.mp4');

  console.log('\nMixing subtle background ambient music into final export...');
  const mixRes = spawnSync(ffmpeg, [
    '-y',
    '-i', finalVideoTemp,
    '-i', bgMusicPath,
    '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:weights=1.0 0.15[aout]',
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    finalOutput
  ], { stdio: 'inherit' });

  if (mixRes.status !== 0) {
    throw new Error(`Final mixing failed with status ${mixRes.status}`);
  }

  console.log('\n======================================================');
  console.log('🎉 COMPLETE DEMONSTRATION VIDEO EXPORTED SUCCESSFULLY!');
  console.log(`Location: ${finalOutput}`);
  const stat = fs.statSync(finalOutput);
  console.log(`File Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
  const finalDur = getDuration(finalOutput);
  console.log(`Final Video Duration: ${Math.floor(finalDur / 60)}m ${Math.floor(finalDur % 60)}s`);
  console.log('======================================================');
}

main().catch(console.error);
