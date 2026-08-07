import { normalizeUom } from "../../normalizeUom/normalizeUom";
import { erpFetch } from "./erpAuth";

const ERP_BASE = "https://alpha.clouderp.one";
//const AUTH_HEADER = `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`;
const WAREHOUSE = "Adeniyi Jones - APS";
const PRICE_LIST = "Standard Selling";
const DISCOUNT_ELIGIBLE_GROUP = "Medicines & Pharmaceuticals";

type CustomerInfo = {
  customerName?: string;
  discountPercentage: number;
};

export type ItemBrandMatch = {
  item_name: string;
  item_code: string;
  uom: string;
  price: number;
  base_price: number;
  base_uom: string;
  available_uoms: string[];
  stock_qty: number;
  is_medicine: boolean;
  is_controlled: boolean;
  discount_applied?: boolean;
};

export type ItemLookupResult =
  | { found: false; message: string }
  | { found: true; matches: ItemBrandMatch[] };

// export type ItemLookupResult =
//   | { found: false; message: string }
//   | { found: true; item_name: string; error: string }
//   | {
//       found: true;
//       item_name: string;
//       uom: string;
//       price: number;
//       base_price: number;
//       base_uom: string;
//       available_uoms: string[];
//       stock_qty: number;
//       is_medicine: boolean;
//     };

const DISCOUNT_ELIGIBLE_GROUPS = [
  "MEDICINE AND TREATMENT (PRESCRI",
  "MEDICINE AND TREATMENT (OTC)",
  "VITAMIN AND SUPPLEMENTS",
  "SUPPLEMENTS",
];

const CONTROLLED_SUBSTANCE_GROUP = "CONTROLLED SUBSTANCES";

export async function lookupCustomerByPhone(
  waId: string,
): Promise<CustomerInfo> {
  const localPhone = waId.replace(/^234/, "0");
  const url = new URL(`${ERP_BASE}/api/resource/Customer`);
  url.searchParams.set(
    "filters",
    JSON.stringify([["mobile_no", "=", localPhone]]),
  );
  url.searchParams.set("fields", JSON.stringify(["customer_name", "discount"]));
  url.searchParams.set("limit_page_length", "1");

  try {
    //const res = await fetch(url, { headers: { Authorization: AUTH_HEADER } });
    const res = await erpFetch(url.toString());
    const data = await res.json();
    const record = data.data?.[0];
    return {
      customerName: record?.customer_name,
      discountPercentage: record?.discount ?? 0,
    };
  } catch (err) {
    console.error("Customer lookup failed:", err);
    return { discountPercentage: 0 };
  }
}

interface ErpItemSearchResult {
  name: string;
  item_code: string;
  item_name: string;
  stock_uom: string;
  item_group: string;
}

interface ErpItemSearchResult {
  name: string;
  item_code: string;
  item_name: string;
  stock_uom: string;
  item_group: string;
}

function normalizeStrengthSpacing(text: string): string {
  return text.replace(/(\d)\s+(mg|mcg|ml|g)\b/gi, "$1$2");
}

async function searchWithSpacingVariants(
  itemName: string,
): Promise<ErpItemSearchResult[]> {
  const spaced = itemName.replace(/(\d)(mg|mcg|ml|g)\b/gi, "$1 $2");
  const unspaced = normalizeStrengthSpacing(itemName);
  const allSpacesRemoved = itemName.replace(/\s+/g, "");

  const variants = [...new Set([itemName, spaced, unspaced, allSpacesRemoved])];

  const directResults = await Promise.all(
    variants.map((v) => searchOneVariant(v)),
  );
  const seen = new Map<string, ErpItemSearchResult>();
  for (const list of directResults)
    for (const item of list) seen.set(item.item_code, item);

  // Fallback: if nothing found, try a word-AND search — each word must appear
  // somewhere in item_name, regardless of spacing/adjacency between them
  if (seen.size === 0) {
    const words = itemName.split(/\s+/).filter((w) => w.length > 2); // skip trivial short words
    if (words.length > 1) {
      const url = new URL(`${ERP_BASE}/api/resource/Item`);
      url.searchParams.set(
        "filters",
        JSON.stringify(words.map((w) => ["item_name", "like", `%${w}%`])),
      );
      url.searchParams.set(
        "fields",
        JSON.stringify([
          "name",
          "item_code",
          "item_name",
          "stock_uom",
          "item_group",
        ]),
      );
      url.searchParams.set("limit_page_length", "30");
      const res = await erpFetch(url.toString());
      const data = await res.json();
      for (const item of data.data ?? []) seen.set(item.item_code, item);
    }
  }

  return Array.from(seen.values());
}

