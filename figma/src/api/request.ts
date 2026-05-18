import axios from 'axios';

// 统一的响应结构
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  msg: string;
}

const request = axios.create({
  // Vite 会根据当前环境（dev 或 build）自动加载对应的 .env 文件
  // 开发环境会读 .env.development 里的绝对路径
  // 生产环境会读 .env.production 里的空字符串（即相对路径）
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 600000), // 默认 10 分钟，支持通过环境变量覆盖
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 全局 JWT 处理
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data;
    
    // 兼容处理：如果后端返回了标准的 {code, data, msg} 结构
    if (res && res.code !== undefined) {
      if (res.code === 200 || res.code === 0) {
        return res.data;
      }
      
      // 统一错误处理 (例如 Toast 提示等)
      console.error(`API Error: ${res.msg}`);
      return Promise.reject(new Error(res.msg || 'API Request Error'));
    }
    
    // 如果后端还未更新为 {code, data, msg} 格式，直接返回 data 兼容现有逻辑
    return res;
  },
  (error) => {
    // HTTP 状态码统一错误处理
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        // 处理 Token 过期或未授权
        localStorage.removeItem('token');
        // window.location.href = '/login'; // 需要的话可以做跳转
        console.error('未授权或Token已过期，请重新登录');
      } else {
        console.error(`请求失败: ${status}`);
      }
    } else {
      console.error('网络请求异常');
    }
    
    return Promise.reject(error);
  }
);

export default request;
