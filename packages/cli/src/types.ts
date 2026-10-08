/** API contract shared by the CLI, the mock server and (later) the real backend. See docs/API.md. */

export type JobType = "image" | "video" | "gif" | "music" | "tts" | "transcribe" | "compose" | "recreate" | "analyze" | "plan";
export type Tier = "fast" | "hq" | "premium";
export type CreditUnit = "image" | "second" | "track" | "1k_chars" | "flat";

export interface ModelCredits {
  unit: CreditUnit;
  amount: number;
  /** Billed minimum, e.g. providers that charge at least 5 seconds. */
  minSeconds?: number;
}

export interface ModelCaps {
  durations?: number[];
  aspectRatios?: string[];
  resolutions?: string[];
  audio?: boolean;
  imageInput?: boolean;
  maxRefs?: number;
  languages?: string[];
  maxChars?: number;
}

export interface Model {
  id: string;
  class: JobType;
  tier?: Tier;
  name: string;
  credits: ModelCredits;
  caps: ModelCaps;
  notes?: string;
  /** Approximate wall-clock seconds for a typical job. */
  eta?: number;
}

export interface ComposeClip {
  asset: string;
  trim?: { start?: number; end?: number };
  transition?: "cut" | "fade";
}

export interface ComposeTimeline {
  aspectRatio?: string;
  clips: ComposeClip[];
  voice?: { asset: string; start?: number; volume?: number };
  /** Level of the clips' own sound; with a voice track it is muted unless set (e.g. 0.3). */
  clipAudio?: { volume?: number };
  music?: { asset: string; volume?: number; duck?: boolean; fadeOut?: number };
  captions?: { from?: string; text?: string[]; style?: string; language?: string };
  output?: { format?: "mp4" | "webm" | "gif"; fps?: number };
}

export interface JobInput {
  /** recreate: gallery slug, the client's extra direction, the spoken line, a cheap 480p preview. */
  template?: string; edit?: string; script?: string; draft?: boolean;
  /** analyze: the reference (a Reels/TikTok/Shorts/Pinterest link or an asset id) and what to make of it. */
  reference?: string; brief?: string;
  /** plan: steps run in order on the server (the plan an analyze job returns). */
  plan?: { name?: string; steps: Record<string, unknown>[] };
  model?: string;
  prompt?: string;
  negativePrompt?: string;
  /** Asset ids (from uploads or previous jobs). */
  refs?: string[];
  aspectRatio?: string;
  duration?: number;
  resolution?: string;
  audio?: boolean;
  n?: number;
  seed?: number;
  text?: string;
  voice?: string;
  language?: string;
  timeline?: ComposeTimeline;
  /** Free-form pass-through for model-specific parameters. */
  params?: Record<string, unknown>;
}

export interface PriceRequest { type: JobType; input: JobInput }
/** Balance next to every price and balance answer: `notice` is ready to tell the user (low balance, not enough, top-up link). */
export interface Funds { balance: number; balances: { plan: number; free: number; paid: number }; low: boolean; enough?: boolean; topupUrl: string; notice?: string }
export interface PriceResponse extends Partial<Funds> { credits: number; model: string; breakdown?: string; freeTrial?: boolean }
export interface PaymentLink extends Funds { url: string; kind: "checkout" | "page"; checkoutEnabled: boolean; packs: { id: string; usd: number; credits: number }[]; notice: string }
export interface DronePlan extends Partial<Funds> { plan: { name: string; steps: unknown[] }; refs: string[]; credits: number; freeTrial: boolean; summary: { mode: string; seconds: number; clips: number[]; speed: string; video: string; resolution: string; aspectRatio: string; trialSetup: boolean } }

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export interface Asset {
  id: string;
  url: string;
  mime: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  model: string;
  creditsHeld: number;
  creditsCharged: number;
  progress?: number;
  createdAt: string;
  finishedAt?: string;
  error?: { code: string; message: string };
  /** When the files are deleted (retention: 90 days). */
  expiresAt?: string;
  /** `preview`: 3×2 frame sheet of a video result; `text`: transcript of a transcribe job. */
  output?: { assets: Asset[]; preview?: Asset; text?: string; language?: string; shareUrl?: string; expired?: boolean };
}

export interface Me {
  id: string;
  email: string;
  balance: number;
  balances?: { plan: number; free: number; paid: number };
  plan?: string | { id: string; name: string; period?: string; renewsAt?: string; cancelAtPeriodEnd?: boolean; creditsPerPeriod?: number };
  topupUrl: string;
  low?: boolean;
  notice?: string;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

export interface DeviceTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: "authorization_pending" | "slow_down" | "expired_token" | "access_denied";
}

export interface ApiErrorBody {
  error: { code: string; message: string; topupUrl?: string; notice?: string; details?: unknown };
}
