import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const durations = JSON.parse(fs.readFileSync(path.resolve('scene_audio', 'durations.json'), 'utf8'));

const recordDir = path.resolve(process.cwd(), 'raw_recordings');
if (!fs.existsSync(recordDir)) fs.mkdirSync(recordDir, { recursive: true });

async function injectCursor(page) {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('demo-virtual-cursor')) return;
      const cursor = document.createElement('div');
      cursor.id = 'demo-virtual-cursor';
      cursor.style.position = 'fixed';
      cursor.style.top = '0';
      cursor.style.left = '0';
      cursor.style.width = '22px';
      cursor.style.height = '22px';
      cursor.style.borderRadius = '50%';
      cursor.style.backgroundColor = 'rgba(99, 102, 241, 0.75)';
      cursor.style.border = '2.5px solid #ffffff';
      cursor.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.6)';
      cursor.style.pointerEvents = 'none';
      cursor.style.zIndex = '999999';
      cursor.style.transition = 'transform 0.08s ease-out, background-color 0.15s ease';
      cursor.style.transform = 'translate(-100px, -100px)';
      document.body.appendChild(cursor);

      window.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate(${e.clientX - 11}px, ${e.clientY - 11}px)`;
      });

      window.addEventListener('mousedown', () => {
        cursor.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
      });

      window.addEventListener('mouseup', () => {
        cursor.style.backgroundColor = 'rgba(99, 102, 241, 0.75)';
      });
    });
  });
}

async function smoothMove(page, targetX, targetY, steps = 25) {
  await page.mouse.move(targetX, targetY, { steps });
}

async function smoothScroll(page, targetY, durationMs = 1200) {
  await page.evaluate(async ({ targetY, durationMs }) => {
    const startY = window.scrollY;
    const diff = targetY - startY;
    const startTime = performance.now();

    await new Promise((resolve) => {
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
        window.scrollTo(0, startY + diff * ease);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }, { targetY, durationMs });
}

async function recordScene(sceneNumber, actionFn) {
  const sceneInfo = durations.find(d => d.scene === sceneNumber);
  const targetDurationMs = (sceneInfo ? sceneInfo.durationSec + 1.5 : 35) * 1000;
  console.log(`\n========================================`);
  console.log(`Recording Scene ${sceneNumber} (Target Duration: ${(targetDurationMs/1000).toFixed(1)}s)...`);

  const sceneDir = path.join(recordDir, `scene_${sceneNumber}`);
  if (fs.existsSync(sceneDir)) fs.rmSync(sceneDir, { recursive: true, force: true });
  fs.mkdirSync(sceneDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: sceneDir,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  await injectCursor(page);

  const startTime = Date.now();

  try {
    await actionFn(page);
  } catch (err) {
    console.error(`Error during Scene ${sceneNumber} recording:`, err);
  }

  // Ensure minimum target duration so video matches voiceover perfectly
  const elapsed = Date.now() - startTime;
  if (elapsed < targetDurationMs) {
    const remaining = targetDurationMs - elapsed;
    console.log(`Holding final state of Scene ${sceneNumber} for ${(remaining/1000).toFixed(1)}s to match audio...`);
    await page.waitForTimeout(remaining);
  }

  await context.close();
  await browser.close();

  // Find generated webm file
  const files = fs.readdirSync(sceneDir).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const originalPath = path.join(sceneDir, files[0]);
    const finalPath = path.join(recordDir, `scene_${sceneNumber}.webm`);
    fs.copyFileSync(originalPath, finalPath);
    console.log(`Scene ${sceneNumber} recorded successfully: ${finalPath}`);
  }
}

async function main() {
  console.log('Starting full automated screen recording pipeline...');

  // SCENE 1: Title & Project Overview
  await recordScene(1, async (page) => {
    const htmlUrl = 'file:///' + path.resolve('public_demo', 'scene1_intro.html').replace(/\\/g, '/');
    await page.goto(htmlUrl);
    await page.waitForTimeout(4000);
    await smoothMove(page, 400, 380, 40);
    await page.waitForTimeout(6000);
    await smoothMove(page, 320, 580, 40);
    await page.waitForTimeout(8000);
    await smoothMove(page, 640, 580, 40);
    await page.waitForTimeout(8000);
    await smoothMove(page, 960, 580, 40);
    await page.waitForTimeout(8000);
    await smoothMove(page, 500, 980, 40);
    await page.waitForTimeout(6000);
  });

  // SCENE 2: Landing Page & Authentication (Owner Login)
  await recordScene(2, async (page) => {
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(3000);
    await smoothMove(page, 600, 400, 30);
    await page.waitForTimeout(3000);
    await smoothScroll(page, 650, 1800);
    await page.waitForTimeout(4000);
    await smoothScroll(page, 1200, 1800);
    await page.waitForTimeout(5000);
    await smoothScroll(page, 400, 1500);
    await page.waitForTimeout(4000);

    // Click Owner Demo
    const ownerBtn = page.locator('button:has-text("Owner Demo")').first();
    if (await ownerBtn.isVisible()) {
      const box = await ownerBtn.boundingBox();
      if (box) {
        await smoothMove(page, box.x + box.width / 2, box.y + box.height / 2, 30);
        await page.waitForTimeout(1500);
        await ownerBtn.click();
      }
    } else {
      await page.goto('http://localhost:5173/login');
      await page.fill('input[type="email"]', 'owner@example.com');
      await page.fill('input[type="password"]', 'Password123!');
      await page.click('button[type="submit"]');
    }
    await page.waitForURL('**/owner/dashboard', { timeout: 10000 });
    await page.waitForTimeout(3000);
  });

  // SCENE 3: Owner Dashboard & Portfolio Management
  await recordScene(3, async (page) => {
    // Authenticate as owner
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/owner/dashboard', { timeout: 10000 });

    await page.waitForTimeout(4000);
    await smoothMove(page, 350, 240, 30); // KPI card 1
    await page.waitForTimeout(4000);
    await smoothMove(page, 600, 240, 30); // KPI card 2
    await page.waitForTimeout(4000);
    await smoothMove(page, 850, 240, 30); // KPI card 3
    await page.waitForTimeout(4000);
    await smoothScroll(page, 450, 1600); // Recharts charts
    await page.waitForTimeout(7000);
    await smoothScroll(page, 0, 1200);
    await page.waitForTimeout(3000);

    // Navigate to Properties
    await page.goto('http://localhost:5173/owner/properties');
    await page.waitForTimeout(4000);

    // Click Grandview Heights property
    const propLink = page.locator('text=Grandview Heights').first();
    if (await propLink.isVisible()) {
      await propLink.click();
      await page.waitForTimeout(4000);
    }
    await smoothScroll(page, 300, 1200);
    await page.waitForTimeout(4000);

    // Click Generate Invite
    const inviteBtn = page.locator('button:has-text("Generate Invite")').first();
    if (await inviteBtn.isVisible()) {
      await inviteBtn.click();
      await page.waitForTimeout(4000);
      const closeBtn = page.locator('button:has-text("Close"), button:has-text("Cancel")').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
    await page.waitForTimeout(3000);
  });

  // SCENE 4: Tenant Residence & Maintenance Creation
  await recordScene(4, async (page) => {
    // Login as Tenant 1
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'tenant1@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tenant/dashboard', { timeout: 10000 });

    await page.waitForTimeout(5000);
    await smoothMove(page, 400, 320, 30); // Residence info
    await page.waitForTimeout(5000);

    // Navigate to Maintenance
    await page.goto('http://localhost:5173/tenant/maintenance');
    await page.waitForTimeout(4000);

    // Navigate to New Request
    await page.goto('http://localhost:5173/tenant/maintenance/new');
    await page.waitForTimeout(3000);

    // Fill in maintenance form
    await page.fill('input[name="title"]', 'Leaking bathroom faucet and low water pressure');
    await page.waitForTimeout(1000);
    const catSelect = page.locator('select[name="category"]');
    if (await catSelect.isVisible()) await catSelect.selectOption('PLUMBING');
    await page.waitForTimeout(1000);
    const prioSelect = page.locator('select[name="priority"]');
    if (await prioSelect.isVisible()) await prioSelect.selectOption('HIGH');
    await page.waitForTimeout(1000);
    await page.fill('textarea[name="description"]', 'The master bathroom faucet has developed a steady leak under the sink basin, and water pressure is fluctuating intermittently.');
    await page.waitForTimeout(2000);

    await page.click('button[type="submit"]');
    await page.waitForURL('**/tenant/maintenance', { timeout: 10000 });
    await page.waitForTimeout(4000);
  });

  // SCENE 5: Staff Work Queue & Maintenance Lifecycle
  await recordScene(5, async (page) => {
    // Login as Staff
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'staff@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/staff/dashboard', { timeout: 10000 });

    await page.waitForTimeout(4000);
    await smoothMove(page, 400, 240, 25);
    await page.waitForTimeout(4000);

    // Go to Assigned Work Orders
    await page.goto('http://localhost:5173/staff/requests');
    await page.waitForTimeout(4000);

    // Open first maintenance ticket
    const ticketLink = page.locator('table tbody tr a, table tbody tr').first();
    if (await ticketLink.isVisible()) {
      await ticketLink.click();
      await page.waitForTimeout(4000);
    }

    // Click Start Work (IN_PROGRESS) if available
    const startWorkBtn = page.locator('button:has-text("Start Work")').first();
    if (await startWorkBtn.isVisible()) {
      await startWorkBtn.click();
      await page.waitForTimeout(3500);
    }

    // Add a comment
    const commentInput = page.locator('textarea').first();
    if (await commentInput.isVisible()) {
      await commentInput.fill('Dispatched to unit. Inspecting washer and pressure valve.');
      await page.waitForTimeout(1000);
      const postBtn = page.locator('button:has-text("Post"), button:has-text("Send"), button:has-text("Comment")').first();
      if (await postBtn.isVisible()) await postBtn.click();
      await page.waitForTimeout(3000);
    }

    // Mark Completed if available
    const completeBtn = page.locator('button:has-text("Mark Completed"), button:has-text("Complete")').first();
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
      await page.waitForTimeout(4000);
    }
  });

  // SCENE 6: Amenity Scheduling & Conflict-Free Bookings
  await recordScene(6, async (page) => {
    // Login as Tenant 1
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'tenant1@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tenant/dashboard', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Navigate to Amenities
    await page.goto('http://localhost:5173/tenant/amenities');
    await page.waitForTimeout(4000);

    // Open Booking modal on first available amenity
    const bookBtn = page.locator('button:has-text("Book Time Slot"), button:has-text("Reserve")').first();
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      await page.waitForTimeout(2500);

      // Select attendee count
      const attendeeInput = page.locator('input[type="number"]');
      if (await attendeeInput.isVisible()) {
        await attendeeInput.fill('2');
        await page.waitForTimeout(1000);
      }

      // Submit booking
      const confirmBtn = page.locator('button:has-text("Confirm Booking"), button:has-text("Reserve")').first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForTimeout(4000);
      }
    }

    // Navigate to My Bookings
    await page.goto('http://localhost:5173/tenant/bookings');
    await page.waitForTimeout(4000);
  });

  // SCENE 7: Concurrency Conflict & Database Exclusion Constraint
  await recordScene(7, async (page) => {
    // Login as Tenant 2
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'tenant2@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tenant/dashboard', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Go to Amenities
    await page.goto('http://localhost:5173/tenant/amenities');
    await page.waitForTimeout(3000);

    // Try to book the same slot (will trigger conflict)
    const bookBtn = page.locator('button:has-text("Book Time Slot"), button:has-text("Reserve")').first();
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      await page.waitForTimeout(2500);

      // Confirm overlapping booking -> throws conflict
      const confirmBtn = page.locator('button:has-text("Confirm Booking"), button:has-text("Reserve")').first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForTimeout(5000); // Highlight red conflict error alert
      }

      // Close modal
      const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Close")').first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    // Show availability schedule
    await smoothScroll(page, 300, 1500);
    await page.waitForTimeout(5000);
  });

  // SCENE 8: Check-In Lifecycle & Automated Schedulers
  await recordScene(8, async (page) => {
    // Return to Tenant 1
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'tenant1@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tenant/dashboard', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // View My Bookings
    await page.goto('http://localhost:5173/tenant/bookings');
    await page.waitForTimeout(4000);

    // Check In / Check Out buttons
    const checkInBtn = page.locator('button:has-text("Check In")').first();
    if (await checkInBtn.isVisible()) {
      await checkInBtn.click();
      await page.waitForTimeout(3500);
    }

    const checkOutBtn = page.locator('button:has-text("Check Out")').first();
    if (await checkOutBtn.isVisible()) {
      await checkOutBtn.click();
      await page.waitForTimeout(3500);
    }

    await smoothScroll(page, 200, 1000);
    await page.waitForTimeout(4000);
  });

  // SCENE 9: Real-Time Notifications & Conclusion
  await recordScene(9, async (page) => {
    // View Notifications
    await page.goto('http://localhost:5173/notifications');
    await page.waitForTimeout(5000);
    await smoothMove(page, 500, 300, 25);
    await page.waitForTimeout(4000);

    // Load final closing summary screen
    const htmlUrl = 'file:///' + path.resolve('public_demo', 'scene9_closing.html').replace(/\\/g, '/');
    await page.goto(htmlUrl);
    await page.waitForTimeout(4000);
    await smoothMove(page, 450, 480, 30);
    await page.waitForTimeout(5000);
    await smoothMove(page, 750, 480, 30);
    await page.waitForTimeout(5000);
    await smoothMove(page, 1050, 480, 30);
    await page.waitForTimeout(5000);
  });

  console.log('\nAll 9 scenes recorded successfully into raw_recordings/!');
}

main().catch(console.error);
