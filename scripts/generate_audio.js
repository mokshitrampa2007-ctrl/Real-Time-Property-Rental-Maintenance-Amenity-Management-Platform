import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const scenes = [
  {
    id: 1,
    title: "Title & Project Overview",
    text: "Welcome to this demonstration of EstateSync, a real-time property rental, maintenance, and amenity management platform. Residential communities and multi-family properties face ongoing challenges coordinating tenancies, processing maintenance repairs, and avoiding double-bookings of shared amenities. EstateSync solves these problems through a unified, full-stack architecture built with React, TypeScript, Tailwind CSS, Node.js, Express, Socket.IO, Prisma ORM, and PostgreSQL. Today, we will explore the complete application across all three user roles: property owners, residential tenants, and maintenance staff, showcasing real-time synchronization and database-level concurrency protection."
  },
  {
    id: 2,
    title: "Landing Page & Authentication",
    text: "We begin on the EstateSync homepage. The landing page features a responsive modern navigation bar, a high-level value proposition, and an interactive system overview detailing the core operational workflows. To streamline testing and evaluation, the portal includes one-click demo access for all three user personas. Authentication is powered by JSON Web Tokens stored in secure, HttpOnly cookies with server-side role validation, bcrypt password hashing, and endpoint rate limiting. Let us log in as our property owner, Victoria Sterling."
  },
  {
    id: 3,
    title: "Owner Dashboard & Portfolio Management",
    text: "Upon logging in, the owner is greeted by an executive analytics dashboard. Key performance indicator cards provide an immediate operational pulse: total managed properties, occupied units, active maintenance requests, and critical alerts for unresolved tickets exceeding forty-eight hours. Interactive Recharts visualizations display property occupancy breakdowns and ticket distribution by category and priority. Navigating to the Properties section, the owner can view their portfolio, including Grandview Heights and Sunset Residences. Opening a property reveals unit allocations, active tenant lease dates, and the staff roster. Owners can also generate expiring, single-use invitation tokens with cryptographic hashing to onboard new tenants and technicians securely."
  },
  {
    id: 4,
    title: "Tenant Residence & Maintenance Creation",
    text: "Next, let us experience the platform from a resident's perspective by logging in as Tenant 1, Marcus Vance, residing in Unit 101. The tenant dashboard displays Marcus's active lease, upcoming amenity reservations, and real-time announcements. Tenants can submit maintenance requests directly from the portal. When creating a ticket, the tenant specifies the issue title, selects a trade category such as plumbing or electrical, sets the urgency level, provides a detailed description, and uploads photographic evidence. Multer securely validates file formats and sizes, saving attachments to disk or S3 with randomized identifiers. Submitting the ticket triggers an instant Socket.IO broadcast across property rooms, notifying both the owner and available technicians."
  },
  {
    id: 5,
    title: "Staff Work Queue & Maintenance Lifecycle",
    text: "Now, let us switch to our maintenance technician, Alex Rivera. Alex's dashboard serves as an active work queue, prioritizing open requests and highlighting overdue repairs. Opening the newly submitted plumbing ticket, Alex can review the resident's description and inspect attached photos. Alex transitions the ticket status from Pending to In Progress, automatically updating the status badge and appending an immutable entry to the status audit history. Technicians and tenants can exchange threaded comments in real time. Once the repair is finished, Alex marks the ticket Completed. In accordance with Phase 1 business invariants, completed tickets become strictly read-only, preventing post-resolution tampering."
  },
  {
    id: 6,
    title: "Amenity Scheduling & Conflict-Free Bookings",
    text: "One of EstateSync's most powerful capabilities is its conflict-free shared amenity booking engine. Returning to the tenant portal, Marcus navigates to the Amenities section. Facilities such as the Fitness Center, Rooftop Lounge, and Swimming Pool display location details, guest capacity limits, advance booking windows, and property-timezone operating hours. Selecting the Fitness Center, Marcus opens the booking scheduler. The calendar presents half-open intervals formatted as start to end times. Marcus reserves a slot for tomorrow from two PM to three PM. The reservation is confirmed immediately, updating slot availability in real time across all connected tenant screens."
  },
  {
    id: 7,
    title: "Concurrency Conflict & Database Exclusion Constraint",
    text: "To demonstrate how EstateSync guarantees zero double-bookings, let us log in as a second resident, Tenant 2, Elena Rostova, living in Unit 204. Elena visits the Fitness Center and attempts to book an overlapping reservation from two-thirty PM to three-thirty PM. When Elena submits the request, the database immediately blocks the write and returns a four-hundred-nine conflict response, prompting a clear alert that the time slot is already reserved. Rather than relying on fragile application-level checks, EstateSync enforces this invariant at the PostgreSQL storage layer using a Generalized Search Tree exclusion constraint with timestamp ranges and the btree_gist extension. Conversely, when Elena chooses the adjacent slot from three PM to four PM, the reservation succeeds flawlessly."
  },
  {
    id: 8,
    title: "Check-In Lifecycle & Automated Schedulers",
    text: "EstateSync also monitors reservation fulfillment with an active check-in and check-out lifecycle. During the scheduled booking window, the tenant dashboard activates a one-click Check-In button with grace period enforcement. Checking in logs the exact physical arrival timestamp and transitions the booking to Checked In. When the tenant finishes early, clicking Check Out completes the booking and immediately frees the facility for other residents. Furthermore, an automated background scheduler runs every sixty seconds to sweep expired bookings, automatically flagging unattended slots as No-Show and releasing future intervals."
  },
  {
    id: 9,
    title: "Real-Time Notifications & Conclusion",
    text: "Across the entire platform, an authenticated Socket.IO layer powers real-time notification bells, unread counters, and instant cache invalidation via TanStack Query without requiring manual browser reloads. In conclusion, EstateSync demonstrates an end-to-end, enterprise-ready property management platform that successfully unites rental occupancy tracking, maintenance dispatching, and mathematically conflict-free amenity scheduling. Thank you for watching this demonstration."
  }
];

