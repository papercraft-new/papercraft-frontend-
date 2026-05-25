'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

// All nav items — admin ones filtered by role
const NAV_ITEMS = [
  // Main
  { href: '/dashboard', label: '🏠 Overview', section: 'Main' },
  { href: '/dashboard/upload', label: '📤 Upload & OCR', section: 'Main' },

  { href: '/dashboard/builder', label: '✏️ Paper Builder', section: 'Main' },
  { href: '/dashboard/templates', label: '🎨 Templates', section: 'Main' },

  // Library
  { href: '/dashboard/papers', label: '📄 My Papers', section: 'Library' },
  

  // AI
  { href: '/dashboard/ai-assistant', label: '🤖 AI Assistant', section: 'AI Tools' },

  // Account
  { href: '/dashboard/billing', label: '💳 Billing', section: 'Account' },

  // Admin only
  { href: '/dashboard/admin', label: '🛡️ Admin Dashboard', section: 'Admin', adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) return null;

  // Group nav items by section
  const sections = ['Main', 'Library', 'AI Tools', 'Account', ...(isAdmin ? ['Admin'] : [])];

  const itemsBySection = sections.reduce((acc, section) => {
    acc[section] = NAV_ITEMS.filter(item => {
      if (item.section !== section) return false;
      if (item.adminOnly && !isAdmin) return false;
      return true;
    });
    return acc;
  }, {} as Record<string, typeof NAV_ITEMS>);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'hsl(222 47% 7%)', overflow: 'hidden' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        background: 'hsl(222 41% 12%)',
        borderRight: '1px solid hsl(217 33% 18%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 1rem',
          height: '56px',
          borderBottom: '1px solid hsl(217 33% 18%)',
          flexShrink: 0,
        }}>
          <div style={{
            width: '30px',
            height: '30px',
            background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            flexShrink: 0,
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
                {/* Section label */}
                <div style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: section === 'Admin' ? '#f87171' : '#64748b',
                  padding: '0 8px',
                  marginBottom: '4px',
                  marginTop: '4px',
                }}>
                  {section === 'Admin' ? '⚡ ' + section : section}
                </div>

                {/* Items */}
                {items.map(item => {
                  const isActive = pathname === item.href;
                  const isAdminItem = item.adminOnly;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 500,
                        textDecoration: 'none',
                        color: isActive
                          ? (isAdminItem ? '#fca5a5' : '#60a5fa')
                          : (isAdminItem ? '#f87171' : '#94a3b8'),
                        background: isActive
                          ? (isAdminItem ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.12)')
                          : 'transparent',
                        marginBottom: '2px',
                        transition: 'all 0.15s',
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

        {/* Admin badge */}
        {isAdmin && (
          <div style={{
            margin: '0 8px 8px',
            padding: '8px 10px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', marginBottom: '2px' }}>
              🛡️ Admin Access
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              Full platform control
            </div>
          </div>
        )}

        {/* Plan badge */}
        {!isAdmin && (
          <div style={{
            margin: '0 8px 8px',
            padding: '8px 10px',
            background: 'rgba(37,99,235,0.08)',
            border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: '10px',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', marginBottom: '2px' }}>
              {user?.subscription?.plan?.type === 'PRO' ? '⚡ Pro Plan' :
               user?.subscription?.plan?.type === 'INSTITUTION' ? '🏢 Institution' :
               '🆓 Free Plan'}
            </div>
            {user?.subscription?.plan?.type === 'FREE' && (
              <Link href="/dashboard/billing" style={{ fontSize: '10px', color: '#94a3b8', textDecoration: 'none' }}>
                Upgrade → Pro
              </Link>
            )}
          </div>
        )}

        {/* User info + logout */}
        <div style={{
          borderTop: '1px solid hsl(217 33% 18%)',
          padding: '10px 8px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: isAdmin ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: isAdmin ? '#f87171' : '#60a5fa',
              flexShrink: 0,
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
              width: '100%',
              padding: '6px',
              background: 'transparent',
              border: '1px solid hsl(217 33% 18%)',
              borderRadius: '7px',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, overflow: 'auto', color: '#f1f5f9' }}>
        {children}
      </main>
    </div>
  );
}