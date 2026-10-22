/**
 * 식약처 "의약품개요정보(e약은요)" 자료를 앱에 담아 둔 것이다.
 *
 * 약 정보는 절대 만들어 쓰지 않는다. 아래 문장들은 모두 식약처가 공개한
 * 원문 그대로이고, 화면에도 출처와 갱신일을 함께 보여 준다.
 * 자료를 기기에 담아 두는 이유는 이 앱이 서버도 계정도 쓰지 않기 때문이다.
 */
export type DrugInfo = {
  /** 품목기준코드. 식약처 공식 페이지로 가는 열쇠. */
  seq: string;
  /** 제품명 */
  name: string;
  /** 업체명 */
  maker: string;
  /** 효능효과 — "어떨 때 먹는 약인지" */
  efficacy: string;
  /** 사용법 */
  usage: string;
  /** 사용 전 경고 */
  warning: string;
  /** 다른 약·음식과의 상호작용 */
  interaction: string;
  /** 보관법 */
  storage: string;
  /** 자료 갱신일 (YYYY-MM-DD) */
  updated: string;
};

/**
 * 자료가 4,700여 건이라 앱이 켜질 때 바로 읽지 않는다.
 * 약 이름을 처음 검색하는 순간에만 읽어서, 알림 앱의 시작 속도를 건드리지 않는다.
 */
let cache: DrugInfo[] | null = null;

function all(): DrugInfo[] {
  if (!cache) {
    cache = require('../../assets/drugs.json') as DrugInfo[];
  }
  return cache;
}

/** 자료 출처. 화면에 반드시 같이 보여 준다. */
export const SOURCE_NAME = '식품의약품안전처 의약품개요정보(e약은요)';

/** 식약처 의약품안전나라의 해당 품목 페이지. 전체 허가사항은 여기서 본다. */
export function officialUrl(seq: string): string {
  return `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${seq}`;
}

/** 자료 전체에서 가장 늦은 갱신일. "자료 기준일"로 보여 준다. */
export function datasetUpdatedAt(): string {
  let latest = '';
  for (const drug of all()) {
    if (drug.updated > latest) latest = drug.updated;
  }
  return latest;
}

/**
 * "위장약", "설사약"처럼 제품명이 아니라 쓰임새로 부르는 말을 효능효과에 적힌
 * 낱말로 풀어 준다. 약 이름을 정확히 모를 때도 찾을 수 있게 하기 위한 것이고,
 * 여기 적힌 낱말은 식약처 문장에 실제로 쓰이는 표현이다.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  위장약: ['위염', '속쓰림', '위산과다', '소화불량'],
  소화제: ['소화불량', '소화촉진'],
  제산제: ['위산과다', '속쓰림'],
  설사약: ['설사'],
  지사제: ['설사'],
  변비약: ['변비'],
  감기약: ['감기'],
  해열제: ['해열', '발열'],
  진통제: ['진통', '동통'],
  두통약: ['두통'],
  생리통약: ['월경통', '생리통'],
  근육통약: ['근육통'],
  관절약: ['관절통'],
  알레르기약: ['알레르기', '두드러기'],
  비염약: ['비염'],
  기침약: ['기침'],
  가래약: ['가래'],
  멀미약: ['멀미'],
  수면제: ['불면'],
  무좀약: ['무좀', '백선'],
  치질약: ['치질', '치핵'],
  안약: ['결막', '점안'],
  피부약: ['피부염', '습진'],
  상처약: ['상처', '화상'],
  구내염약: ['구내염'],
  영양제: ['비타민'],
};

/** 찾은 까닭. 제품명이 맞은 것인지, 효능효과 문장이 맞은 것인지. */
export type DrugMatch = DrugInfo & { matchedBy: 'name' | 'efficacy' };

function normalize(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

/** "위장약" 같은 말이 들어오면 효능효과에서 찾을 낱말들로 바꾼다. */
function efficacyTerms(query: string): string[] {
  const q = normalize(query);
  const terms = new Set<string>();
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (q.includes(normalize(category)) || normalize(category).includes(q)) {
      for (const word of words) terms.add(word);
    }
  }
  // 사전에 없는 말도 본문에서 그대로 찾아 본다 ("두드러기", "코막힘" 등)
  if (query.trim().length >= 2) terms.add(query.trim());
  return [...terms];
}

/**
 * 약을 찾는다.
 *
 * 먼저 제품명으로 찾고(앞에서 일치하는 것이 먼저), 그것만으로 부족하면
 * 효능효과 문장에서 찾는다. 약 이름을 정확히 모르고 "위장약"처럼 쓰임새로만
 * 아는 경우가 흔하기 때문이다. 효능효과로 찾은 것은 그렇다고 표시해서,
 * 왜 이 약이 나왔는지 화면에서 알 수 있게 한다.
 */
