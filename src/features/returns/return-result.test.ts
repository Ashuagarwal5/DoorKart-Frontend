import { describe, expect, it } from 'vitest';
import { ApiError } from '@/services/api/api-error';
import { isReturnResultUnknown } from './return-result';

describe('manual cash recording retry policy', () => {
  it.each(['NETWORK_ERROR','TIMEOUT','BAD_RESPONSE','SERVER_ERROR'])('keeps the exact payout intent after %s', code => {
    expect(isReturnResultUnknown(new ApiError(code,'failed'))).toBe(true);
  });
  it('treats an unfamiliar server failure as an unknown outcome', () => {
    expect(isReturnResultUnknown(new ApiError('INTERNAL_ERROR','failed',{status:500}))).toBe(true);
  });
  it.each([['VALIDATION_ERROR',400],['UNAUTHENTICATED',401],['FORBIDDEN',403],['RETURN_CONFLICT',409],['REFUND_LIMIT_EXCEEDED',422]] as const)('allows corrections after definite refusal %s', (code,status) => {
    expect(isReturnResultUnknown(new ApiError(code,'refused',{status}))).toBe(false);
  });
});
