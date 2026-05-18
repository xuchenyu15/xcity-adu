import request from './request';

// API: 地址预解析，获取所在城市和州 (用于触发定位动画)
export const geocodeAddress = (address: string): Promise<any> => {
  return request.get('/api/geocode', {
    params: { address }
  });
};

export const suggestAddress = (query: string, limit?: number): Promise<any> => {
  return request.get('/api/suggest', {
    params: { query, limit }
  });
};

// API: 根据地址获取地块信息 (包裹 axios 请求)
export const lookupAddress = (address: string, lang?: string): Promise<any> => {
  return request.post('/api/lookup', {
    address,
    lang
  });
};
