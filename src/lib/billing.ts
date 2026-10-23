import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  requestPurchase,
  type Product,
  type Purchase,
} from 'expo-iap';
import { Platform } from 'react-native';

import {
  EXPORT_PRODUCT_ID,
  readEntitlement,
  reconcile,
  writeEntitlement,
  type Entitlement,
  type VerifyResult,
} from './entitlement';

/**
 * 구글 플레이 결제.
 *
 * 서버를 두지 않는다. 구매 확인은 구글 플레이에 직접 물어본다. 영수증을 우리
 * 서버로 보내 검증하는 방식이 더 단단하지만, 그러려면 서버가 필요하고 사용자
 * 기록이 밖으로 나가게 된다. 일회성 몇 천 원짜리 기능이라 기기에서 확인하는
 * 쪽을 택했다. 루팅한 기기에서는 우회할 수 있다는 뜻이기도 하다.
 */

let connected = false;

/** 결제 연결을 연다. 이미 열려 있으면 아무것도 하지 않는다. */
async function connect(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (connected) return true;
  try {
    await initConnection();
    connected = true;
    return true;
  } catch {
    // 플레이 스토어가 없는 기기이거나, 아직 스토어에 올라가지 않은 빌드다.
    return false;
  }
}

/** 상품 정보. 가격은 구글 플레이가 알려주는 문자열을 그대로 쓴다(통화·지역이 맞는다). */
export type ExportProduct = {
  id: string;
  title: string;
  /** "₩3,900" 처럼 화면에 바로 쓸 수 있는 가격. */
  displayPrice: string;
};

export async function loadProduct(): Promise<ExportProduct | null> {
  if (!(await connect())) return null;
  try {
    const fetched = await fetchProducts({ skus: [EXPORT_PRODUCT_ID], type: 'in-app' });
    const products: Product[] = Array.isArray(fetched) ? (fetched as Product[]) : [];
    const product = products.find((item) => item.id === EXPORT_PRODUCT_ID) ?? products[0];
    if (!product) return null;
    return {
      id: product.id,
      title: product.title,
      displayPrice: product.displayPrice,
    };
  } catch {
    return null;
  }
}

async function readPurchases(): Promise<Purchase[]> {
  const result = await getAvailablePurchases();
  return Array.isArray(result) ? result : [];
}

function ownsExport(purchases: Purchase[]): Purchase | null {
  for (const purchase of purchases) {
    if (purchase.productId !== EXPORT_PRODUCT_ID) continue;
    if (purchase.purchaseState !== 'purchased') continue; // 'pending'은 아직 결제 중이다
    return purchase;
  }
  return null;
}

/**
 * 구글 플레이가 아직 확인받지 못한 구매를 마무리한다.
 *
 * **이걸 빼먹으면 구글이 3일 뒤에 자동으로 환불합니다.** 일회성 상품이므로
 * isConsumable은 false다. true로 주면 소모품이 되어 한 번 더 살 수 있게 된다.
 */
function isAcknowledged(purchase: Purchase): boolean {
  return 'isAcknowledgedAndroid' in purchase && purchase.isAcknowledgedAndroid === true;
}

async function acknowledge(purchase: Purchase): Promise<void> {
  if (isAcknowledged(purchase)) return;
  try {
    await finishTransaction({ purchase, isConsumable: false });
  } catch {
    // 다음에 다시 시도한다. getAvailablePurchases가 계속 돌려주기 때문에 기회는 또 온다.
  }
}

/**
 * 구글 플레이에 "이 계정이 샀나"를 물어보고, 저장해 둔 상태와 합친다.
 *
 * 물어보지 못했으면(인터넷 없음, 플레이 스토어 없음) 저장해 둔 상태를 그대로 둔다.
 */
export async function verifyEntitlement(): Promise<Entitlement | null> {
  const cached = await readEntitlement();
  let result: VerifyResult = { ok: false };

  if (await connect()) {
    try {
      const purchases = await readPurchases();
      const mine = ownsExport(purchases);
      if (mine) await acknowledge(mine);
      result = { ok: true, owned: mine !== null };
    } catch {
      result = { ok: false };
    }
  }

  const next = reconcile(cached, result, new Date());
  if (JSON.stringify(next) !== JSON.stringify(cached)) await writeEntitlement(next);
  return next;
}

export type PurchaseOutcome =
  /** 샀다. */
  | { kind: 'owned' }
  /** 사용자가 결제창을 닫았다. 잘못된 게 아니므로 오류로 보여 주지 않는다. */
  | { kind: 'cancelled' }
  /** 결제가 걸려 있다(계좌이체 등). 승인되면 그때 권한이 생긴다. */
  | { kind: 'pending' }
  /** 결제를 시작하지 못했다. */
  | { kind: 'unavailable' }
  | { kind: 'failed'; message: string };

function isCancellation(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  const message = String((error as { message?: unknown })?.message ?? '');
  return (
    code === 'user-cancelled' ||
    code === 'E_USER_CANCELLED' ||
    /cancel/i.test(String(code ?? '')) ||
    /cancel/i.test(message)
  );
}

/** 결제창을 띄운다. 결과를 확인한 뒤 권한 상태까지 맞춰 놓는다. */
export async function buyExport(): Promise<PurchaseOutcome> {
  if (!(await connect())) return { kind: 'unavailable' };

  try {
    await requestPurchase({
      request: { google: { skus: [EXPORT_PRODUCT_ID] } },
      type: 'in-app',
    });
  } catch (error) {
    if (isCancellation(error)) return { kind: 'cancelled' };
    return { kind: 'failed', message: String((error as { message?: unknown })?.message ?? '') };
  }

  // requestPurchase가 돌려주는 값은 플랫폼마다 다르다. 구글 플레이에 다시 물어서
  // 실제로 샀는지 확인한다. 이게 화면에 보여 줄 상태의 유일한 근거다.
  try {
    const purchases = await readPurchases();
    const mine = ownsExport(purchases);
    if (mine) {
      await acknowledge(mine);
      await writeEntitlement({ owned: true, checkedAt: new Date().toISOString() });
      return { kind: 'owned' };
    }
    const waiting = purchases.some(
      (purchase) =>
        purchase.productId === EXPORT_PRODUCT_ID && purchase.purchaseState === 'pending',
    );
    return waiting ? { kind: 'pending' } : { kind: 'cancelled' };
  } catch {
    return { kind: 'failed', message: '구매는 됐지만 확인하지 못했습니다.' };
  }
}

/**
 * 다시 불러오기. 폰을 바꾸거나 앱을 지웠다 깐 경우에 쓴다.
 * 같은 구글 계정이면 구매 기록이 남아 있다.
 */
export async function restoreExport(): Promise<Entitlement | null> {
  return verifyEntitlement();
}
