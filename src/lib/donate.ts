// ECPay 一次性付款連結。請於 ECPay 商家後台將「ReturnURL / ClientBackURL」
// 設為 https://illusd.com/thanks，付款成功會自動跳轉到 /thanks。
//
// 若要更換實際金流連結，請設定環境變數：
//   VITE_ECPAY_DONATE_URL          — 全站贊助連結（側欄、文章頁通用）
//   VITE_ECPAY_ARTICLE_DONATE_URL  — 文章留言區專屬連結
//
// 兩者皆未設定時，使用以下 placeholder。
const FALLBACK = "https://payment.ecpay.com.tw/QuickCollect/PayData?id=REPLACE_ME";

export const DONATE_URL: string =
  (import.meta.env.VITE_ECPAY_DONATE_URL as string | undefined) ?? FALLBACK;

export const ARTICLE_DONATE_URL: string =
  (import.meta.env.VITE_ECPAY_ARTICLE_DONATE_URL as string | undefined) ??
  DONATE_URL;

/** 付款完成後 ECPay 應導回的網址。設定於 ECPay 商家後台。 */
export const DONATE_RETURN_URL = "https://illusd.com/thanks";