async function searchOneVariant(
  variant: string,
): Promise<ErpItemSearchResult[]> {
  const url = new URL(`${ERP_BASE}/api/resource/Item`);
  url.searchParams.set(
    "filters",
    JSON.stringify([["item_name", "like", `%${variant}%`]]),
  );
  url.searchParams.set(
    "fields",
    JSON.stringify([
      "name",
      "item_code",
      "item_name",
      "stock_uom",
      "item_group",
    ]),
  );
  url.searchParams.set("limit_page_length", "30");
  const res = await erpFetch(url.toString());
  const data: {
    data?: ErpItemSearchResult[];
    exc_type?: string;
    exception?: string;
  } = await res.json();
  if (data.exc_type || data.exception) {
    console.error(
      `[ERP AUTH/SYSTEM ERROR] variant "${variant}" ->`,
      JSON.stringify(data),
    );
    throw new Error(`ERP request failed: ${data.exc_type ?? "unknown error"}`);
  }
  return data.data ?? [];
}
export async function checkItemStockAndPrice(
  itemName: string,
  requestedUom?: string,
): Promise<ItemLookupResult> {
  // const searchUrl = new URL(`${ERP_BASE}/api/resource/Item`);
  // searchUrl.searchParams.set(
  //   "filters",
  //   JSON.stringify([["item_name", "like", `%${itemName}%`]]),
  // );
  // searchUrl.searchParams.set(
  //   "fields",
  //   JSON.stringify([
  //     "name",
  //     "item_code",
  //     "item_name",
  //     "stock_uom",
  //     "item_group",
  //   ]),
  // );
  // searchUrl.searchParams.set("limit_page_length", "30");

  // // const searchRes = await fetch(searchUrl, {
  // //   headers: { Authorization: AUTH_HEADER },
  // // });
  // const searchRes = await erpFetch(searchUrl.toString());
  // const searchData: {
  //   data?: ErpItemSearchResult[];
  //   exc_type?: string;
  //   exception?: string;
  // } = await searchRes.json();
  // if (searchData.exc_type || searchData.exception) {
  //   console.error(
  //     `[ERP AUTH/SYSTEM ERROR] "${itemName}" ->`,
  //     JSON.stringify(searchData),
  //   );
  //   throw new Error(
  //     `ERP request failed: ${searchData.exc_type ?? "unknown error"}`,
  //   );
  // }
  // console.log(
  //   `[ERP SEARCH] "${itemName}" ->`,
  //   JSON.stringify(searchData.data ?? searchData),
  // );

  // if (!searchData.data || searchData.data.length === 0) {
  //   return { found: false, message: `No item matching "${itemName}" found.` };
  // }

  const searchResults = await searchWithSpacingVariants(itemName);

  console.log(`[ERP SEARCH] "${itemName}" ->`, JSON.stringify(searchResults));

  if (searchResults.length === 0) {
    return { found: false, message: `No item matching "${itemName}" found.` };
  }

  const results = await Promise.all(
    searchResults.map(
      async (item: ErpItemSearchResult): Promise<ItemBrandMatch | null> => {
        const baseUom = item.stock_uom;

        const priceUrl = new URL(`${ERP_BASE}/api/resource/Item Price`);
        priceUrl.searchParams.set(
          "filters",
          JSON.stringify([
            ["item_code", "=", item.item_code],
            ["price_list", "=", PRICE_LIST],
            ["selling", "=", 1],
            ["uom", "=", baseUom],
          ]),
        );
        priceUrl.searchParams.set(
          "fields",
          JSON.stringify(["price_list_rate"]),
        );
        priceUrl.searchParams.set("limit_page_length", "1");

        const fullItemUrl = `${ERP_BASE}/api/resource/Item/${item.item_code}`;

        const stockUrl = new URL(
          `${ERP_BASE}/api/method/erpnext.stock.utils.get_stock_balance`,
        );
        stockUrl.searchParams.set("item_code", item.item_code);
        stockUrl.searchParams.set("warehouse", WAREHOUSE);

        // const [priceRes, fullItemRes, stockRes] = await Promise.all([
        //   fetch(priceUrl, { headers: { Authorization: AUTH_HEADER } }),
        //   fetch(fullItemUrl, { headers: { Authorization: AUTH_HEADER } }),
        //   fetch(stockUrl, { headers: { Authorization: AUTH_HEADER } }),
        // ]);
        try {
          const [priceRes, fullItemRes, stockRes] = await Promise.all([
            erpFetch(priceUrl.toString()),
            erpFetch(fullItemUrl),
            erpFetch(stockUrl.toString()),
          ]);

          const priceData: { data?: Array<{ price_list_rate: number }> } =
            await priceRes.json();
          const fullItem: {
            data?: { uoms?: Array<{ uom: string; conversion_factor: number }> };
          } = await fullItemRes.json();
          const stockData: { message?: number } = await stockRes.json();

          const baseRate = priceData.data?.[0]?.price_list_rate;

          console.log(
            `[ERP PRICE] ${item.item_code} (uom: ${baseUom}) ->`,
            JSON.stringify(priceData.data ?? priceData),
          );

          if (baseRate === undefined) {
            console.log(
              `[ERP SKIP] ${item.item_code} skipped - no matching Item Price entry`,
            );
            return null;
          }

          const uomTable: Array<{ uom: string; conversion_factor: number }> =
            fullItem.data?.uoms ?? [];

          let finalUom = baseUom;
          let quantityMultiplier = 1;

          if (requestedUom) {
            const candidates = normalizeUom(requestedUom);
            const match = uomTable.find((u) =>
              candidates.includes(u.uom.toLowerCase()),
            );
            if (match) {
              finalUom = match.uom;
              quantityMultiplier = match.conversion_factor;
            }
          }

          return {
            item_name: item.item_name,
            item_code: item.item_code,
            uom: finalUom,
            price: baseRate * quantityMultiplier,
            base_price: baseRate,
            base_uom: baseUom,
            available_uoms: uomTable.map((u) => u.uom),
            stock_qty: stockData.message ?? 0,
            is_medicine: DISCOUNT_ELIGIBLE_GROUPS.includes(item.item_group),
            is_controlled: item.item_group === CONTROLLED_SUBSTANCE_GROUP,
          };
        } catch (err) {
          console.error(
            `[ERP ERROR] ${item.item_code} failed unexpectedly:`,
            err,
          );
          return null;
        }
      },
    ),
  );

  const matches = results.filter((m): m is ItemBrandMatch => m !== null);

  console.log(
    `[ERP RESULT] "${itemName}" -> ${matches.length} sellable match(es)`,
  );

  if (matches.length === 0) {
    return {
      found: false,
      message: `"${itemName}" was found but has no active selling price.`,
    };
  }

  matches.sort((a, b) => b.price - a.price);

  return { found: true, matches };
}

export function applyDiscount(
  price: number,
  discountPercentage: number,
  isMedicine: boolean,
): number {
  if (!isMedicine || discountPercentage <= 0) return price;
  return price * (1 - discountPercentage / 100);
}
