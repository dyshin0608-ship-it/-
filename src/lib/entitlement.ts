import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 구매한 기능을 가지고 있는지.
 *
 * 또박에는 계정이 없다. 그래서 "누가 샀는지"를 앱이 알 방법은 구글 플레이에
 * 물어보는 것뿐이다. 기기의 구글 계정으로 산 기록이 남아 있으면, 폰을 바꾸거나
 * 앱을 지웠다 깔아도 같은 계정이면 되살릴 수 있다.
 */

/** Play Console에 만들 상품 ID. 일회성(관리되는 제품, in-app)이다. */
export const EXPORT_PRODUCT_ID = 'ttobak.export.lifetime';

export type Entitlement = {
  owned: true;
  /** 구글 플레이에 마지막으로 확인한 시각. */
  checkedAt: string;
};

const KEY = 'medi.entitlement.v1';

/**
 * 구글 플레이에 물어본 결과.
 *
 * "안 샀다"와 "못 물어봤다"를 구분하는 것이 중요하다. 둘을 섞으면 비행기 모드에서
 * 산 기능이 잠긴다.
 */
export type VerifyResult =
  | { ok: true; owned: boolean }
  | { ok: false };

/**
 * 저장해 둔 상태와 방금 물어본 결과를 합친다.
 *
 * - 샀다고 하면 갖는다.
 * - 안 샀다고 "확실히" 답하면 뺏는다. (환불했거나, 다른 계정이거나)
 * - 못 물어봤으면 저장해 둔 것을 그대로 둔다. 인터넷이 없다고 산 걸 잠그지 않는다.
 */
export function reconcile(
  cached: Entitlement | null,
  result: VerifyResult,
  now: Date,
): Entitlement | null {
  if (!result.ok) return cached;
  if (!result.owned) return null;
  return { owned: true, checkedAt: now.toISOString() };
}

export async function readEntitlement(): Promise<Entitlement | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const value = parsed as Record<string, unknown>;
    if (value.owned !== true) return null;
    return {
      owned: true,
      checkedAt: typeof value.checkedAt === 'string' ? value.checkedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function writeEntitlement(entitlement: Entitlement | null): Promise<void> {
  if (entitlement === null) await AsyncStorage.removeItem(KEY);
  else await AsyncStorage.setItem(KEY, JSON.stringify(entitlement));
}
