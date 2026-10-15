/**
 * Camera moves for Drone shot: what a user can ask for in words ("отлетает назад, потом облетает его"), each with a
 * tested way to get it from a video model. A request becomes a chain of these moves (at most 4); each pinned move ends
 * on a key frame drawn by the image model, which the next move starts from. Free moves (no key frame) are only used
 * as the last move, where nothing has to start from their end.
 *
 * Why key frames: from a photo alone, video models cheat the hard moves. An orbit came out as the person turning on
 * the spot with the world sliding past (09.10, 4 of 5 tries); "rise" barely rose in a forest. A key frame that can only
 * be reached by doing the move (the far side of the subject, the view from 60 m up) removes the cheat.
 */

export const MOVE_IDS = ["push_in", "pull_back", "orbit", "spiral", "rise", "descend", "top_down", "spin", "flyby", "along", "from_above", "from_space", "custom"] as const;
export type MoveId = (typeof MOVE_IDS)[number];
export type Dir = "left" | "right";
export type MoveStep = {
  move: MoveId;
  /** What the move is about, in the user's words ("the man", "маяк"); the main subject of the photo if empty. */
  target?: string;
  dir?: Dir;
  /** along: skim just above the ground or water. */
  low?: boolean;
  /** orbit / spiral: end on the face (or the front of an object) instead of the far side. */
  end?: "face" | "front";
  /** custom: the user's own words for a move the library has no template for. */
  text?: string;
};

export type MoveInfo = { id: MoveId; label: string; hint: string; pinned: boolean; intro?: boolean; segments?: number };
/** In menu order. `pinned`: the clip ends on a generated key frame. `intro`: ends on the photo, so it goes first. */
export const MOVES: MoveInfo[] = [
  { id: "push_in", label: "Push in", hint: "Flies straight toward the subject", pinned: true },
  { id: "pull_back", label: "Pull back", hint: "Flies back and up, the subject gets small and the place opens up", pinned: true },
  { id: "orbit", label: "Orbit", hint: "Goes round the subject; it stands still", pinned: true },
  { id: "spiral", label: "Spiral up", hint: "Goes round the subject while climbing", pinned: true },
  { id: "rise", label: "Rise", hint: "Climbs straight up above trees and roofs", pinned: true },
  { id: "descend", label: "Descend", hint: "Drops down low toward the subject", pinned: true },
  { id: "top_down", label: "Over the top", hint: "Flies over the subject and looks straight down", pinned: true },
  { id: "spin", label: "Spin", hint: "Stays in place and turns around, a 180° panorama", pinned: false },
  { id: "flyby", label: "Fly past", hint: "Glides sideways past the subject", pinned: false },
  { id: "along", label: "Fly along", hint: "Flies forward along a street, path or shore", pinned: false },
  { id: "from_above", label: "From the sky", hint: "Starts high up and comes down to the photo", pinned: true, intro: true },
  { id: "from_space", label: "From space", hint: "Starts with the planet and dives down to the photo", pinned: true, intro: true, segments: 2 },
  { id: "custom", label: "Your words", hint: "A move in your own words", pinned: false },
];
export const moveInfo = (id: MoveId) => MOVES.find((m) => m.id === id)!;
export const MAX_MOVES = 4;

/** "Pull back → Orbit right": how the flight was understood, shown before anyone pays for it. */
export function describeMoves(moves: MoveStep[]): string {
  return moves.map((m) => {
    const base = m.move === "custom" ? `«${(m.text ?? "").slice(0, 60)}»` : moveInfo(m.move).label;
    const extra = [m.dir && ["orbit", "spiral", "spin", "flyby"].includes(m.move) ? m.dir : "", m.low ? "low" : "", m.end ? `ends on the ${m.end}` : "", m.target ? `· ${m.target}` : ""].filter(Boolean).join(" ");
    return extra ? `${base} ${extra}` : base;
  }).join(" → ");
}

/**
 * Keep a chain buildable: known moves only, intro moves first and only one, free moves only last (a move in the
 * middle gets a key frame anyway, see `keyFrame`), at most 4 moves and 4 clips.
 */