export function searchDrugs(query: string, limit = 8): DrugMatch[] {
  const q = normalize(query);
  if (q.length < 2) return [];

  const starts: DrugInfo[] = [];
  const contains: DrugInfo[] = [];
  for (const drug of all()) {
    const name = normalize(drug.name);
    if (name.startsWith(q)) starts.push(drug);
    else if (name.includes(q)) contains.push(drug);
  }

  const byLength = (a: DrugInfo, b: DrugInfo) => a.name.length - b.name.length;
  const byName: DrugMatch[] = [...starts.sort(byLength), ...contains.sort(byLength)]
    .slice(0, limit)
    .map((drug) => ({ ...drug, matchedBy: 'name' as const }));
  if (byName.length >= limit) return byName;

  const seen = new Set(byName.map((drug) => drug.seq));
  const terms = efficacyTerms(query);

  // 찾은 낱말이 효능효과 문장의 앞쪽에 나올수록 그 약의 주된 쓰임새다.
  // 그냥 걸리는 대로 담으면 가나다순으로 앞선 약이 올라와, 설사약을 찾는데
  // 위장염 약이 먼저 나오는 일이 생긴다.
  const scored: { drug: DrugInfo; at: number }[] = [];
  for (const drug of all()) {
    if (seen.has(drug.seq)) continue;
    let at = Infinity;
    for (const term of terms) {
      const found = drug.efficacy.indexOf(term);
      if (found >= 0 && found < at) at = found;
    }
    if (at < Infinity) scored.push({ drug, at });
  }
  scored.sort((a, b) => a.at - b.at || a.drug.efficacy.length - b.drug.efficacy.length);

  const byEfficacy = scored
    .slice(0, limit - byName.length)
    .map(({ drug }) => ({ ...drug, matchedBy: 'efficacy' as const }));
  return [...byName, ...byEfficacy];
}

export function getDrug(seq: string): DrugInfo | null {
  return all().find((drug) => drug.seq === seq) ?? null;
}

/**
 * 효능효과 원문에서 몸의 어느 부위에 쓰는 약인지 뽑아낸다.
 *
 * 새 정보를 지어내는 게 아니라 식약처 문장에 실제로 적힌 단어만 집는다.
 * 그래서 화면에서는 이 꼬리표 바로 아래에 원문을 그대로 함께 보여 준다.
 * 낱글자('위', '눈', '장')는 다른 낱말에 섞여 잘못 걸리므로 쓰지 않는다.
 */
const BODY_PART_RULES: { label: string; keywords: string[] }[] = [
  { label: '열', keywords: ['발열', '해열', '오한', '열감'] },
  { label: '머리', keywords: ['두통', '편두통'] },
  { label: '눈', keywords: ['결막', '안구', '점안', '눈의 피로', '눈물'] },
  { label: '코', keywords: ['비염', '콧물', '코막힘', '재채기', '비충혈'] },
  { label: '목', keywords: ['인후', '편도', '목의 통증', '쉰 목소리'] },
  { label: '치아·잇몸', keywords: ['치통', '잇몸', '치은', '구내염'] },
  { label: '가슴·기관지', keywords: ['기침', '가래', '천식', '기관지', '거담'] },
  { label: '배·속', keywords: ['복통', '위통', '위염', '위산', '속쓰림', '소화불량', '설사', '변비', '구역', '구토', '팽만'] },
  { label: '아랫배', keywords: ['월경통', '생리통', '월경곤란'] },
  { label: '근육·관절', keywords: ['근육통', '관절통', '신경통', '요통', '염좌', '류마티', '견비통', '타박'] },
  { label: '피부', keywords: ['습진', '두드러기', '가려움', '발진', '피부염', '상처', '화상'] },
  { label: '귀', keywords: ['이통', '중이염', '외이염'] },
];

export function bodyPartsFor(efficacy: string): string[] {
  const parts: string[] = [];
  for (const rule of BODY_PART_RULES) {
    if (rule.keywords.some((keyword) => efficacy.includes(keyword))) {
      parts.push(rule.label);
    }
  }
  return parts;
}

/** 인체 그림에서 칠할 수 있는 영역. */
export type BodyRegion =
  | 'head'
  | 'eyes'
  | 'nose'
  | 'mouth'
  | 'ears'
  | 'neck'
  | 'chest'
  | 'abdomen'
  | 'pelvis'
  | 'joints'
  | 'skin';

/**
 * 부위 꼬리표를 인체 그림의 영역으로 옮긴다.
 *
 * "열"은 몸 어느 한 곳이 아니라 전신 증상이라 그림에는 칠하지 않는다.
 * 해열제가 온몸을 빨갛게 칠해 버리면 그림이 아무것도 말해 주지 못한다.
 * 꼬리표에는 그대로 남으므로 정보가 사라지지는 않는다.
 */
const REGION_BY_PART: Record<string, BodyRegion[]> = {
  열: [],
  머리: ['head'],
  눈: ['eyes'],
  코: ['nose'],
  목: ['neck'],
  '치아·잇몸': ['mouth'],
  귀: ['ears'],
  '가슴·기관지': ['chest'],
  '배·속': ['abdomen'],
  아랫배: ['pelvis'],
  '근육·관절': ['joints'],
  피부: ['skin'],
};

export function bodyRegionsFor(parts: string[]): BodyRegion[] {
  const regions = new Set<BodyRegion>();
  for (const part of parts) {
    for (const region of REGION_BY_PART[part] ?? []) {
      regions.add(region);
    }
  }
  return [...regions];
}
