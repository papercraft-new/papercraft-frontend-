'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePaperStore } from '@/store/paperStore';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────
// TEMPLATE DATA
// ─────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'tpl_school',                        // matches backend TEMPLATE_CONFIGS key
    name: 'Basic',
    description: 'Classic double-border layout for CBSE, ICSE and state board schools',
    icon: '🏫',
    badge: 'Most Popular',
    badgeColor: '#10b981',
    plans: ['FREE', 'PRO', 'INSTITUTION'],
    preview: {
      borderStyle: '3px double #1a2e5a',
      headerColor: '#1a2e5a',
      accentColor: '#1a2e5a',
      bgColor: '#f0f4ff',
      font: 'Times New Roman',
    },
    features: [
      'Double page border',
      'Bold institution name',
      'Two column meta info',
      'Shaded section headers',
      'Signature block',
      'Answer lines',
    ],
    usedBy: 'CBSE · ICSE · State Boards',
    mcqLayout: '2x2 grid',
  },
  {
    id: 'tpl_classic',                       // matches backend TEMPLATE_CONFIGS key
    name: 'Classic',
    description: 'Clean layout with minimal top details — name, class, date and marks. MCQ options in a single row.',
    icon: '📄',
    badge: 'Clean',
    badgeColor: '#6366f1',
    plans: ['FREE', 'PRO', 'INSTITUTION'],
    preview: {
      borderStyle: 'none',
      headerColor: '#111827',
      accentColor: '#374151',
      bgColor: '#f9fafb',
      font: 'Times New Roman',
    },
    features: [
      'Minimal top header',
      'Name · Class · Date · Marks',
      'No extra institution details',
      'MCQ: all 4 options in one line',
      'Clean readable layout',
      'All question types',
    ],
    usedBy: 'Quick Tests · Class Tests · Assignments',
    mcqLayout: 'all 4 in one line',
  },
];

// ─────────────────────────────────────────
// TEMPLATE PREVIEW CARD
// ─────────────────────────────────────────