export function normalizeMoves(raw: unknown): MoveStep[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: MoveStep[] = [];
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const move = String(o.move ?? "") as MoveId;
    if (!MOVE_IDS.includes(move)) continue;
    if (moveInfo(move).intro && out.length) continue; // "from the sky" only as the opening move
    const text = typeof o.text === "string" ? o.text.trim().slice(0, 300) : undefined;
    if (move === "custom" && !text) continue;
    const step: MoveStep = { move };
    if (typeof o.target === "string" && o.target.trim()) step.target = o.target.trim().slice(0, 120);
    if (o.dir === "left" || o.dir === "right") step.dir = o.dir;
    if (o.low === true) step.low = true;
    if (o.end === "face" || o.end === "front") step.end = o.end;
    if (text) step.text = text;
    out.push(step);
  }
  const trimmed: MoveStep[] = [];
  let clips = 0;
  for (const m of out) {
    const n = moveInfo(m.move).segments ?? 1;
    if (trimmed.length >= MAX_MOVES || clips + n > MAX_MOVES) break;
    trimmed.push(m); clips += n;
  }
  return trimmed;
}
export const clipCount = (moves: MoveStep[]) => moves.reduce((n, m) => n + (moveInfo(m.move).segments ?? 1), 0);

/* ------------------------------------------------------------------ reading the user's words without a language model */

const LEFT = /влево|налево|левее|против часовой|\bleft\b|counter-?clockwise|anticlockwise/iu;
const RIGHT = /вправо|направо|правее|по часовой|\bright\b|\bclockwise\b/iu;
const LOW = /низко|над самой|над землёй|над землей|над водой|бреющ|\blow\b|skim/iu;
/**
 * Words that chain moves: "потом", "затем", "then"… and arrows, semicolons, new lines. "Дальше" and "next" only after
 * a comma: "летит дальше по улице" and "fly next to the fountain" are one move.
 */
const SPLIT = /\n|;|→|->|\s(?:и\s+)?(?:потом|затем|после этого|после чего|далее|в конце|в итоге|наконец|and then|then|after that|afterwards|finally)\s|,\s*(?:и\s+|and\s+)?(?:дальше|next)[,:]?\s/iu;
/** Whole-word face words: "лицо", "в лицо", not "улица", "столица", "больница" or "лицей". */
export const FACE_WORDS = /\bfaces?\b|(?<!\p{L})лиц(?:о|а|у|е|ом)(?!\p{L})|в глаза|анфас/iu;

/** Going round something: "вокруг", "облёт", "круг", "кружит", "orbit"; not "круглая", "кружка" or "окружение". */
const ORBIT_WORDS = /вокруг|облет|облёт|обле[тч]|\borbit|\bcircl|\baround\b|\b360\b|(?<!\p{L})(?:круг(?!л|озор)|круж(?!к|ев))/iu;
/**
 * Spin is the camera turning on the spot. "Крутится вокруг машины" is an orbit, and "разворот на панораму" after a
 * climb is just the view opening up: a spin needs "на месте / вокруг своей оси" or a turning verb with nothing to go
 * round. Going round something wins: "кружит вокруг человека, который стоит на месте" is an orbit.
 */