async function main() {
  const audioDir = path.resolve(process.cwd(), 'scene_audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  const sceneDurations = [];

  for (const scene of scenes) {
    console.log(`Generating audio for Scene ${scene.id}: ${scene.title}...`);
    const tts = new MsEdgeTTS();
    await tts.setMetadata('en-US-ChristopherNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    const sceneSubDir = path.join(audioDir, `scene_${scene.id}`);
    if (!fs.existsSync(sceneSubDir)) fs.mkdirSync(sceneSubDir, { recursive: true });

    await tts.toFile(sceneSubDir, scene.text);
    
    const rawAudioPath = path.join(sceneSubDir, 'audio.mp3');
    const finalAudioPath = path.join(audioDir, `scene_${scene.id}.mp3`);
    fs.copyFileSync(rawAudioPath, finalAudioPath);

    // Get exact audio duration via ffmpeg
    try {
      const output = execSync(`"${ffmpegPath}" -i "${finalAudioPath}" 2>&1`, { encoding: 'utf8' });
      const match = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      let durationSec = 30; // fallback
      if (match) {
        const hours = parseFloat(match[1]);
        const mins = parseFloat(match[2]);
        const secs = parseFloat(match[3]);
        durationSec = hours * 3600 + mins * 60 + secs;
      }
      sceneDurations.push({ id: scene.id, title: scene.title, durationSec, file: finalAudioPath });
      console.log(`Scene ${scene.id} Audio Ready: ${durationSec.toFixed(2)}s`);
    } catch (err) {
      console.error(`Error reading duration for scene ${scene.id}:`, err);
    }
  }

  fs.writeFileSync(path.join(audioDir, 'durations.json'), JSON.stringify(sceneDurations, null, 2));
  console.log('All audio scenes generated successfully!');
}

main().catch(console.error);
