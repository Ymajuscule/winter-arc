export interface OpenChestRequest {
  chestId: string;
}

export interface OpenChestRolledItem {
  cosmeticId: string;
  isDuplicate: boolean;
  fragmentsAwarded?: number;
}

export interface OpenChestResponse {
  items: OpenChestRolledItem[];
}
