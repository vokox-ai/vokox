/** API contract shared by the CLI, the mock server and (later) the real backend. See docs/API.md. */

export type JobType = "image" | "video" | "gif" | "music" | "tts" | "compose";
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
  music?: { asset: string; volume?: number; duck?: boolean; fadeOut?: number };
  captions?: { from?: string; text?: string[]; style?: string; language?: string };
  output?: { format?: "mp4" | "webm" | "gif"; fps?: number };
}

export interface JobInput {
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
export interface PriceResponse { credits: number; model: string; breakdown?: string }

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
  output?: { assets: Asset[]; shareUrl?: string };
}

export interface Me {
  id: string;
  email: string;
  balance: number;
  balances?: { plan: number; free: number; paid: number };
  plan?: string | { id: string; name: string; period?: string; renewsAt?: string; cancelAtPeriodEnd?: boolean; creditsPerPeriod?: number };
  topupUrl: string;
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
  error: { code: string; message: string; topupUrl?: string; details?: unknown };
}
