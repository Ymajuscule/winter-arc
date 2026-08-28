export interface ShopPurchaseRequest {
  cosmeticId: string;
  currency: 'coins' | 'embers';
}

export interface ShopPurchaseResponse {
  cosmeticId: string;
  currencySpent: 'coins' | 'embers';
  amountSpent: number;
  remainingBalance: number;
}
