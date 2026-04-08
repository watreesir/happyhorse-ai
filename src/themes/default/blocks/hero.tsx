'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab =
  | 'text-to-video'
  | 'image-to-video'
  | 'reference-to-video'
  | 'video-edit';
type I2VMode = 'first-frame' | 'first-last-frame' | 'video-continuation';
type Resolution = '720p' | '1080p';
type Ratio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
type AudioSetting = 'auto' | 'origin';

interface HeroTab {
  key: string;
  label: string;
  placeholder?: string;
}

// ─── Fallback data ─────────────────────────────────────────────────────────────

const DEFAULT_TABS: HeroTab[] = [
  {
    key: 'text-to-video',
    label: 'Text to Video',
    placeholder: 'Describe the video you want to generate...',
  },
  {
    key: 'image-to-video',
    label: 'Image to Video',
    placeholder: 'Describe how the image should animate...',
  },
  {
    key: 'reference-to-video',
    label: 'Reference to Video',
    placeholder: 'Describe the video style and content...',
  },
  {
    key: 'video-edit',
    label: 'Video Edit',
    placeholder: 'Describe the edits you want to make...',
  },
];

const I2V_MODES: { key: I2VMode; label: string }[] = [
  { key: 'first-frame', label: 'First Frame' },
  { key: 'first-last-frame', label: 'First + Last Frame' },
  { key: 'video-continuation', label: 'Video Continuation' },
];

const RATIOS: { key: Ratio; label: string; icon: string }[] = [
  { key: '16:9', label: '16:9', icon: '▬' },
  { key: '9:16', label: '9:16', icon: '▮' },
  { key: '4:3', label: '4:3', icon: '▭' },
  { key: '3:4', label: '3:4', icon: '▯' },
  { key: '1:1', label: '1:1', icon: '■' },
];

// ─── UploadZone ────────────────────────────────────────────────────────────────

