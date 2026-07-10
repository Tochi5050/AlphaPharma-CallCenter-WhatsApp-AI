const ERP_BASE = "https://alpha.clouderp.one";
const AUTH_HEADER = `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`;
const WAREHOUSE = "Adeniyi Jones - APS";

export async function checkItemStockAndPrice(itemName: string) {
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
      "standard_rate",
      "stock_uom",
    ]),
  );
  searchUrl.searchParams.set("limit_page_length", "5");

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: AUTH_HEADER },
  });
  const searchData = await searchRes.json();

  if (!searchData.data || searchData.data.length === 0) {
    return { found: false, message: `No item matching "${itemName}" found.` };
  }

  const item = searchData.data[0];

  const stockUrl = new URL(
    `${ERP_BASE}/api/method/erpnext.stock.utils.get_stock_balance`,
  );
  stockUrl.searchParams.set("item_code", item.item_code);
  stockUrl.searchParams.set("warehouse", WAREHOUSE);

  const stockRes = await fetch(stockUrl, {
    headers: { Authorization: AUTH_HEADER },
  });
  const stockData = await stockRes.json();

  return {
    found: true,
    item_name: item.item_name,
    price: item.standard_rate,
    uom: item.stock_uom,
    stock_qty: stockData.message ?? 0,
    other_matches: searchData.data
      .slice(1)
      .map((i: { item_name: string }) => i.item_name),
  };
}

function toLocalFormat(waId: string): string {
  return waId.replace(/^234/, "0");
}

export async function lookupCustomerName(
  waId: string,
): Promise<string | undefined> {
  const localPhone = toLocalFormat(waId);

  const url = new URL(`${ERP_BASE}/api/resource/Customer`);
  url.searchParams.set(
    "filters",
    JSON.stringify([["mobile_no", "=", localPhone]]),
  );
  url.searchParams.set("fields", JSON.stringify(["customer_name"]));
  url.searchParams.set("limit_page_length", "1");

  try {
    const res = await fetch(url, { headers: { Authorization: AUTH_HEADER } });
    const data = await res.json();
    return data.data?.[0]?.customer_name;
  } catch (err) {
    console.error("Customer lookup failed:", err);
    return undefined;
  }
}
