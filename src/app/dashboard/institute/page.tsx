'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { imagesApi, instituteApi } from '@/lib/api';

type Institute = { id: string; name: string; address: string | null; affiliation: string | null; logoUrl: string | null };

const panel: React.CSSProperties = {
  background: 'hsl(222 41% 12%)',
  border: '1px solid hsl(217 33% 18%)',
  borderRadius: 14,
  padding: '1.25rem',
};
const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 };
const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 44,
  padding: '10px 12px',
  borderRadius: 10,
  background: 'hsl(222 47% 8%)',
  border: '1px solid hsl(217 33% 18%)',
  color: '#f1f5f9',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
};

export default function InstitutePage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exists, setExists] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    instituteApi
      .get()
      .then(res => {
        const d = res.data?.data;
        const i: Institute | null = d?.institution || null;
        setCanEdit(d?.canEdit !== false);
        if (i) {
          setExists(true);
          setName(i.name || '');
          setAddress(i.address || '');
          setAffiliation(i.affiliation || '');
          setLogoUrl(i.logoUrl || '');
        }
      })
      .catch(() => toast.error('Could not load your institute profile.'))
      .finally(() => setLoading(false));
  }, []);

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) return toast.error('Please choose a PNG or JPG logo.');
    if (file.size > 2 * 1024 * 1024) return toast.error('The logo must be under 2 MB.');
    setUploading(true);
    try {
      const res = await imagesApi.upload(file, file.name);
      const url = res.data?.image?.url;
      if (!url) throw new Error('no url');
      setLogoUrl(url);
      toast.success('Logo uploaded. Press Save to keep it.');
    } catch {
      toast.error('Could not upload the logo. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    if (name.trim().length < 2) return toast.error('Please enter the institute name.');
    setSaving(true);
    try {
      await instituteApi.save({ name: name.trim(), address: address.trim(), affiliation: affiliation.trim(), logoUrl });
      setExists(true);
      qc.invalidateQueries({ queryKey: ['institute'] });
      toast.success('Institute profile saved.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: '#64748b', padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <style>{`.inst-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:16px}@media (max-width:820px){.inst-grid{grid-template-columns:1fr}}`}</style>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>🏫 Institute Profile</h1>
      <p style={{ color: '#94a3b8', fontSize: 14, margin: '6px 0 20px' }}>
        Set this once. Your institute name and address appear at the top of your papers, and the logo appears on the Professional template. The exam-details form keeps these locked so every paper looks the same.
      </p>

      {!canEdit && (
        <div style={{ ...panel, color: '#fbbf24', fontSize: 13, marginBottom: 16 }}>
          Only the institute owner can change these details.
        </div>
      )}

      <div className="inst-grid">
        <div style={panel}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={label}>Institute name *</label>
              <input style={input} value={name} onChange={e => setName(e.target.value)} disabled={!canEdit} placeholder="e.g. Delhi Public School, Hyderabad" maxLength={120} />
            </div>
            <div>
              <label style={label}>Address (optional)</label>
              <input style={input} value={address} onChange={e => setAddress(e.target.value)} disabled={!canEdit} placeholder="Street, city, PIN" maxLength={300} />
            </div>
            <div>
              <label style={label}>Board / affiliation (optional)</label>
              <input style={input} value={affiliation} onChange={e => setAffiliation(e.target.value)} disabled={!canEdit} placeholder="e.g. CBSE, State Board" maxLength={80} />
            </div>
            <div>
              <label style={label}>Logo (PNG or JPG, under 2 MB)</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={e => pickLogo(e.target.files?.[0])} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={!canEdit || uploading}
                  style={{ minHeight: 44, padding: '0 16px', borderRadius: 10, border: '1px solid hsl(217 33% 25%)', background: 'hsl(222 30% 16%)', color: '#e2e8f0', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                >
                  {uploading ? 'Uploading...' : logoUrl ? 'Change logo' : '📤 Upload logo'}
                </button>
                {logoUrl && canEdit && (
                  <button type="button" onClick={() => setLogoUrl('')} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={!canEdit || saving || uploading}
              style={{
                minHeight: 46, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 800, color: '#fff', cursor: 'pointer',
                background: 'linear-gradient(135deg, #2563eb, #06b6d4)', opacity: !canEdit || saving || uploading ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : exists ? 'Save changes' : 'Save institute profile'}
            </button>
          </div>
        </div>

        <div style={panel}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>How it looks on the Professional template</div>
          <div style={{ background: '#fff', color: '#111', borderRadius: 8, padding: '16px 14px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
              <div style={{ width: 80, minHeight: 80, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" style={{ maxWidth: 80, maxHeight: 80, objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid #1F2937', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#aaa' }}>LOGO</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, border: '2px solid #1F2937', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ background: '#1F2937', color: '#fff', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, padding: '7px 10px', wordBreak: 'break-word' }}>
                  {name.trim() || 'Your Institute Name'}
                </div>
                {address.trim() && <div style={{ fontSize: 10.5, color: '#333', padding: '4px 10px' }}>📍 {address}</div>}
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#666', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4, padding: '6px 10px', marginTop: 10 }}>
              Subject · Class · Date · Duration · Marks
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 12 }}>
            The logo is shown on the Professional template (PDF and Word). The board line is saved with your profile and not printed on papers yet.
          </p>
        </div>
      </div>
    </div>
  );
}