export function getPaymentDetailsText(): string {
  const accountName =
    process.env.PAYMENT_ACCOUNT_NAME || "Alpha Pharmacy and Stores";
  const accountNumber = process.env.PAYMENT_ACCOUNT_NUMBER || "12345";
  const bankName = process.env.PAYMENT_BANK_NAME || "Alpha Bank";
  return `Acc Name: ${accountName}\nAcc No: ${accountNumber}\nBank: ${bankName}`;
}
