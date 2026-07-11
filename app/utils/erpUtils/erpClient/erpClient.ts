const ERP_BASE = "https://alpha.clouderp.one";
const AUTH_HEADER = `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`;
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
    const res = await fetch(url, { headers: { Authorization: AUTH_HEADER } });
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

export async function checkItemStockAndPrice(
  itemName: string,
  requestedUom?: string,
): Promise<ItemLookupResult> {
  const searchUrl = new URL(`${ERP_BASE}/api/resource/Item`);
  searchUrl.searchParams.set(
    "filters",
    JSON.stringify([["item_name", "like", `%${itemName}%`]]),
  );
  searchUrl.searchParams.set(
    "fields",
    JSON.stringify([
      "name",
      "item_code",
      "item_name",
      "stock_uom",
      "item_group",
    ]),
  );
  searchUrl.searchParams.set("limit_page_length", "5");

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: AUTH_HEADER },
  });
  const searchData: { data?: ErpItemSearchResult[] } = await searchRes.json();

  console.log(
    `[ERP SEARCH] "${itemName}" ->`,
    JSON.stringify(searchData.data ?? searchData),
  );

  if (!searchData.data || searchData.data.length === 0) {
    return { found: false, message: `No item matching "${itemName}" found.` };
  }

  const results = await Promise.all(
    searchData.data.map(
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

        const [priceRes, fullItemRes, stockRes] = await Promise.all([
          fetch(priceUrl, { headers: { Authorization: AUTH_HEADER } }),
          fetch(fullItemUrl, { headers: { Authorization: AUTH_HEADER } }),
          fetch(stockUrl, { headers: { Authorization: AUTH_HEADER } }),
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
          const match = uomTable.find(
            (u) => u.uom.toLowerCase() === requestedUom.toLowerCase(),
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
          is_medicine: item.item_group === DISCOUNT_ELIGIBLE_GROUP,
        };
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
