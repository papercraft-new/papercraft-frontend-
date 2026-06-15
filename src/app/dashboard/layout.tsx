'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';


const NAV_ITEMS = [
  { href: '/dashboard', label: '🏠 Overview', section: 'Main' },
  { href: '/dashboard/upload', label: '📤 Upload & OCR', section: 'Main' },
 
  { href: '/dashboard/builder', label: '✏️ Paper Builder', section: 'Main' },
  { href: '/dashboard/templates', label: '🎨 Templates', section: 'Main' },
  { href: '/dashboard/papers', label: '📄 My Papers', section: 'Library' },
  
  { href: '/dashboard/ai-assistant', label: '🤖 AI Assistant', section: 'AI Tools' },
  { href: '/dashboard/billing', label: '💳 Billing', section: 'Account' },
  { href: '/dashboard/admin', label: '🛡️ Admin Dashboard', section: 'Admin', adminOnly: true },
];

const ADMIN_EMAIL = 'admin@papercraft.ai';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout, setUser } = useAuthStore();
  const token = useAuthStore(s => s.token);

  // Refresh user on every dashboard load so plan/subscription is always current
  useEffect(() => {
    if (!token) return;
    authApi.getMe().then(res => {
      if (res?.data?.data) setUser(res.data.data);
    }).catch(() => {});
  }, [token]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL && user?.role === 'ADMIN';

 const [hydrated, setHydrated] = useState(false);

useEffect(() => {
  setHydrated(true);
}, []);

useEffect(() => {
  if (!hydrated) return;
  if (!isAuthenticated) {
    router.push('/auth/login');
  }
}, [hydrated, isAuthenticated, router]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      const sidebar = document.getElementById('mobile-sidebar');
      const hamburger = document.getElementById('hamburger-btn');
      if (sidebar && !sidebar.contains(e.target as Node) &&
          hamburger && !hamburger.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen]);
if (!hydrated) return null;
  if (!isAuthenticated || !user) return null;

  const sections = ['Main', 'Library', 'AI Tools', 'Account', ...(isAdmin ? ['Admin'] : [])];

  const itemsBySection = sections.reduce((acc, section) => {
    acc[section] = NAV_ITEMS.filter(item => {
      if (item.section !== section) return false;
      if (item.adminOnly && !isAdmin) return false;
      return true;
    });
    return acc;
  }, {} as Record<string, typeof NAV_ITEMS>);

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '0 1rem', height: '56px',
        borderBottom: '1px solid hsl(217 33% 18%)', flexShrink: 0,
      }}>
        <div style={{
          width: '30px', height: '30px',
          background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
          borderRadius: '8px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '14px', flexShrink: 0,
        }}>
          📋
        </div>
        <span style={{ fontWeight: 700, fontSize: '14px', color: '#f1f5f9' }}>
          Paptrix
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {sections.map(section => {
          const items = itemsBySection[section];
          if (!items || items.length === 0) return null;
          return (
            <div key={section} style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '10px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: section === 'Admin' ? '#f87171' : '#64748b',
                padding: '0 8px', marginBottom: '4px', marginTop: '4px',
              }}>
                {section === 'Admin' ? '⚡ Admin' : section}
              </div>
              {items.map(item => {
                const isActive = pathname === item.href;
                const isAdminItem = item.adminOnly;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '7px 10px', borderRadius: '8px',
                      fontSize: '13px', fontWeight: isActive ? 600 : 500,
                      textDecoration: 'none',
                      color: isActive
                        ? (isAdminItem ? '#fca5a5' : '#60a5fa')
                        : (isAdminItem ? '#f87171' : '#94a3b8'),
                      background: isActive
                        ? (isAdminItem ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.12)')
                        : 'transparent',
                      marginBottom: '2px',
                      border: isActive
                        ? `1px solid ${isAdminItem ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}`
                        : '1px solid transparent',
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Plan / Admin badge */}
      {isAdmin ? (
        <div style={{
          margin: '0 8px 8px', padding: '8px 10px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '10px', flexShrink: 0,
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', marginBottom: '2px' }}>
            🛡️ Admin Access
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>Full platform control</div>
        </div>
      ) : (
        <div style={{
          margin: '0 8px 8px', padding: '8px 10px',
          background: 'rgba(37,99,235,0.08)',
          border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: '10px', flexShrink: 0,
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', marginBottom: '2px' }}>
            {user?.subscription?.plan?.type === 'PRO' ? '⚡ Pro Plan' :
             user?.subscription?.plan?.type === 'INSTITUTION' ? '🏢 Institution' : '🆓 Free Plan'}
          </div>
          {user?.subscription?.plan?.type === 'FREE' && (
            <Link href="/dashboard/billing" style={{ fontSize: '10px', color: '#94a3b8', textDecoration: 'none' }}>
              Upgrade → Pro
            </Link>
          )}
        </div>
      )}

      {/* User + logout */}
      <div style={{ borderTop: '1px solid hsl(217 33% 18%)', padding: '10px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: isAdmin ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700,
            color: isAdmin ? '#f87171' : '#60a5fa', flexShrink: 0,
          }}>
            {(user?.name || user?.email || '?')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isAdmin ? '🛡️ Administrator' : user?.email}
            </div>
          </div>
        </div>
        <button
          onClick={() => { logout(); router.push('/'); }}
          style={{
            width: '100%', padding: '6px',
            background: 'transparent',
            border: '1px solid hsl(217 33% 18%)',
            borderRadius: '7px', color: '#64748b',
            fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'hsl(222 47% 7%)', overflow: 'hidden' }}>

      {/* ── DESKTOP SIDEBAR (hidden on mobile) ── */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: 'hsl(222 41% 12%)',
        borderRight: '1px solid hsl(217 33% 18%)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
        className="desktop-sidebar"
      >
        <SidebarContent />
      </aside>

      {/* ── MOBILE OVERLAY ── */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 40,
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── MOBILE SIDEBAR ── */}
      <aside
        id="mobile-sidebar"
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '260px', height: '100vh',
          background: 'hsl(222 41% 12%)',
          borderRight: '1px solid hsl(217 33% 18%)',
          zIndex: 50,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        className="mobile-sidebar"
      >
        {/* Close button inside mobile sidebar */}
        <button
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'absolute', top: '14px', right: '12px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none', borderRadius: '6px',
            color: '#94a3b8', cursor: 'pointer',
            fontSize: '16px', padding: '4px 8px',
            zIndex: 1,
          }}
        >
          ✕
        </button>
        <SidebarContent />
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── MOBILE TOP BAR ── */}
        <div
          className="mobile-topbar"
          style={{
            height: '52px', flexShrink: 0,
            background: 'hsl(222 41% 12%)',
            borderBottom: '1px solid hsl(217 33% 18%)',
            display: 'flex', alignItems: 'center',
            padding: '0 12px', gap: '12px',
          }}
        >
          {/* Hamburger button */}
          <button
            id="hamburger-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              background: 'transparent',
              border: '1px solid hsl(217 33% 18%)',
              borderRadius: '8px',
              color: '#94a3b8', cursor: 'pointer',
              padding: '6px 10px', fontSize: '16px',
              display: 'flex', flexDirection: 'column',
              gap: '4px', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{ width: '18px', height: '2px', background: '#94a3b8', borderRadius: '2px', transition: 'all 0.2s', transform: mobileOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
            <div style={{ width: '18px', height: '2px', background: '#94a3b8', borderRadius: '2px', opacity: mobileOpen ? 0 : 1, transition: 'all 0.2s' }} />
            <div style={{ width: '18px', height: '2px', background: '#94a3b8', borderRadius: '2px', transition: 'all 0.2s', transform: mobileOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
          </button>

          {/* Logo text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '26px', height: '26px', background: 'linear-gradient(135deg,#2563eb,#06b6d4)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
              📋
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
              Paptrix
            </span>
          </div>

          {/* Current page name */}
          <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>
            {NAV_ITEMS.find(item => item.href === pathname)?.label || ''}
          </span>
        </div>

        {/* ── PAGE CONTENT ── */}
        <main style={{ flex: 1, overflow: 'auto', color: '#f1f5f9' }}>
          {children}
        </main>
      </div>

      {/* ── RESPONSIVE STYLES ── */}
      <style>{`
        /* Desktop: show sidebar, hide mobile topbar */
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-topbar { display: none !important; }
          .mobile-sidebar { display: none !important; }
        }

        /* Mobile: hide desktop sidebar, show mobile topbar */
        @media (max-width: 767px) {
          .desktop-sidebar { display: none !important; }
          .mobile-topbar { display: flex !important; }
          .mobile-sidebar { display: flex !important; }
        }

        /* ── OVERVIEW PAGE (dashboard/page.tsx) ── */
        @media (max-width: 767px) {
          /* Stat cards: 2 columns on mobile */
          .overview-stats {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          /* Body grid: stack vertically */
          .overview-body {
            grid-template-columns: 1fr !important;
          }
          /* Header: stack button below greeting */
          .overview-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .overview-header button {
            width: 100% !important;
            justify-content: center !important;
          }
          /* Recent papers table: hide subject & date cols, show only title + status */
          .papers-table th:nth-child(2),
          .papers-table td:nth-child(2),
          .papers-table th:nth-child(3),
          .papers-table td:nth-child(3),
          .papers-table th:nth-child(5),
          .papers-table td:nth-child(5) {
            display: none !important;
          }
        }

        /* ── BILLING PAGE ── */
        @media (max-width: 767px) {
          /* Plan cards: 1 column stack */
          .billing-plans {
            grid-template-columns: 1fr !important;
          }
          /* Current plan banner: stack content */
          .billing-banner {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .billing-banner > div:last-child {
            width: 100% !important;
          }
          .billing-banner button {
            width: 100% !important;
          }
          /* Comparison table: make scrollable */
          .billing-compare {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .billing-compare table {
            min-width: 380px !important;
          }
          /* Payment history: scrollable */
          .billing-history {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .billing-history table {
            min-width: 400px !important;
          }
        }

        /* ── SECTION & QUESTION EDITOR (builder edit step) ── */
        @media (max-width: 767px) {
          .sec-title-row { flex: 1 1 100% !important; }
          .sec-actions-row { width: 100% !important; justify-content: flex-end !important; }
          .q-meta-row { gap: 8px !important; }
          .q-meta-row select { font-size: 11px !important; }
        }

        /* ── BUILDER PAGE ── */
        @media (max-width: 767px) {
          /* Top bar: compress */
          .builder-topbar {
            padding: 0 8px !important;
            gap: 6px !important;
          }
          .builder-topbar input {
            width: 110px !important;
            font-size: 12px !important;
          }
          /* Step bar: smaller text */
          .builder-stepbar {
            font-size: 10px !important;
          }
          /* Action buttons row: wrap */
          .builder-actions {
            flex-wrap: wrap !important;
            gap: 4px !important;
          }
          .builder-actions button {
            font-size: 11px !important;
            padding: 5px 8px !important;
          }
          /* Export buttons: stack on mobile */
          .builder-export-row {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .builder-export-row button {
            width: 100% !important;
            justify-content: center !important;
          }
          /* Question cards: full width */
          .question-card {
            padding: 10px !important;
          }
          /* MCQ option grid: 2 col on mobile */
          .mcq-grid-mobile {
            grid-template-columns: 1fr 1fr !important;
          }
          /* Section editor header: wrap */
          .section-header-row {
            flex-wrap: wrap !important;
            gap: 6px !important;
          }
          /* Marks/type row in question: stack */
          .question-meta-row {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .question-meta-row > * {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}