function UploadZone({
  label,
  optional = false,
  hasFile = false,
  onClear,
  className,
}: {
  label: string;
  optional?: boolean;
  hasFile?: boolean;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[60px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-3 transition-all duration-200',
        hasFile
          ? 'border-primary/35 bg-primary/10'
          : 'border-foreground/12 bg-background/45 hover:border-primary/35 hover:bg-primary/6 dark:hover:border-primary/45 dark:border-white/15 dark:bg-white/[0.03] dark:hover:bg-white/5',
        className
      )}
    >
      {hasFile ? (
        <div className="flex items-center gap-2">
          <span className="text-primary text-xs font-medium">✓ {label}</span>
          {onClear && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-foreground/38 hover:text-foreground/72 dark:text-white/40 dark:hover:text-white/80"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className="text-foreground/28 text-lg leading-none dark:text-white/20">
            +
          </span>
          <p className="text-foreground/52 text-center text-xs dark:text-white/40">
            {label}
            {optional && (
              <span className="text-foreground/34 ml-1 dark:text-white/25">
                (optional)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Settings Panel ────────────────────────────────────────────────────────────

function SettingsPanel({
  tab,
  duration,
  setDuration,
  resolution,
  setResolution,
  ratio,
  setRatio,
  audioSetting,
  setAudioSetting,
}: {
  tab: MainTab;
  duration: number;
  setDuration: (v: number) => void;
  resolution: Resolution;
  setResolution: (v: Resolution) => void;
  ratio: Ratio;
  setRatio: (v: Ratio) => void;
  audioSetting: AudioSetting;
  setAudioSetting: (v: AudioSetting) => void;
}) {
  const maxDuration =
    tab === 'reference-to-video' || tab === 'video-edit' ? 10 : 15;
  const showRatio = tab !== 'image-to-video';
  const showAudio = tab === 'video-edit';

  const durationOptions =
    tab === 'video-edit'
      ? [
          { label: 'Full', value: 0 },
          { label: '5s', value: 5 },
          { label: '10s', value: 10 },
        ]
      : [2, 5, 8, 10, 15]
          .filter((d) => d <= maxDuration)
          .map((d) => ({ label: `${d}s`, value: d }));

  const chipBase =
    'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer';
  const chipActive = 'bg-primary text-primary-foreground font-semibold';
  const chipInactive =
    'bg-foreground/[0.06] text-foreground/68 hover:bg-foreground/[0.09] hover:text-foreground dark:bg-white/8 dark:text-white/55 dark:hover:bg-white/15 dark:hover:text-white/90';

  return (
    <div className="border-foreground/10 bg-background/96 text-foreground ring-foreground/6 absolute right-0 bottom-full left-0 z-30 mb-2 overflow-hidden rounded-2xl border shadow-[0_20px_56px_rgba(15,23,42,0.14)] ring-1 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/92 dark:text-white dark:shadow-2xl dark:ring-white/8">
      <div className="space-y-4 p-4">
        {/* Video Length */}
        <div>
          <p className="text-foreground/45 mb-2 text-[10px] font-semibold tracking-widest uppercase dark:text-white/35">
            Video Length
          </p>
          <div className="flex flex-wrap gap-1.5">
            {durationOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDuration(opt.value)}
                className={cn(
                  chipBase,
                  duration === opt.value ? chipActive : chipInactive
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution */}
        <div>
          <p className="text-foreground/45 mb-2 text-[10px] font-semibold tracking-widest uppercase dark:text-white/35">
            Resolution
          </p>
          <div className="flex gap-1.5">
            {(['720p', '1080p'] as Resolution[]).map((r) => (
              <button
                key={r}
                onClick={() => setResolution(r)}
                className={cn(
                  chipBase,
                  resolution === r ? chipActive : chipInactive
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio */}
        {showRatio && (
          <div>
            <p className="text-foreground/45 mb-2 text-[10px] font-semibold tracking-widest uppercase dark:text-white/35">
              Aspect Ratio
            </p>
            <div className="flex flex-wrap gap-1.5">
              {RATIOS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRatio(r.key)}
                  className={cn(
                    chipBase,
                    'flex flex-col items-center gap-0.5',
                    ratio === r.key ? chipActive : chipInactive
                  )}
                >
                  <span className="text-sm leading-none">{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Audio — Video Edit only */}
        {showAudio && (
          <div>
            <p className="text-foreground/45 mb-2 text-[10px] font-semibold tracking-widest uppercase dark:text-white/35">
              Audio
            </p>
            <div className="flex gap-1.5">
              {(
                [
                  ['auto', 'AI Audio'],
                  ['origin', 'Keep Original'],
                ] as [AudioSetting, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setAudioSetting(val)}
                  className={cn(
                    chipBase,
                    audioSetting === val ? chipActive : chipInactive
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Param Chip ────────────────────────────────────────────────────────────────

function ParamChip({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-foreground/[0.06] text-foreground/72 hover:bg-foreground/[0.09] hover:text-foreground flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 dark:bg-white/8 dark:text-white/55 dark:hover:bg-white/14 dark:hover:text-white/85"
    >
      {children}
    </button>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

export function Hero({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const tabs: HeroTab[] = (section as any).tabs || DEFAULT_TABS;
  const generateLabel: string = (section as any).generate_button || 'Generate';
  const badgeText = ((section as any).badge_text ?? 'Happy Horse AI Workflow')
    .toString()
    .trim();
  const defaultTab = ((section as any).default_tab ||
    tabs[0]?.key ||
    'text-to-video') as MainTab;

  // Tab state
  const [activeTab, setActiveTab] = useState<MainTab>(defaultTab);
  const [prompt, setPrompt] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Image to Video
  const [i2vMode, setI2vMode] = useState<I2VMode>('first-frame');
  const [i2vFirstFrame, setI2vFirstFrame] = useState(false);
  const [i2vLastFrame, setI2vLastFrame] = useState(false);
  const [i2vClip, setI2vClip] = useState(false);

  // Reference to Video
  const [refMaterials, setRefMaterials] = useState(false);
  const [refFirstFrame, setRefFirstFrame] = useState(false);
  const [refVoice, setRefVoice] = useState(false);

  // Video Edit
  const [editVideo, setEditVideo] = useState(false);
  const [editRefImage, setEditRefImage] = useState(false);

  // Shared params
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState<Resolution>('1080p');
  const [ratio, setRatio] = useState<Ratio>('16:9');
  const [audioSetting, setAudioSetting] = useState<AudioSetting>('auto');

  // Click-outside to close settings
  const bottomBarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        bottomBarRef.current &&
        !bottomBarRef.current.contains(e.target as Node)
      ) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [settingsOpen]);

  useEffect(() => {
    setActiveTab(defaultTab);
    setPrompt('');
    setSettingsOpen(false);
    setDuration(defaultTab === 'video-edit' ? 0 : 5);
  }, [defaultTab]);

  function switchTab(key: string) {
    setActiveTab(key as MainTab);
    setPrompt('');
    setSettingsOpen(false);
    setDuration(key === 'video-edit' ? 0 : 5);
  }

  // Title highlight rendered with the active brand accent.
  const highlightText = section.highlight_text ?? '';
  let titleParts: string[] | null = null;
  if (highlightText && section.title?.includes(highlightText)) {
    titleParts = section.title.split(highlightText, 2);
  }

  const durationLabel = duration === 0 ? 'Full' : `${duration}s`;
  const showRatio = activeTab !== 'image-to-video';
  const placeholder =
    tabs.find((t) => t.key === activeTab)?.placeholder ??
    'Describe your video...';

  return (
    <section
      id={section.id}
      className={cn(
        'relative flex min-h-screen flex-col items-center justify-center overflow-hidden',
        className
      )}
    >
      {/* ── Full-screen video background ────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10 bg-[color:var(--landing-shell)] dark:bg-zinc-950">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover opacity-26 saturate-[0.9] dark:opacity-50 dark:saturate-100"
        >
          <source src="/video/hero_video.mp4" type="video/mp4" />
          {section.background_image?.src && (
            <Image
              src={section.background_image.src}
              alt={section.background_image.alt || ''}
              className="object-cover"
              fill
              priority
              quality={80}
              unoptimized={section.background_image.src.startsWith('http')}
            />
          )}
        </video>
        {/* Cinematic gradient overlay */}
        <div className="from-background/10 via-background/38 to-background/84 absolute inset-0 bg-gradient-to-b dark:from-zinc-950/30 dark:via-transparent dark:to-zinc-950/80" />
        {/* Soft accent vignette */}
        <div
          className="absolute inset-0 opacity-70 dark:opacity-15"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 100%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-3xl px-4 pt-24 pb-16 text-center">
        {/* Badge */}
        {badgeText && (
          <div className="border-primary/18 bg-background/70 dark:bg-primary/10 mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 shadow-sm backdrop-blur-sm">
            <span className="bg-primary h-1.5 w-1.5 rounded-full shadow-[0_0_6px_color-mix(in_oklab,var(--color-primary)_55%,transparent)]" />
            <span className="text-foreground/78 dark:text-primary/85 text-xs font-medium tracking-wide">
              {badgeText}
            </span>
          </div>
        )}

        {/* Title */}
        {titleParts && titleParts.length > 0 ? (
          <h1 className="text-foreground mb-5 text-4xl leading-tight font-bold tracking-tight text-balance sm:text-6xl dark:text-white">
            {titleParts[0]}
            <span className="text-primary">{highlightText}</span>
            {titleParts[1]}
          </h1>
        ) : (
          <h1 className="text-foreground mb-5 text-4xl leading-tight font-bold tracking-tight text-balance sm:text-6xl dark:text-white">
            {section.title}
          </h1>
        )}

        {/* Description */}
        {section.description && (
          <p
            className="text-foreground/74 mx-auto mb-10 max-w-xl text-base leading-relaxed sm:text-lg dark:text-white/64"
            dangerouslySetInnerHTML={{ __html: section.description }}
          />
        )}

        {/* ── Mode tabs ─────────────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={cn(
                'rounded-full border px-5 py-2 text-sm font-medium transition-all duration-200',
                activeTab === tab.key
                  ? 'bg-primary border-primary text-primary-foreground shadow-[0_10px_24px_color-mix(in_oklab,var(--color-primary)_30%,transparent)]'
                  : 'border-foreground/10 bg-background/68 text-foreground/68 hover:bg-background/82 hover:text-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/8 dark:text-white/65 dark:hover:bg-white/15 dark:hover:text-white/90'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Input card ────────────────────────────────────────────────────── */}
        <div className="border-foreground/10 bg-background/72 mx-auto max-w-2xl rounded-2xl border p-4 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-shadow duration-300 dark:border-white/10 dark:bg-white/5 dark:shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_8px_32px_rgba(0,0,0,0.25)]">
          {/* Image to Video — sub-modes */}
          {activeTab === 'image-to-video' && (
            <div className="mb-3 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {I2V_MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => {
                      setI2vMode(m.key);
                      setI2vFirstFrame(false);
                      setI2vLastFrame(false);
                      setI2vClip(false);
                    }}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-all duration-150',
                      i2vMode === m.key
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-foreground/[0.06] text-foreground/68 hover:bg-foreground/[0.09] hover:text-foreground dark:bg-white/8 dark:text-white/55 dark:hover:bg-white/15 dark:hover:text-white/85'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {i2vMode === 'first-frame' && (
                <UploadZone
                  label="Upload first frame image"
                  hasFile={i2vFirstFrame}
                  onClear={() => setI2vFirstFrame(false)}
                />
              )}
              {i2vMode === 'first-last-frame' && (
                <div className="grid grid-cols-2 gap-2">
                  <UploadZone
                    label="First frame image"
                    hasFile={i2vFirstFrame}
                    onClear={() => setI2vFirstFrame(false)}
                  />
                  <UploadZone
                    label="Last frame image"
                    hasFile={i2vLastFrame}
                    onClear={() => setI2vLastFrame(false)}
                  />
                </div>
              )}
              {i2vMode === 'video-continuation' && (
                <UploadZone
                  label="Upload video clip (mp4 / mov)"
                  hasFile={i2vClip}
                  onClear={() => setI2vClip(false)}
                />
              )}
            </div>
          )}

          {/* Reference to Video */}
          {activeTab === 'reference-to-video' && (
            <div className="mb-3 space-y-2">
              <UploadZone
                label="Add reference images or videos (up to 5)"
                hasFile={refMaterials}
                onClear={() => setRefMaterials(false)}
              />
              <div className="grid grid-cols-2 gap-2">
                <UploadZone
                  label="First frame image"
                  optional
                  hasFile={refFirstFrame}
                  onClear={() => setRefFirstFrame(false)}
                />
                <UploadZone
                  label="Reference voice (wav / mp3)"
                  optional
                  hasFile={refVoice}
                  onClear={() => setRefVoice(false)}
                />
              </div>
            </div>
          )}

          {/* Video Edit */}
          {activeTab === 'video-edit' && (
            <div className="mb-3 space-y-2">
              <UploadZone
                label="Upload video to edit (mp4 / mov, 2–10s)"
                hasFile={editVideo}
                onClear={() => setEditVideo(false)}
              />
              <UploadZone
                label="Reference image — style or character"
                optional
                hasFile={editRefImage}
                onClear={() => setEditRefImage(false)}
              />
            </div>
          )}

          {/* Prompt textarea */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            className="text-foreground/90 placeholder:text-foreground/35 mb-3 max-h-[120px] min-h-[52px] w-full resize-none !bg-transparent text-sm outline-none dark:text-white/90 dark:placeholder:text-white/28"
            rows={2}
          />

          {/* Divider */}
          <div className="bg-foreground/10 mb-3 h-px dark:bg-white/6" />

          {/* Bottom toolbar */}
          <div ref={bottomBarRef} className="relative">
            <div className="flex items-center gap-2">
              {/* Param chips */}
              <div className="flex flex-1 flex-wrap gap-1.5">
                <ParamChip onClick={() => setSettingsOpen((v) => !v)}>
                  <svg
                    className="h-3 w-3 opacity-60"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4a.75.75 0 0 0-1.5 0v3.25l-1.97 1.97a.75.75 0 1 0 1.06 1.06l2.25-2.25A.75.75 0 0 0 8.75 9V5z" />
                  </svg>
                  <span>{durationLabel}</span>
                </ParamChip>

                <ParamChip onClick={() => setSettingsOpen((v) => !v)}>
                  <svg
                    className="h-3 w-3 opacity-60"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M2 2h12v12H2V2zm1.5 1.5v9h9v-9h-9z" />
                  </svg>
                  <span>{resolution}</span>
                </ParamChip>

                {showRatio && (
                  <ParamChip onClick={() => setSettingsOpen((v) => !v)}>
                    <svg
                      className="h-3 w-3 opacity-60"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <rect
                        x="1"
                        y="4"
                        width="14"
                        height="8"
                        rx="1.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <span>{ratio}</span>
                  </ParamChip>
                )}

                {activeTab === 'video-edit' && (
                  <ParamChip onClick={() => setSettingsOpen((v) => !v)}>
                    <svg
                      className="h-3 w-3 opacity-60"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path d="M8 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM4 10a4 4 0 0 0 8 0H11a3 3 0 0 1-6 0H4zm3 5h2v-1.07A5.01 5.01 0 0 0 13 9.5h-1a4 4 0 0 1-8 0H3a5.01 5.01 0 0 0 4 4.43V15z" />
                    </svg>
                    <span>
                      {audioSetting === 'auto' ? 'AI Audio' : 'Original'}
                    </span>
                  </ParamChip>
                )}

                <ParamChip onClick={() => setSettingsOpen((v) => !v)}>
                  <svg
                    className="h-3 w-3 opacity-60"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <circle cx="3" cy="8" r="1.25" />
                    <circle cx="8" cy="8" r="1.25" />
                    <circle cx="13" cy="8" r="1.25" />
                  </svg>
                </ParamChip>
              </div>

              {/* Generate button */}
              <button className="bg-primary text-primary-foreground hover:bg-primary/92 shrink-0 rounded-xl px-5 py-2 text-sm font-semibold shadow-lg transition-all duration-200 active:scale-95">
                ✦ {generateLabel}
              </button>
            </div>

            {/* Settings panel */}
            {settingsOpen && (
              <SettingsPanel
                tab={activeTab}
                duration={duration}
                setDuration={setDuration}
                resolution={resolution}
                setResolution={setResolution}
                ratio={ratio}
                setRatio={setRatio}
                audioSetting={audioSetting}
                setAudioSetting={setAudioSetting}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
