import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  CalendarCheck2,
  ShieldCheck,
  Zap,
  Users2,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronDown,
  Monitor,
  BarChart3,
  Activity,
  DoorOpen,
  Calendar,
  Check,
  Sliders,
  Laptop
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [openFaq, setOpenFaq] = useState(0);

  const toggleFaq = (index) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqItems = [
    {
      q: 'What is Boiler Plate?',
      a: 'Boiler Plate is a modern, real-time internal resource and asset booking SaaS platform. It enables organizations to coordinate conference rooms, hot desks, private pods, and shared media hardware without double bookings or administrative friction.'
    },
    {
      q: 'How does workspace isolation work?',
      a: 'Every company created in Boiler Plate operates within a dedicated tenant sandbox. All resources, bookings, notifications, and real-time WebSocket events are strictly scoped by your organization ID, ensuring zero data leakage across companies.'
    },
    {
      q: 'Can I invite my team?',
      a: 'Yes. Workspace owners and admins can generate secure email invitations with cryptographically random, single-use tokens. New teammates can register directly with full name and password, while existing Boiler Plate users can accept invitations with their current credentials.'
    },
    {
      q: 'How does Boiler Plate prevent conflicting bookings?',
      a: 'Boiler Plate uses backend-enforced concurrency mutex locking on time intervals. If two team members attempt to confirm overlapping reservations for the exact same resource at the same second, the first request locks the window and the second is safely rejected with a conflict error.'
    },
    {
      q: 'What are the Free plan limits?',
      a: 'The Free tier includes up to 10 active resources (rooms, desks, or equipment), up to 15 team members, and a 7-day advance booking window. It includes full real-time WebSocket synchronization and multi-tenant isolation with zero upfront commitment.'
    },
    {
      q: 'Can I switch between workspaces?',
      a: 'Yes. A single employee profile can belong to multiple workspaces (for example, headquarters and a regional lab). You can switch between your active workspaces instantly via the organization switcher in the navigation bar.'
    }
  ];

  return (
    <div className="landing-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Navigation Header */}
      <header
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-light)',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '7px',
                backgroundColor: 'var(--text-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 15
              }}
            >
              B
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Boiler Plate
              </span>
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)'
                }}
              >
                SaaS
              </span>
            </div>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              fontSize: 13.5,
              fontWeight: 500,
              color: 'var(--text-secondary)'
            }}
            className="landing-nav-links"
          >
            <a
              href="#preview"
              onClick={(e) => scrollToSection(e, 'preview')}
              style={{ color: 'inherit', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
            >
              Product
            </a>
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              style={{ color: 'inherit', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              style={{ color: 'inherit', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
            >
              How It Works
            </a>
            <a
              href="#use-cases"
              onClick={(e) => scrollToSection(e, 'use-cases')}
              style={{ color: 'inherit', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
            >
              Use Cases
            </a>
            <a
              href="#pricing"
              onClick={(e) => scrollToSection(e, 'pricing')}
              style={{ color: 'inherit', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={(e) => scrollToSection(e, 'faq')}
              style={{ color: 'inherit', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
            >
              FAQ
            </a>
          </nav>

          {/* Auth Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isAuthenticated ? (
              <Link
                to="/"
                className="landing-btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--text-inverse)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13.5,
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <span>Go to Workspace</span>
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  style={{
                    padding: '8px 14px',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none'
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="landing-btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    backgroundColor: 'var(--text-primary)',
                    color: 'var(--text-inverse)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13.5,
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  <span>Get Started Free</span>
                  <ChevronRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: '68px 24px 32px 24px',
          maxWidth: 1080,
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative'
        }}
      >
        {/* Top Feature Pill */}
        <div
          className="landing-animate-fade-up"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-full)',
            fontSize: '12.5px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 24,
            boxShadow: 'var(--shadow-subtle)'
          }}
        >
          <Sparkles size={14} style={{ color: '#2563EB' }} />
          <span>Next-Gen Workplace Resource & Asset Management Platform</span>
        </div>

        {/* Hero Headline */}
        <h1
          className="landing-animate-delay-1"
          style={{
            fontSize: 'clamp(36px, 5.2vw, 56px)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            marginBottom: 22
          }}
        >
          Effortless resource booking <br />
          <span style={{ color: '#2563EB' }}>built for high-velocity teams.</span>
        </h1>

        {/* Supporting Copy */}
        <p
          className="landing-animate-delay-2"
          style={{
            fontSize: 'clamp(15.5px, 2vw, 18.5px)',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            maxWidth: 740,
            margin: '0 auto 36px auto'
          }}
        >
          Boiler Plate unifies conference rooms, flex desks, and media hardware into a 
          high-concurrency, real-time shared workspace. Launch your isolated tenant hub in seconds with zero phantom reservations.
        </p>

        {/* CTA Buttons */}
        <div
          className="landing-animate-delay-3"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            flexWrap: 'wrap',
            marginBottom: 32
          }}
        >
          <Link
            to="/signup"
            className="landing-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 26px',
              backgroundColor: 'var(--text-primary)',
              color: 'var(--text-inverse)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14.5px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)'
            }}
          >
            <span>Start Your Workspace Free</span>
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="landing-btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 22px',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14.5px',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <span>Sign In to Existing Hub</span>
          </Link>
        </div>

        {/* Trust & Value Row directly below CTAs */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            flexWrap: 'wrap',
            padding: '10px 20px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-full)',
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
            fontWeight: 500,
            boxShadow: 'var(--shadow-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} style={{ color: '#10B981', flexShrink: 0 }} />
            <span>Real-time resource availability</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} style={{ color: '#2563EB', flexShrink: 0 }} />
            <span>Conflict-resistant booking</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={14} style={{ color: '#7C3AED', flexShrink: 0 }} />
            <span>Organization-level data isolation</span>
          </div>
        </div>
      </section>

      {/* Product Preview Section */}
      <section
        id="preview"
        style={{
          padding: '40px 24px 80px 24px',
          maxWidth: 1200,
          margin: '0 auto',
          position: 'relative'
        }}
      >
        {/* Ambient Glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '85%',
            height: 380,
            background: 'radial-gradient(ellipse at top, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0.02) 65%, transparent 100%)',
            filter: 'blur(36px)',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        {/* Large Product Preview Container */}
        <div className="landing-preview-container" style={{ position: 'relative', zIndex: 1 }}>
          {/* Top Browser / App Frame Bar */}
          <div
            style={{
              padding: '12px 18px',
              backgroundColor: '#FAFAF9',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            {/* Window Dots & App Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#F59E0B', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Boiler Plate Portal
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#DBEAFE',
                  color: '#1E3A8A',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                Acme Labs (Free Plan)
              </span>
            </div>

            {/* URL bar simulation with Live WebSocket indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11.5px',
                color: 'var(--text-secondary)'
              }}
            >
              <ShieldCheck size={12} style={{ color: '#10B981' }} />
              <span>boilerplate.app/workspace/acme-labs</span>
              <span style={{ color: 'var(--border-medium)' }}>|</span>
              <span style={{ color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                Live WebSocket
              </span>
            </div>

            <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
              7-Day Advance Horizon
            </div>
          </div>

          {/* Quota & Utilization Metric Strip */}
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              fontSize: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: 'var(--text-tertiary)', marginRight: 6 }}>Active Resources:</span>
                <strong style={{ color: 'var(--text-primary)' }}>7 / 10</strong>
                <span style={{ marginLeft: 6, color: '#059669', fontSize: '11px', fontWeight: 600 }}>[70% Quota]</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)', marginRight: 6 }}>Active Members:</span>
                <strong style={{ color: 'var(--text-primary)' }}>11 / 15</strong>
                <span style={{ marginLeft: 6, color: '#2563EB', fontSize: '11px', fontWeight: 600 }}>[4 Seats Open]</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)', marginRight: 6 }}>Advance Window:</span>
                <strong style={{ color: 'var(--text-primary)' }}>7 Days</strong>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={14} style={{ color: '#2563EB' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Live Capacity:</span>
              <span
                style={{
                  fontWeight: 700,
                  color: '#059669',
                  backgroundColor: '#ECFDF5',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11.5px'
                }}
              >
                68% Utilized
              </span>
            </div>
          </div>

          {/* Main Simulated Interactive Dashboard Body */}
          <div
            style={{
              padding: 24,
              backgroundColor: '#FBFBF9',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
              gap: 20
            }}
          >
            {/* Column 1: Live Resources List */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                padding: 18,
                boxShadow: 'var(--shadow-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={16} style={{ color: '#2563EB' }} />
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Workspace Resources
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Live Status</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Resource Item 1 */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FAFAF9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Boardroom Alpha
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      14 People • 4K Video Kit
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--status-inuse-bg)',
                      color: 'var(--status-inuse)',
                      border: '1px solid var(--status-inuse-border)'
                    }}
                  >
                    IN_USE
                  </span>
                </div>

                {/* Resource Item 2 */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FAFAF9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Focus Pod Beta
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      2 People • Acoustic Glass
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--status-available-bg)',
                      color: 'var(--status-available)',
                      border: '1px solid var(--status-available-border)'
                    }}
                  >
                    AVAILABLE
                  </span>
                </div>

                {/* Resource Item 3 */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FAFAF9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Standing Flex Desk 04
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Dual 4K USB-C Hub
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--status-available-bg)',
                      color: 'var(--status-available)',
                      border: '1px solid var(--status-available-border)'
                    }}
                  >
                    AVAILABLE
                  </span>
                </div>

                {/* Resource Item 4 */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FAFAF9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Mobile 4K Video Bar Kit
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Cisco Webex Room Kit
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--status-inuse-bg)',
                      color: 'var(--status-inuse)',
                      border: '1px solid var(--status-inuse-border)'
                    }}
                  >
                    IN_USE
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: Upcoming Booking Card with Live Countdown & Check-in */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                padding: 18,
                boxShadow: 'var(--shadow-subtle)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarCheck2 size={16} style={{ color: '#10B981' }} />
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Your Upcoming Booking
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#047857',
                    backgroundColor: '#D1FAE5',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  CONFIRMED
                </span>
              </div>

              {/* Countdown Banner */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 14
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>
                    Check-in Window Open
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E3A8A', fontFamily: 'var(--font-mono)' }}>
                    Starts in 14m 22s
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#1E3A8A' }}>
                  Boardroom Alpha • Floor 3, East Wing
                </div>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Q4 Product Strategy & Architecture Sync
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: 16 }}>
                Today: 10:30 AM – 11:30 AM (Organizer: You)
              </div>

              {/* Action buttons simulation */}
              <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    backgroundColor: 'var(--text-primary)',
                    color: 'var(--text-inverse)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Check size={14} />
                  <span>Check In Now</span>
                </button>
                <button
                  type="button"
                  style={{
                    padding: '9px 14px',
                    backgroundColor: '#FAFAF9',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'default'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Column 3: Weekly Calendar & Recent Team Activity */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                padding: 18,
                boxShadow: 'var(--shadow-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}
            >
              {/* Mini Calendar strip */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={15} style={{ color: '#2563EB' }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Weekly Schedule
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>8 Bookings</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, textAlign: 'center' }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                    <div
                      key={day}
                      style={{
                        padding: '6px 4px',
                        backgroundColor: i === 2 ? '#EFF6FF' : '#F9FAFB',
                        border: i === 2 ? '1px solid #BFDBFE' : '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div style={{ fontSize: '10px', color: i === 2 ? '#1E40AF' : 'var(--text-tertiary)', fontWeight: 600 }}>
                        {day}
                      </div>
                      <div style={{ fontSize: '11.5px', fontWeight: 700, color: i === 2 ? '#1E3A8A' : 'var(--text-primary)', marginTop: 2 }}>
                        {12 + i}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Recent Team Activity
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Alex Chen</strong> checked in to Boardroom Alpha
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2563EB' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Priya Sharma</strong> reserved Focus Pod Beta
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#7C3AED' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Jordan Lee</strong> completed session at Desk 04
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        style={{
          padding: '80px 24px',
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#2563EB',
              marginBottom: 8,
              display: 'inline-block'
            }}
          >
            Enterprise-Grade Infrastructure
          </span>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: 12
            }}
          >
            Engineered for zero conflicts and effortless collaboration
          </h2>
          <p style={{ fontSize: '15.5px', color: 'var(--text-secondary)', maxWidth: 620, margin: '0 auto' }}>
            Everything modern workplace operations and team leads need to organize shared company assets without chaos.
          </p>
        </div>

        {/* 6 Feature Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24
          }}
        >
          {/* Card 1: Multi-Tenant Architecture */}
          <div
            className="landing-card-hover"
            style={{
              padding: 26,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18
              }}
            >
              <Building2 size={22} />
            </div>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
              Multi-Tenant Architecture
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Strict organization-level data isolation. Switch seamlessly between multiple corporate workspaces with granular role-based access control.
            </p>
          </div>

          {/* Card 2: Zero-Conflict Mutex Booking */}
          <div
            className="landing-card-hover"
            style={{
              padding: 26,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(46, 125, 50, 0.08)',
                color: 'var(--status-available)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18
              }}
            >
              <CalendarCheck2 size={22} />
            </div>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
              Zero-Conflict Mutex Booking
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              High-concurrency mutex locks eliminate double-bookings and phantom reservations across overlapping time slots in real time.
            </p>
          </div>

          {/* Card 3: Secure Email Invitations */}
          <div
            className="landing-card-hover"
            style={{
              padding: 26,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(217, 119, 6, 0.08)',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18
              }}
            >
              <Users2 size={22} />
            </div>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
              Secure Email Invitations
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Invite teammates via single-use cryptographically hashed tokens. Support for instant onboarding with verified role assignments.
            </p>
          </div>

          {/* Card 4: Real-Time WebSocket Sync */}
          <div
            className="landing-card-hover"
            style={{
              padding: 26,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(124, 58, 237, 0.08)',
                color: '#7C3AED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18
              }}
            >
              <Zap size={22} />
            </div>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
              Real-Time WebSocket Sync
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Live availability status badges, instant notifications, and room-isolated events without noisy global broadcast delays.
            </p>
          </div>

          {/* Card 5: Smart Booking Lifecycle (NEW) */}
          <div
            className="landing-card-hover"
            style={{
              padding: 26,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(14, 165, 233, 0.08)',
                color: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18
              }}
            >
              <Clock size={22} />
            </div>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
              Smart Booking Lifecycle
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Complete check-in confirmation, quick check-out, penalty-free cancellations, and automatic release of abandoned office reservations.
            </p>
          </div>

          {/* Card 6: Workspace Analytics (NEW) */}
          <div
            className="landing-card-hover"
            style={{
              padding: 26,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(236, 72, 153, 0.08)',
                color: '#DB2777',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18
              }}
            >
              <BarChart3 size={22} />
            </div>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
              Workspace Analytics
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Live resource utilization metrics, booking frequency tracking, team capacity meters, and proactive plan quota monitoring.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        style={{
          padding: '80px 24px',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid var(--border-light)',
          borderBottom: '1px solid var(--border-light)'
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 54 }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#2563EB',
                marginBottom: 8,
                display: 'inline-block'
              }}
            >
              Simple 3-Step Setup
            </span>
            <h2
              style={{
                fontSize: 'clamp(26px, 3.5vw, 36px)',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: 12
              }}
            >
              How Boiler Plate Works
            </h2>
            <p style={{ fontSize: '15.5px', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
              From initial registration to team-wide resource booking in under three minutes.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: 32,
              position: 'relative'
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                padding: 28,
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div className="landing-step-indicator">01</div>
                <Building2 size={20} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                Create Your Workspace
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Register your account and configure your dedicated company workspace. You are automatically provisioned the Owner role with administrative controls.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                padding: 28,
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div className="landing-step-indicator">02</div>
                <Sliders size={20} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                Add Resources & Invite Team
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Catalog your meeting rooms, standing desks, and shared hardware. Dispatch cryptographically secure email invitations to bring colleagues on board.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                padding: 28,
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div className="landing-step-indicator">03</div>
                <CalendarCheck2 size={20} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                Book, Check In & Collaborate
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Employees view real-time availability, lock in conflict-free reservations, and confirm arrival with single-click check-ins and live status broadcasts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section
        id="use-cases"
        style={{
          padding: '80px 24px',
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#2563EB',
              marginBottom: 8,
              display: 'inline-block'
            }}
          >
            Versatile Workplace Scenarios
          </span>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: 12
            }}
          >
            One Workspace. Every Shared Resource.
          </h2>
          <p style={{ fontSize: '15.5px', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
            Flexible enough for conference suites, hybrid flex seating, and high-value team equipment.
          </p>
        </div>

        {/* 3 Use Case Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24
          }}
        >
          {/* Use Case 1: Meeting Rooms */}
          <div
            className="landing-card-hover"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <DoorOpen size={20} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                Meeting Rooms
              </h3>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
              Simplify room scheduling, eliminate double-booked boardrooms, and ensure presentation displays are ready before your client calls begin.
            </p>

            {/* UI Mockup Widget */}
            <div
              style={{
                marginTop: 'auto',
                padding: 14,
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>Executive Boardroom</strong>
                <span style={{ color: '#059669', fontWeight: 600 }}>AVAILABLE</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, backgroundColor: '#E0E7FF', color: '#3730A3', padding: '1px 6px', borderRadius: 4 }}>
                  14 Seats
                </span>
                <span style={{ fontSize: 10.5, backgroundColor: '#E0E7FF', color: '#3730A3', padding: '1px 6px', borderRadius: 4 }}>
                  Dual 4K HDR
                </span>
                <span style={{ fontSize: 10.5, backgroundColor: '#E0E7FF', color: '#3730A3', padding: '1px 6px', borderRadius: 4 }}>
                  Webex Kit
                </span>
              </div>
            </div>
          </div>

          {/* Use Case 2: Desks & Shared Spaces */}
          <div
            className="landing-card-hover"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(46, 125, 50, 0.08)',
                  color: 'var(--status-available)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Monitor size={20} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                Desks & Shared Spaces
              </h3>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
              Make hot desk reservations and quiet focus pod availability transparent for hybrid workforces, eliminating morning desk-hunting anxiety.
            </p>

            {/* UI Mockup Widget */}
            <div
              style={{
                marginTop: 'auto',
                padding: 14,
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>Hot Desk Zone East</strong>
                <span style={{ color: '#B45309', fontWeight: 600 }}>IN_USE (Till 2PM)</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, backgroundColor: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 4 }}>
                  Standing Desk
                </span>
                <span style={{ fontSize: 10.5, backgroundColor: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 4 }}>
                  Ergo Chair
                </span>
                <span style={{ fontSize: 10.5, backgroundColor: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 4 }}>
                  USB-C Dock
                </span>
              </div>
            </div>
          </div>

          {/* Use Case 3: Equipment & Hardware */}
          <div
            className="landing-card-hover"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(124, 58, 237, 0.08)',
                  color: '#7C3AED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Laptop size={20} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                Equipment & Hardware
              </h3>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
              Track shared mobile video bars, VR headsets, testing devices, and high-end cameras with verified check-in accountability and return timers.
            </p>

            {/* UI Mockup Widget */}
            <div
              style={{
                marginTop: 'auto',
                padding: 14,
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>4K Wireless Camera Rig</strong>
                <span style={{ color: '#059669', fontWeight: 600 }}>AVAILABLE</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, backgroundColor: '#EDE9FE', color: '#5B21B6', padding: '1px 6px', borderRadius: 4 }}>
                  Hardware Kit
                </span>
                <span style={{ fontSize: 10.5, backgroundColor: '#EDE9FE', color: '#5B21B6', padding: '1px 6px', borderRadius: 4 }}>
                  Battery Packs
                </span>
                <span style={{ fontSize: 10.5, backgroundColor: '#EDE9FE', color: '#5B21B6', padding: '1px 6px', borderRadius: 4 }}>
                  Storage Bay 2
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Plan Pricing Section */}
      <section
        id="pricing"
        style={{
          padding: '80px 24px',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid var(--border-light)',
          borderBottom: '1px solid var(--border-light)'
        }}
      >
        <div style={{ maxWidth: 840, margin: '0 auto', textAlign: 'center' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#2563EB',
              marginBottom: 8,
              display: 'inline-block'
            }}
          >
            Transparent Free Tier
          </span>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: 12
            }}
          >
            Start with our generous Free Plan
          </h2>
          <p style={{ fontSize: '15.5px', color: 'var(--text-secondary)', maxWidth: 540, margin: '0 auto 40px auto' }}>
            Everything your team needs to streamline office resources, with zero subscription fees or upfront credit cards.
          </p>

          {/* Minimal, Prominent Pricing Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '2px solid #2563EB',
              borderRadius: 'var(--radius-lg)',
              padding: '36px 32px',
              textAlign: 'left',
              boxShadow: '0 12px 36px -8px rgba(37, 99, 235, 0.12)',
              position: 'relative'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 16,
                paddingBottom: 24,
                borderBottom: '1px solid var(--border-medium)'
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#2563EB',
                    backgroundColor: '#DBEAFE',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    marginBottom: 8
                  }}
                >
                  Standard Plan
                </span>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Free Workspace
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Full multi-tenant booking system for growing companies and collaborative teams.
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  $0
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Forever free for teams
                </div>
              </div>
            </div>

            {/* Plan Limits Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 16,
                padding: '24px 0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '14px', color: 'var(--text-primary)' }}>
                <CheckCircle2 size={17} style={{ color: '#10B981', flexShrink: 0 }} />
                <span><strong>Up to 10 active resources</strong> (desks, rooms, devices)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '14px', color: 'var(--text-primary)' }}>
                <CheckCircle2 size={17} style={{ color: '#10B981', flexShrink: 0 }} />
                <span><strong>Up to 15 active members</strong> in workspace</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '14px', color: 'var(--text-primary)' }}>
                <CheckCircle2 size={17} style={{ color: '#10B981', flexShrink: 0 }} />
                <span><strong>7-day advance booking window</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '14px', color: 'var(--text-primary)' }}>
                <CheckCircle2 size={17} style={{ color: '#10B981', flexShrink: 0 }} />
                <span><strong>Real-time updates & booking management</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '14px', color: 'var(--text-primary)' }}>
                <CheckCircle2 size={17} style={{ color: '#10B981', flexShrink: 0 }} />
                <span><strong>Zero-conflict concurrency mutex locking</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '14px', color: 'var(--text-primary)' }}>
                <CheckCircle2 size={17} style={{ color: '#10B981', flexShrink: 0 }} />
                <span><strong>Self-service email invitations & roles</strong></span>
              </div>
            </div>

            <div style={{ paddingTop: 8, textAlign: 'center' }}>
              <Link
                to="/signup"
                className="landing-btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '14px 32px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '15px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  width: '100%',
                  maxWidth: 420
                }}
              >
                <span>Create Your Free Workspace</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        style={{
          padding: '80px 24px',
          maxWidth: 820,
          margin: '0 auto',
          width: '100%'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#2563EB',
              marginBottom: 8,
              display: 'inline-block'
            }}
          >
            Clear Answers
          </span>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: 10
            }}
          >
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
            Everything you need to know about setting up and using Boiler Plate.
          </p>
        </div>

        {/* Accessible Accordion */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          {faqItems.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-subtle)'
                }}
              >
                <button
                  type="button"
                  className="landing-faq-trigger"
                  onClick={() => toggleFaq(idx)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      color: 'var(--text-tertiary)',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0
                    }}
                  />
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '0 20px 18px 20px',
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6
                    }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final Closing CTA Section */}
      <section
        style={{
          padding: '60px 24px 80px 24px',
          maxWidth: 1080,
          margin: '0 auto',
          width: '100%'
        }}
      >
        <div
          style={{
            padding: '48px 36px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}
          >
            <Sparkles size={24} />
          </div>

          <h2
            style={{
              fontSize: 'clamp(24px, 4vw, 32px)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: 12
            }}
          >
            Make every workspace reservation count.
          </h2>
          <p
            style={{
              fontSize: '15.5px',
              color: 'var(--text-secondary)',
              maxWidth: 580,
              marginBottom: 28,
              lineHeight: 1.6
            }}
          >
            Bring your shared resources, bookings, and team activity into one organized workspace.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              to="/signup"
              className="landing-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '13px 28px',
                backgroundColor: 'var(--text-primary)',
                color: 'var(--text-inverse)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14.5px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>Get Started Free</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="landing-btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '13px 22px',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14.5px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>Sign In to Portal</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Rich Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-light)',
          backgroundColor: 'var(--bg-surface)',
          padding: '48px 24px 32px 24px',
          marginTop: 'auto'
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 36,
            marginBottom: 40
          }}
        >
          {/* Brand & Description */}
          <div style={{ maxWidth: 320 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--text-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14
                }}
              >
                B
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Boiler Plate SaaS
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Internal office resource and asset booking system. Built for high-velocity teams coordinating rooms, flex desks, and shared hardware.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Product
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
              <li>
                <a href="#preview" onClick={(e) => scrollToSection(e, 'preview')} style={{ color: 'inherit', textDecoration: 'none' }}>
                  Interactive Preview
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => scrollToSection(e, 'features')} style={{ color: 'inherit', textDecoration: 'none' }}>
                  Core Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} style={{ color: 'inherit', textDecoration: 'none' }}>
                  How It Works
                </a>
              </li>
              <li>
                <a href="#use-cases" onClick={(e) => scrollToSection(e, 'use-cases')} style={{ color: 'inherit', textDecoration: 'none' }}>
                  Use Cases
                </a>
              </li>
            </ul>
          </div>

          {/* Workspace & Plans */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Workspace
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
              <li>
                <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} style={{ color: 'inherit', textDecoration: 'none' }}>
                  Free Plan Limits
                </a>
              </li>
              <li>
                <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} style={{ color: 'inherit', textDecoration: 'none' }}>
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <Link to="/signup" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Owner Onboarding
                </Link>
              </li>
              <li>
                <Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Employee Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Free Tier Info */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Free Tier Included
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>• 10 Active Resources</div>
              <div>• 15 Workspace Members</div>
              <div>• 7-Day Advance Horizon</div>
              <div>• Real-time WebSocket Feed</div>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            paddingTop: 24,
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: '12.5px',
            color: 'var(--text-tertiary)'
          }}
        >
          <div>
            © 2026 Boiler Plate SaaS. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <span>Built with MERN & Socket.IO</span>
            <span>Zero-Conflict Mutex Booking</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