const SPIN = {
  test: (f: string) => /вокруг своей оси|around (?:its|it'?s) own axis/iu.test(f) ||
    // "looks around" / "turns around" at the end of a phrase go round nothing.
    (!ORBIT_WORDS.test(f.replace(/(?:look(?:s|ing)?|turns?|turning) around(?=\s*(?:$|[,.;!?]|and\b))/giu, "")) &&
      /на месте|on the spot|in place|\bspin|осматрива|look(?:s|ing)? around|(?<!\p{L})вращ|крут[ия]тся|разворачива|оборачива|смотрит назад|turns? around|turns? back|looks? back|rotat/iu.test(f)),
};
/** Ordered: the first rule whose pattern matches a fragment wins, so the specific ones go first. */
const RULES: { move: MoveId; test: RegExp | { test: (f: string) => boolean } }[] = [
  // Space as a place to start from: "из космоса", "с орбиты", "from space"; not "по орбите вокруг", "the space between".
  { move: "from_space", test: /космос|с орбиты|(?<!\p{L})планет|from (?:outer )?space|outer space|from orbit|\bplanet\b|satellite/iu },
  { move: "from_above", test: /с неба|с высоты (?:вниз|к)|сверху вниз к|опускается с высоты|from the sky|from high above|from way up/iu },
  { move: "spiral", test: /спирал|по спирали|винтом|\bspiral|corkscrew/iu },
  { move: "spin", test: SPIN },
  { move: "orbit", test: ORBIT_WORDS },
  { move: "pull_back", test: /отдал|отлет|отлёт|отъезд|отъезжа|назад|удаля|прочь|pull(?:s|ing)? back|pulls? out|fly away|backward|dolly out|zoom out/iu },
  // Straight down only: "пролёт над улицей" is a flight along it.
  { move: "top_down", test: /сверху вниз|вид сверху|строго вниз|(?:смотр|гляд)\p{L}*\s+(?:строго\s+)?вниз|над (?:ним|ней|ними|головой|объектом)|top[- ]?down|bird'?s[- ]eye|overhead|look(?:s|ing)? (?:straight )?down|over the top/iu },
  { move: "rise", test: /подъ[её]м|поднима|взлета|взлёт|вверх|ввысь|над крон|над крыш|\brise|\brising\b|\bclimb|\bascend|crane up|up above|\b(?:fly|flies|flying|go|goes|going|move|moves|moving|straight)\s+up\b|\bupwards?\b/iu },
  { move: "descend", test: /спуск|спуска|опуска|сниж|пике|ныря|вниз|\bdescend|\bdive|drop(?:s|ping)? down|swoop|\b(?:fly|flies|flying|go|goes|going|move|moves|moving|come|comes|coming|straight)\s+down\b(?!\s+(?:the|this|that|a)\b)|\bdownwards?\b/iu },
  { move: "flyby", test: /мимо|сбоку|боком|вбок|параллельно|\bpast\b|fly-?by|sideways|tracking shot|\btruck(?:s|ing)?\s+(?:left|right)|trucking shot/iu },
  { move: "along", test: /вдоль|по улиц|по дорог|по тропин|по берег|по реке|по каналу|над тропин|над улиц|над дорог|над рек|над вод|сквозь|через лес|через город|между|along|down the street|through the|between/iu },
  { move: "push_in", test: /приближ|подлет|подлёт|наезд|влет|влёт|ближе|к (?:нему|ней|ним|лицу|человеку|дому)|в сторону|вперёд|вперед|toward|towards|push(?:es)? in|fly in|closer|zoom in|approach/iu },
];
const ruleOf = (f: string) => RULES.find((r) => r.test.test(f))?.move;

/** "облетает его и поднимается вверх" is two moves; "крутится на месте и показывает город" is one. */
function splitAnd(f: string): string[] {
  const parts = f.split(/(\s+(?:и|and)\s+)/iu);
  const out = [parts[0]];
  for (let i = 1; i < parts.length; i += 2) {
    const next = parts[i + 1];
    const a = ruleOf(out[out.length - 1]), b = ruleOf(next);
    if (a && b && a !== b) out.push(next);
    else out[out.length - 1] += parts[i] + next;
  }
  return out;
}

/** The thing a fragment names after "вокруг/к/над/around/toward…", kept in the user's words. */
const TAIL = /^(?:влево|вправо|налево|направо|слева|справа|сверху|снизу|низко|высоко|быстро|медленно|плавно|left|right|low|high|fast|slowly|slow|smoothly|и|а|потом|затем|and|then)$/iu;
function targetOf(fragment: string): string | undefined {
  // A preposition is a whole word ("к", not the end of "замок"); "from space to our house" is about the house.
  const m = fragment.match(/(?<!\p{L})(?:вокруг|к|над|мимо|вдоль|around|toward|towards|to(?=\s+(?:the|our|my|his|her|their|a|an)\s)|over|past|along)\s+([\p{L}\d][\p{L}\d\s-]{1,40}?)(?=[,.;!?]|\s(?:и|а|потом|затем|then|and)\s|$)/iu)
    ?? fragment.match(/(?<!\p{L})(?:от|from)\s+([\p{L}\d][\p{L}\d\s-]{1,40}?)(?=[,.;!?]|\s(?:и|а|потом|затем|then|and)\s|$)/iu);
  if (!m) return undefined;
  const words = m[1].trim().split(/\s+/u);
  // Adverbs and conjunctions at either end are not part of the name: "мимо замка справа", "маяк и".
  while (words.length && TAIL.test(words[words.length - 1])) words.pop();
  while (words.length && TAIL.test(words[0])) words.shift();
  const t = words.join(" ");
  // Pronouns and the generic "it/him" carry nothing: the main subject of the photo is meant.
  if (!t || /^(?:него|нему|ней|неё|нее|них|ним|нему|себя|it|him|her|them|the subject)$/iu.test(t)) return undefined;
  return t;
}

/**
 * The user's words as moves, by keyword: the fallback when the language model is down, and what the site shows at once
 * while the model answers. Fragments with no known move become `custom` with their own words.
 */
export function parseMovesRules(text: string): MoveStep[] {
  const t = text.replace(/\s+/gu, " ").replace(/\s*\n\s*/gu, "\n").trim();
  if (!t) return [];
  const fragments = text.split(SPLIT).flatMap((f) => f.split(/,\s*(?=(?:и\s+)?(?:потом|затем|then|после)\b)/iu)).flatMap(splitAnd).map((f) => f.trim()).filter((f) => /\p{L}{2,}/u.test(f));
  const moves: MoveStep[] = [];
  for (const f of fragments) {
    const rule = ruleOf(f);
    // "облёт деревьев" is weaving through them on the way, not an orbit round one subject.
    const move: MoveId = rule === "orbit" && /деревь|стволов|домов|зданий|колонн|\btrees\b|\bbuildings\b/iu.test(f) && !/вокруг\s+(?:него|неё|нее|человека|дома|здания)|\baround (?:him|her|the (?:man|woman|person|house))/iu.test(f) ? "along" : rule ?? "custom";
    const step: MoveStep = { move };
    if (move === "custom") step.text = f;
    else {
      const target = targetOf(f) ?? (move === "top_down" ? f.match(/(?:сверху|вниз)\s+на\s+([\p{L}\d][\p{L}\d\s-]{1,40}?)(?=[,.;!?]|$)/iu)?.[1].trim() : undefined);
      if (target && !["along", "spin", "rise"].includes(move)) step.target = target;
      if (LEFT.test(f)) step.dir = "left"; else if (RIGHT.test(f)) step.dir = "right";
      if (move === "along" && LOW.test(f)) step.low = true;
      if ((move === "orbit" || move === "spiral") && FACE_WORDS.test(f)) step.end = "face";
      else if ((move === "orbit" || move === "spiral") && /спереди|фронт|\bfront\b/iu.test(f)) step.end = "front";
      // A fragment that also names a route ("вдоль улицы на уровне балконов") keeps its words for the prompt.
      if (move === "along" || move === "flyby") step.text = f;
    }
    moves.push(step);
  }
  return normalizeMoves(moves);
}

/* ------------------------------------------------------------------ the language model's part */

/** System prompt for the model that reads the user's words into moves (JSON only). */
export const INTERPRET_SYSTEM = `You turn a user's description of a drone camera flight over ONE photo into a short chain of camera moves.
The user writes in any language (often Russian). Answer with JSON only: {"moves":[...]}.
Each move: {"move": one of ${MOVE_IDS.map((m) => `"${m}"`).join(", ")}, "target"?: what it is about, in the user's words, "dir"?: "left"|"right", "low"?: true, "end"?: "face"|"front", "text"?: the user's own words for this move when they add a detail the move name loses ("влетает в окно", "под арку", "на уровне балконов")}.
MOVES
- push_in: flies toward something (приближение, подлетает, наезд, ближе, fly in, closer).
- pull_back: flies backward/away, the subject gets smaller (отдаление, отлетает, отъезд, назад, pull back, fly away, zoom out).
- orbit: goes ROUND one subject that stands still (облёт, облети, вокруг, по кругу, кружит вокруг, orbit, circle around). "крутится/летает вокруг человека" is an orbit, not a spin. end "face"/"front" if they want to finish on the face / front.
- spiral: goes round the subject while climbing (по спирали, винтом вверх, spiral up).
- rise: climbs straight up (подъём, взлетает вверх, над кронами, rise, crane up).
- descend: drops down toward something (спуск, снижается, пике, ныряет вниз, dive).
- top_down: flies over a subject and looks STRAIGHT DOWN at it (вид сверху на бассейн, строго вниз, над ним с камерой вниз, top-down, bird's eye). NOT top_down: "вид на лес/город сверху", "сверху открывается вид" at the end of a climb — that is where the rise ends; add nothing for it.
- spin: the camera stays in place and turns around its own axis (камера крутится/вращается на месте, вокруг своей оси, разворачивается и смотрит назад, spin). Only when nothing is named to go around. NOT a spin: "разворот на панораму", "открывается панорама", "вид на город" at the end of a climb or a flight — that is just where the previous move ends; add nothing for it.
- flyby: glides sideways past something (пролёт мимо, сбоку, параллельно, fly past). Put the user's words in "text".
- along: flies forward along/through a street, path, shore, forest (пролёт вдоль улицы, над тропинкой, сквозь лес, между деревьями, through the city). "облёт деревьев" while flying through is along, not orbit. low: true for "низко", "над самой землёй/водой". Put the user's words in "text".
- from_above: starts high in the sky and comes down to the photo (с неба, с высоты вниз). Only as the first move.
- from_space: starts from the planet in space (из космоса, с орбиты, планета). Only as the first move.
- custom: a camera move that fits none of these; "text" = the user's words for it.
RULES
- Keep the user's order. At most 4 moves. Merge repeats ("облёт, облёт" = one orbit).
- Only camera moves. Ignore requests to add or change things in the scene (birds, people, effects, weather, style words like 4k, cinematic).
- "дрон" / "drone" means the camera.
- dir only if they say left/right/clockwise (влево, вправо, по часовой).
- If the text has no camera move at all, answer {"moves":[]}.
EXAMPLES
"дрон летает вокруг человека" → {"moves":[{"move":"orbit","target":"человека"}]}
"сначала отлетает назад, потом облетает его и смотрит в лицо" → {"moves":[{"move":"pull_back"},{"move":"orbit","end":"face"}]}
"камера крутится на месте и показывает весь город" → {"moves":[{"move":"spin"}]}
"низко над водой вдоль берега, потом резко вверх" → {"moves":[{"move":"along","low":true,"text":"низко над водой вдоль берега"},{"move":"rise"}]}
"из космоса к нашему дому, потом облёт дома" → {"moves":[{"move":"from_space","target":"нашему дому"},{"move":"orbit","target":"дома"}]}
"пролёт вдоль улицы, поворот под арку, затем подъём над крышами и разворот на панораму города" → {"moves":[{"move":"along","text":"пролёт вдоль улицы, поворот под арку"},{"move":"rise","text":"подъём над крышами, панорама города"}]}
"низко над тропинкой между деревьями, облёт деревьев, потом подъём сквозь кроны и вид на лес сверху" → {"moves":[{"move":"along","low":true,"text":"низко над тропинкой между деревьями, облёт деревьев"},{"move":"rise","text":"подъём сквозь кроны, вид на лес сверху"}]}
"камера влетает в окно" → {"moves":[{"move":"push_in","target":"окно","text":"влетает в окно"}]}`;

/** The model's answer, checked: unknown moves dropped, order and limits enforced. Undefined if it's not JSON. */
export function readInterpretAnswer(text: string): MoveStep[] | undefined {
  try {
    const j = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/gu, "").trim()) as { moves?: unknown };
    return normalizeMoves(j.moves);
  } catch { return undefined; }
}
