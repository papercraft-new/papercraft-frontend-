'use client';

import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { usePaperStore } from '@/store/paperStore';
import type { Question, QuestionImage } from '@/store/paperStore';
import { imagesApi } from '@/lib/api';
import { prepareImageForUpload } from '@/lib/imageUpload';
import { IMAGE_LIMITS, countPaperImages } from '@/lib/paperRenderer';
import type { MCQOption } from '@/lib/paperRenderer';
import { ImageCropModal } from '@/components/builder/ImageCropModal';
import type { CroppedPicture } from '@/lib/cropImage';

// "question" or the label of an option ("a", "b", ...)
type Target = string;

type ImageSize = NonNullable<QuestionImage['size']>;

const border = '1px solid hsl(217 33% 18%)';

const QUESTION_SIZES: Array<{ key: ImageSize; label: string }> = [
  { key: 'small', label: 'S' },
  { key: 'medium', label: 'M' },
  { key: 'large', label: 'L' },
  { key: 'full', label: 'Full' },
];
const OPTION_SIZES = QUESTION_SIZES.slice(0, 3); // an option box is narrow: S / M / L

const smallBtn = (active: boolean): React.CSSProperties => ({
  minWidth: '34px', height: '32px', padding: '0 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
  borderRadius: '5px', border: active ? '1px solid #3b82f6' : border,
  background: active ? 'rgba(59,130,246,0.2)' : 'hsl(222 47% 7%)', color: active ? '#93c5fd' : '#94a3b8',
});

