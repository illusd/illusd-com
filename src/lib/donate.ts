// Ko-fi 贊助設定
// 站內 /donate 頁面會嵌入 Ko-fi 並監聽 postMessage 事件，
// 偵測到贊助完成後自動導向 /thanks。
//
// 如需更換 Ko-fi 帳號，設定環境變數 VITE_KOFI_USERNAME。

export const KOFI_USERNAME: string =
  (import.meta.env.VITE_KOFI_USERNAME as string | undefined) ?? "illusd";

export const KOFI_URL = `https://ko-fi.com/${KOFI_USERNAME}`;

export const KOFI_EMBED_URL = `https://ko-fi.com/${KOFI_USERNAME}/?hidefeed=true&widget=true&embed=true&preview=true`;

/** 站內贊助頁面（嵌入 Ko-fi 並自動偵測成功） */
export const DONATE_PATH = "/donate" as const;

/** 付款完成後自動導向頁面。 */
export const DONATE_RETURN_PATH = "/thanks" as const;