function TemplatePreview({ template }: { template: typeof TEMPLATES[0] }) {
  const p = template.preview;
  const isClassic = template.id === 'classic';
  return (
    <div style={{
      width: '100%',
      height: '160px',
      background: '#ffffff',
      borderRadius: '8px',
      padding: '10px',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: p.font,
      boxSizing: 'border-box',
    }}>
      <div style={{
        border: p.borderStyle,
        height: '100%',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        boxSizing: 'border-box',
      }}>
        {isClassic ? (
          /* Classic: only name, class, date, marks in one compact row */
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', fontSize: '5px', color: '#444', borderBottom: '1px solid #ccc', paddingBottom: '3px', marginBottom: '2px' }}>
            <span><strong>Name:</strong> ___________</span>
            <span><strong>Class:</strong> X</span>
            <span><strong>Date:</strong> 01 Jan 2026</span>
            <span><strong>Marks:</strong> 30</span>
          </div>
        ) : (
          <>
            {/* Default: full institution header */}
            <div style={{
              textAlign: 'center',
              fontSize: '7px',
              fontWeight: 800,
              color: p.headerColor,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: `1px solid ${p.accentColor}`,
              paddingBottom: '3px',
              marginBottom: '2px',
            }}>
              INSTITUTION NAME
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '5px', color: '#444' }}>
              <span>Subject: Mathematics</span>
              <span>Date: 01 Jan 2026</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '5px', color: '#444' }}>
              <span>Class: X</span>
              <span>Duration: 3 Hours</span>
            </div>
          </>
        )}

        {/* Title */}
        <div style={{
          textAlign: 'center',
          fontSize: '6px',
          fontWeight: 700,
          color: p.headerColor,
          textTransform: 'uppercase',
          borderTop: `1px solid ${p.accentColor}`,
          borderBottom: `1px solid ${p.accentColor}`,
          padding: '2px 0',
          margin: '2px 0',
        }}>
          QUESTION PAPER
        </div>

        {/* Section header */}
        <div style={{
          background: p.bgColor,
          textAlign: 'center',
          fontSize: '5.5px',
          fontWeight: 700,
          color: p.accentColor,
          padding: '2px',
          border: `1px solid ${p.accentColor}`,
        }}>
          SECTION A — MCQ (1 Mark Each)
        </div>

        {/* Sample question */}
        <div style={{ display: 'flex', gap: '3px', fontSize: '5px', color: '#333' }}>
          <span style={{ fontWeight: 700, flexShrink: 0 }}>1.</span>
          <span style={{ flex: 1 }}>Sample question text for preview purposes</span>
          <span style={{ color: p.accentColor, fontWeight: 700, flexShrink: 0 }}>[1]</span>
        </div>

        {/* MCQ options */}
        {isClassic ? (
          /* Classic: all 4 in one line */
          <div style={{ display: 'flex', gap: '6px', marginLeft: '8px', fontSize: '4.5px', color: '#555' }}>
            {['a', 'b', 'c', 'd'].map(opt => (
              <span key={opt}><strong>({opt})</strong> Opt {opt.toUpperCase()}</span>
            ))}
          </div>
        ) : (
          /* Default: 2x2 grid */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', marginLeft: '8px' }}>
            {['a', 'b', 'c', 'd'].map(opt => (
              <span key={opt} style={{ fontSize: '4.5px', color: '#555' }}>
                <strong>({opt})</strong> Option {opt.toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────

export default function TemplatesPage() {
  const router = useRouter();
  const { templateId, setTemplateId, sections } = usePaperStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const handleSelect = (template: typeof TEMPLATES[0]) => {
    setTemplateId(template.id);
    toast.success(`✅ ${template.name} template selected!`);
  };

  const handleUseNow = (template: typeof TEMPLATES[0]) => {
    setTemplateId(template.id);
    if (sections.length > 0) {
      router.push('/dashboard/builder');
    } else {
      router.push('/dashboard/upload');
    }
    toast.success(`${template.name} selected! Start building your paper.`);
  };

  // Fallback: if stored templateId doesn't match any template, default to 'school'
  const selectedTemplate =
    TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>
          🎨 Templates
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          Choose a template for your question paper. The template controls the layout and styling of your exported PDF and DOCX.
        </p>
      </div>

      {/* CURRENT TEMPLATE BANNER */}
      <div style={{
        background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '1.5rem' }}>{selectedTemplate.icon}</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa' }}>
            Currently Selected: {selectedTemplate.name}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {selectedTemplate.description}
          </div>
        </div>
        <button
          onClick={() => router.push(sections.length > 0 ? '/dashboard/builder' : '/dashboard/upload')}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            background: 'linear-gradient(135deg,#2563eb,#06b6d4)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Use This Template →
        </button>
      </div>

      {/* TEMPLATE GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: '1.25rem',
      }}>
        {TEMPLATES.map(template => {
          const isSelected = templateId === template.id || selectedTemplate.id === template.id;
          const isHovered = hoveredId === template.id;

          return (
            <div
              key={template.id}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                background: isSelected ? 'rgba(59,130,246,0.08)' : 'hsl(222 41% 12%)',
                border: `2px solid ${isSelected ? '#3b82f6' : isHovered ? 'hsl(217 33% 28%)' : 'hsl(217 33% 18%)'}`,
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#3b82f6',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  zIndex: 2,
                }}>
                  ✓ Selected
                </div>
              )}

              {/* Preview */}
              <div style={{
                padding: '12px',
                background: 'hsl(222 47% 7%)',
                cursor: 'pointer',
              }}
                onClick={() => setPreviewId(previewId === template.id ? null : template.id)}
              >
                <TemplatePreview template={template} />
                <div style={{
                  textAlign: 'center',
                  marginTop: '6px',
                  fontSize: '11px',
                  color: '#64748b',
                }}>
                  {previewId === template.id ? '▲ Hide preview' : '▼ Click to expand preview'}
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: '14px' }}>

                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{template.icon}</span>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>
                      {template.name}
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: '10px',
                      background: `${template.badgeColor}20`,
                      color: template.badgeColor,
                    }}>
                      {template.badge}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', lineHeight: '1.5' }}>
                  {template.description}
                </p>

                {/* MCQ layout note */}
                <div style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  background: 'hsl(222 47% 7%)',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  marginBottom: '10px',
                }}>
                  📋 MCQ layout: {template.mcqLayout}
                </div>

                {/* Features */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '4px',
                  marginBottom: '14px',
                }}>
                  {template.features.map(feature => (
                    <div
                      key={feature}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '11px',
                        color: '#94a3b8',
                      }}
                    >
                      <span style={{ color: '#10b981', fontSize: '10px', flexShrink: 0 }}>✓</span>
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleSelect(template)}
                    style={{
                      flex: 1,
                      padding: '9px',
                      background: isSelected ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.15)',
                      border: `1px solid ${isSelected ? '#3b82f6' : 'transparent'}`,
                      borderRadius: '8px',
                      color: '#60a5fa',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isSelected ? '✓ Selected' : 'Select'}
                  </button>

                  <button
                    onClick={() => handleUseNow(template)}
                    style={{
                      flex: 1,
                      padding: '9px',
                      background: 'linear-gradient(135deg,#2563eb,#06b6d4)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    Use Now →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM NOTE */}
      <div style={{
        marginTop: '2rem',
        padding: '16px',
        background: 'hsl(222 41% 12%)',
        border: '1px solid hsl(217 33% 18%)',
        borderRadius: '12px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '1.2rem' }}>💡</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', marginBottom: '4px' }}>
            How templates work
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
            Templates only affect the <strong style={{ color: '#94a3b8' }}>visual styling</strong> of your exported PDF and DOCX.
            Your questions, marks, and exam details remain the same regardless of which template you choose.
            You can change the template anytime before exporting.
          </div>
        </div>
      </div>

    </div>
  );
}