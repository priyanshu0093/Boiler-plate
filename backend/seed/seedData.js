const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const { Organization } = require('../models/Organization');
const { OrganizationMember } = require('../models/OrganizationMember');
const { Resource } = require('../models/Resource');
const { Booking } = require('../models/Booking');
const { Notification } = require('../models/Notification');

const seedUsers = [
  {
    name: 'Office Operations Admin',
    email: 'admin@deskdrop.internal',
    password: 'password123',
    role: 'ADMIN'
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@deskdrop.internal',
    password: 'password123',
    role: 'EMPLOYEE'
  },
  {
    name: 'Alex Chen',
    email: 'alex.chen@deskdrop.internal',
    password: 'password123',
    role: 'EMPLOYEE'
  },
  {
    name: 'Marcus Vance',
    email: 'marcus.vance@deskdrop.internal',
    password: 'password123',
    role: 'EMPLOYEE'
  },
  {
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@deskdrop.internal',
    password: 'password123',
    role: 'EMPLOYEE'
  }
];

const seedResources = [
  // SPACES (2 Meeting Rooms)
  {
    name: 'Boardroom Alpha',
    category: 'SPACES',
    description: 'Executive boardroom equipped with 4K teleconferencing screen, Cisco video bar, and dual presentation displays.',
    location: 'Floor 3, East Wing, Room 301',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    specifications: {
      capacity: '14 people',
      display: '75" 4K HDR Display',
      videoConferencing: 'Cisco Webex Room Kit',
      whiteboard: 'Magnetic Glass Whiteboard'
    },
    status: 'AVAILABLE',
    isActive: true
  },
  {
    name: 'Focus Pod Bravo',
    category: 'SPACES',
    description: 'Sound-isolated acoustic focus booth designed for 1:1 syncs, deep work sessions, or private video calls.',
    location: 'Floor 2, Central Hub, Pod 04',
    image: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80',
    specifications: {
      capacity: '2 people',
      soundIsolation: '32 dB Acoustic Dampening',
      power: 'Dual AC + USB-C PD 65W',
      ventilation: 'Continuous Ultra-Quiet Airflow'
    },
    status: 'AVAILABLE',
    isActive: true
  },

  // AUDIO (2 Audio Resources)
  {
    name: 'Shure MV7 Podcast Microphone 01',
    category: 'AUDIO',
    description: 'Broadcast-grade dynamic microphone with dual USB/XLR output, touch panel controls, and built-in headphone monitoring.',
    location: 'Floor 1, Media Studio Locker A1',
    image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80',
    specifications: {
      polarPattern: 'Cardioid',
      connectivity: 'USB-C / XLR',
      sampleRate: '24-bit / 48kHz',
      accessories: 'Desk Boom Arm & Pop Filter'
    },
    status: 'AVAILABLE',
    isActive: true
  },
  {
    name: 'Røde Wireless PRO Dual Mic Kit',
    category: 'AUDIO',
    description: 'Dual-channel wireless lapel mic system with 32-bit float on-board recording, timecode sync, and 260m range.',
    location: 'Floor 1, Media Studio Locker A3',
    image: 'https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=800&q=80',
    specifications: {
      channels: '2 Transmitters + 1 Receiver',
      batteryLife: '7 Hours per Charge',
      storage: '32GB Internal Memory per TX',
      latency: 'Ultra-low <4ms'
    },
    status: 'AVAILABLE',
    isActive: true
  },

  // TESTING HARDWARE (2 Testing Devices)
  {
    name: 'Apple iPhone 15 Pro (Test Rig A)',
    category: 'TESTING_HARDWARE',
    description: 'Dedicated QA mobile test device running iOS 18 beta profile with developer mode enabled and Xcode debug profile.',
    location: 'Floor 2, Mobile QA Lab, Cabinet 02',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
    specifications: {
      osVersion: 'iOS 18.1',
      storage: '256 GB',
      chipset: 'A17 Pro',
      carrier: 'Unlocked / Test eSIM Installed'
    },
    status: 'AVAILABLE',
    isActive: true
  },
  {
    name: 'Google Pixel 8 Pro (Test Rig B)',
    category: 'TESTING_HARDWARE',
    description: 'Clean stock Android device configured with Android 15 developer preview, rooted for network proxy & SSL inspection.',
    location: 'Floor 2, Mobile QA Lab, Cabinet 03',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80',
    specifications: {
      osVersion: 'Android 15',
      storage: '128 GB',
      chipset: 'Google Tensor G3',
      display: '120Hz Super Actua OLED'
    },
    status: 'AVAILABLE',
    isActive: true
  },

  // DISPLAYS (2 Displays)
  {
    name: 'Dell UltraSharp 32" 4K Video Editing Monitor',
    category: 'DISPLAYS',
    description: 'IPS Black technology display with 98% DCI-P3 color gamut, integrated 90W USB-C hub, and RJ45 ethernet pass-through.',
    location: 'Floor 2, Creative Suite Desk 14',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    specifications: {
      resolution: '3840 x 2160 (4K UHD)',
      panelType: 'IPS Black (2000:1 Contrast)',
      powerDelivery: '90W USB-C PD',
      colorAccuracy: 'Delta E < 2 Calibrated'
    },
    status: 'AVAILABLE',
    isActive: true
  },
  {
    name: 'LG DualUp 28" Ergonomic Display',
    category: 'DISPLAYS',
    description: 'Unique 16:18 aspect ratio vertical monitor with Ergo Arm mount, ideal for multi-stack code review and terminal monitoring.',
    location: 'Floor 3, Dev Hot-Desks Desk 08',
    image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=800&q=80',
    specifications: {
      resolution: '2560 x 2880 (SDQHD)',
      aspectRatio: '16:18 Double QHD',
      mount: 'Ergo Clamp Arm 360-degree',
      connectivity: 'USB-C, 2x HDMI, DisplayPort'
    },
    status: 'AVAILABLE',
    isActive: true
  },

  // PROJECTOR (1 Projector under DISPLAYS/OTHER)
  {
    name: 'Epson PowerLite 4K Laser Projector 01',
    category: 'OTHER',
    description: 'High-brightness 5,000 lumens 3LCD laser projector for all-hands meetings, town halls, and auditorium presentations.',
    location: 'Floor 1, Town Hall Stage Storage',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
    specifications: {
      brightness: '5,000 Lumens Color/White',
      resolution: '4K Enhancement Technology',
      throwRatio: '1.35 - 2.20:1 Zoom',
      inputs: '2x HDMI 2.0, HDBaseT, Wireless Miracast'
    },
    status: 'AVAILABLE',
    isActive: true
  }
];

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/deskdrop';
    console.log(`[Seed] Connecting to MongoDB: ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('[Seed] Clearing existing collections...');
    await Notification.deleteMany({});
    await Booking.deleteMany({});
    await Resource.deleteMany({});
    await OrganizationMember.deleteMany({});
    await Organization.deleteMany({});
    await User.deleteMany({});

    console.log('[Seed] Seeding employees...');
    const createdUsers = [];
    for (const u of seedUsers) {
      const user = await User.create(u);
      createdUsers.push(user);
    }
    console.log(`[Seed] Created ${createdUsers.length} employees:`);
    createdUsers.forEach((u) => console.log(`  - ${u.name} (${u.email}) [Password: password123]`));

    console.log('[Seed] Seeding default organization...');
    const adminUser = createdUsers.find((u) => u.role === 'ADMIN') || createdUsers[0];
    const defaultOrg = await Organization.create({
      name: 'DeskDrop Headquarters',
      slug: 'deskdrop-hq',
      owner: adminUser._id,
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      settings: {
        timezone: 'UTC',
        bookingGraceMinutes: 15,
        maxBookingDurationHours: 8,
        allowGuestBookings: false
      }
    });
    console.log(`[Seed] Created organization: ${defaultOrg.name} (${defaultOrg.slug})`);

    console.log('[Seed] Creating organization memberships...');
    for (const u of createdUsers) {
      const role = u._id.equals(defaultOrg.owner) ? 'OWNER' : u.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
      await OrganizationMember.create({
        organizationId: defaultOrg._id,
        userId: u._id,
        role
      });
    }

    console.log('[Seed] Seeding office resources with organizationId...');
    const resourcesWithOrg = seedResources.map((r) => ({
      ...r,
      organizationId: defaultOrg._id
    }));
    const createdResources = await Resource.insertMany(resourcesWithOrg);
    console.log(`[Seed] Created ${createdResources.length} resources:`);
    createdResources.forEach((r) => console.log(`  - [${r.category}] ${r.name} (${r.location})`));

    console.log('\n[Seed] Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seed();