function Tile({ image, caption, sizes, onSize, onRemove }: {
  image: QuestionImage; caption?: string;
  sizes: Array<{ key: ImageSize; label: string }>;
  onSize: (s: ImageSize) => void; onRemove: () => void;
}) {
  return (
    <div style={{ width: '112px', border, borderRadius: '8px', background: 'hsl(222 47% 7%)', padding: '6px' }}>
      <div style={{ position: 'relative', height: '76px', background: '#fff', borderRadius: '5px', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt={image.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        <button
          type="button" aria-label="Remove image" onClick={onRemove}
          style={{
            position: 'absolute', top: '2px', right: '2px', width: '32px', height: '32px', borderRadius: '50%',
            border: 'none', background: 'rgba(15,23,42,0.85)', color: '#f87171', cursor: 'pointer', fontSize: '14px', lineHeight: '32px', padding: 0,
          }}
        >✕</button>
      </div>
      {caption && <div style={{ fontSize: '10px', color: '#64748b', margin: '4px 0 0', fontFamily: 'monospace' }}>{caption}</div>}
      <div style={{ display: 'flex', gap: '3px', marginTop: '5px', flexWrap: 'wrap' }}>
        {sizes.map(s => (
          <button key={s.key} type="button" aria-label={`Size ${s.key}`} onClick={() => onSize(s.key)} style={smallBtn((image.size || 'medium') === s.key)}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const busyTile = (label: string) => (
  <div style={{ width: '112px', height: '106px', border: '1px dashed #3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#93c5fd', textAlign: 'center', padding: '4px' }}>
    Uploading {label}…
  </div>
);

function latestQuestion(id: string): Question | undefined {
  for (const s of usePaperStore.getState().sections) {
    const q = s.questions.find(x => x.id === id);
    if (q) return q;
  }
  return undefined;
}

function errorMessage(err: unknown): string {
  const e = err as { response?: { data?: { error?: string } }; message?: string };
  return e?.response?.data?.error || e?.message || 'Image upload failed. Please try again.';
}

interface Props {
  question: Question;
  /** The options shown in the editor (placeholders included), so an option image can be attached. */
  options: MCQOption[];
  onUpdate: (u: Partial<Question>) => void;
}

export function ImageAttachments({ question, options, onUpdate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<Target>('question');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [target, setTarget] = useState<Target>('question');
  const [cropOpen, setCropOpen] = useState(false);
  const [busy, setBusy] = useState<Target | null>(null);

  const sections = usePaperStore(s => s.sections);
  const paperCount = countPaperImages(sections);

  const isMcq = question.type === 'MCQ';
  const images = question.images ?? [];
  const optionImages = isMcq ? options.filter(o => o.image) : [];
  const hasAny = images.length > 0 || optionImages.length > 0;
  const showPanel = hasAny || chooserOpen;

  const addsAnImage = (target: Target) =>
    target === 'question' || !options.find(o => o.label === target)?.image;

  // false (with a message) when the question or the paper already has as many pictures as allowed
  const withinLimits = (forTarget: Target) => {
    if (addsAnImage(forTarget)) {
      if (forTarget === 'question' && images.length >= IMAGE_LIMITS.perQuestion) {
        toast.error(`A question can have at most ${IMAGE_LIMITS.perQuestion} images.`);
        return false;
      }
      if (paperCount >= IMAGE_LIMITS.perPaper) {
        toast.error(`A paper can have at most ${IMAGE_LIMITS.perPaper} images.`);
        return false;
      }
    }
    return true;
  };

  const pick = (forTarget: Target) => {
    if (busy || !withinLimits(forTarget)) return;
    targetRef.current = forTarget;
    inputRef.current?.click(); // must run inside the tap/click so the phone allows the picker
  };

  const startCrop = (forTarget: Target) => {
    if (busy || !withinLimits(forTarget)) return;
    targetRef.current = forTarget;
    setCropOpen(true);
  };

  // Upload one picture and attach it to the question or to an option
  const uploadAndAttach = async (forTarget: Target, blob: Blob, filename: string, size?: ImageSize) => {
    setBusy(forTarget);
    try {
      const res = await imagesApi.upload(blob, filename);
      const uploaded = res.data?.image as QuestionImage | undefined;
      if (!uploaded?.url) throw new Error('Image upload failed. Please try again.');
      // An option box is narrow, so "full" becomes "large" there
      const img: QuestionImage = size ? { ...uploaded, size: forTarget !== 'question' && size === 'full' ? 'large' : size } : uploaded;

      // Read the question again now: it may have been edited while the upload was running
      const latest = latestQuestion(question.id) ?? question;
      if (forTarget === 'question') {
        onUpdate({ images: [...(latest.images ?? []), img] });
      } else {
        const base: MCQOption[] = latest.options && latest.options.length > 0 ? latest.options.slice(0, 4) as MCQOption[] : options;
        onUpdate({ options: base.map(o => (o.label === forTarget ? { ...o, image: img } : o)) });
      }
      if (!isMcq) setChooserOpen(false); // an MCQ keeps the chooser open: there may be more options to fill
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be picked again
    if (!file) return;
    const forTarget = targetRef.current;
    setBusy(forTarget); // show "Uploading…" while the picture is being prepared too
    try {
      const prepared = await prepareImageForUpload(file);
      await uploadAndAttach(forTarget, prepared.blob, prepared.filename);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(null);
    }
  };

  const onCropped = (picture: CroppedPicture) => {
    setCropOpen(false);
    void uploadAndAttach(targetRef.current, picture.blob, picture.filename, picture.size);
  };

  const setQuestionImage = (id: string, patch: Partial<QuestionImage> | null) => {
    onUpdate({
      images: patch === null
        ? images.filter(i => i.id !== id)
        : images.map(i => (i.id === id ? { ...i, ...patch } : i)),
    });
  };

  const setOptionImage = (label: string, patch: Partial<QuestionImage> | null) => {
    onUpdate({
      options: options.map(o => {
        if (o.label !== label) return o;
        if (patch === null) {
          const { image: _removed, ...rest } = o;
          return rest;
        }
        return o.image ? { ...o, image: { ...o.image, ...patch } } : o;
      }),
    });
  };

  return (
    <div style={{ marginTop: '6px' }}>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg" onChange={onFile} style={{ display: 'none' }} />

      <button
        type="button"
        onClick={() => setChooserOpen(v => !v)}
        disabled={busy !== null}
        style={{
          fontSize: '11px', fontWeight: 600, color: '#60a5fa', background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.25)', borderRadius: '6px', padding: '5px 10px',
          cursor: busy ? 'default' : 'pointer', minHeight: '36px',
        }}
      >
        + Image
      </button>

      {cropOpen && <ImageCropModal onClose={() => setCropOpen(false)} onCropped={onCropped} />}

      {showPanel && (
        <div style={{ marginTop: '8px' }}>
          {/* what to add, and where it goes */}
          {chooserOpen && (
            <div style={{ marginBottom: '8px' }}>
              {isMcq && (
                <>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Add a picture to
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    <button type="button" aria-pressed={target === 'question'} onClick={() => setTarget('question')} style={{ ...smallBtn(target === 'question'), height: '38px', padding: '0 14px' }}>
                      Question
                    </button>
                    {options.map(o => (
                      <button key={o.label} type="button" aria-pressed={target === o.label} onClick={() => setTarget(o.label)} style={{ ...smallBtn(target === o.label), height: '38px', padding: '0 14px', fontFamily: 'monospace' }}>
                        ({o.label}){o.image ? ' ✓' : ''}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button type="button" disabled={busy !== null} onClick={() => startCrop(isMcq ? target : 'question')}
                  style={{ ...smallBtn(false), height: '40px', padding: '0 14px', color: '#bfdbfe', borderColor: 'rgba(59,130,246,0.5)' }}>
                  ✂ Crop from page
                </button>
                <button type="button" disabled={busy !== null} onClick={() => pick(isMcq ? target : 'question')}
                  style={{ ...smallBtn(false), height: '40px', padding: '0 14px' }}>
                  ↑ Upload picture
                </button>
              </div>
            </div>
          )}

          {(images.length > 0 || busy === 'question') && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '5px' }}>
                Question images · {images.length} of {IMAGE_LIMITS.perQuestion}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {images.map(img => (
                  <Tile key={img.id} image={img} sizes={QUESTION_SIZES}
                    onSize={s => setQuestionImage(img.id, { size: s })} onRemove={() => setQuestionImage(img.id, null)} />
                ))}
                {busy === 'question' && busyTile('')}
                {busy === null && images.length > 0 && images.length < IMAGE_LIMITS.perQuestion && (
                  <button type="button" aria-label="Add another question image" onClick={() => { setTarget('question'); setChooserOpen(true); }}
                    style={{ width: '112px', height: '106px', border: '1px dashed hsl(217 33% 28%)', borderRadius: '8px', background: 'transparent', color: '#60a5fa', fontSize: '22px', cursor: 'pointer' }}>
                    +
                  </button>
                )}
              </div>
            </div>
          )}

          {isMcq && (optionImages.length > 0 || (busy !== null && busy !== 'question')) && (
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '5px' }}>Option images</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {options.map(o =>
                  busy === o.label ? (
                    <React.Fragment key={o.label}>{busyTile(`(${o.label})`)}</React.Fragment>
                  ) : o.image ? (
                    <Tile key={o.label} image={o.image} caption={`(${o.label})`} sizes={OPTION_SIZES}
                      onSize={s => setOptionImage(o.label, { size: s })} onRemove={() => setOptionImage(o.label, null)} />
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}