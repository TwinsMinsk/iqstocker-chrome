/**
 * API методы для работы с промокодами
 */
import api from './client';

export interface RedeemPromoRequest {
  code: string;
}

export interface RedeemPromoResponse {
  success: boolean;
  credits_added: number;
  message: string;
}

export const promoAPI = {
  /**
   * Активировать промокод
   */
  async redeemPromo(data: RedeemPromoRequest): Promise<RedeemPromoResponse> {
    const response = await api.post<RedeemPromoResponse>('/promo/redeem', data);
    return response.data;
  },
};

