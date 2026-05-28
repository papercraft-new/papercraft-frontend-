// lib/api.ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// ── REQUEST INTERCEPTOR ───────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('papercraft-auth');
      if (stored) {
        const { state } = JSON.parse(stored);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

// ── RESPONSE INTERCEPTOR ──────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string; upgradeRequired?: boolean }>) => {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.response?.data?.message;

    if (status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('papercraft-auth');
        window.location.href = '/auth/login?expired=1';
      }
      return Promise.reject(error);
    }

    if (status === 429) {
      const upgradeRequired = error.response?.data?.upgradeRequired;
      toast.error(
        upgradeRequired
          ? '📦 Plan limit reached. Upgrade to continue!'
          : message || 'Too many requests. Please slow down.',
        { duration: 5000 }
      );
      return Promise.reject(error);
    }

    if (status === 403) {
      toast.error(message || 'You do not have permission to do this.');
    }

    if (status && status >= 500) {
      toast.error('Server error. Please try again in a moment.');
    }

    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────
// AUTH API
// ─────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    apiClient.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),

  googleLogin: (googleToken: string) =>
    apiClient.post('/auth/google', { googleToken }),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, email: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, email, newPassword }),

  getMe: () => apiClient.get('/auth/me'),

  logout: () => apiClient.post('/auth/logout'),
};

// ─────────────────────────────────────────
// PAPERS API
// ─────────────────────────────────────────

export const papersApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiClient.get('/papers', { params }),

  get: (id: string) => apiClient.get(`/papers/${id}`),
  getById: (id: string) =>
  apiClient.get(`/papers/${id}`),

  create: (data: object) => apiClient.post('/papers', data),

  update: (id: string, data: object) => apiClient.put(`/papers/${id}`, data),

  delete: (id: string) => apiClient.delete(`/papers/${id}`),

  duplicate: (id: string) => apiClient.post(`/papers/${id}/duplicate`),

  exportDocx: (id: string, templateKey?: string) =>
    apiClient.post(
      `/papers/${id}/export/docx`,
      { templateKey },
      { responseType: 'blob' }
    ),

  getVersions: (id: string) => apiClient.get(`/papers/${id}/versions`),
  
};

// ─────────────────────────────────────────
// OCR API
// ─────────────────────────────────────────

export const ocrApi = {
  uploadFile: (file: File, paperId?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (paperId) fd.append('paperId', paperId);
    return apiClient.post('/ocr/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },

  // ← NEW: send multiple files to /ocr/upload-multiple
  uploadMultipleFiles: (files: File[], paperId?: string) => {
    const fd = new FormData();
    files.forEach((file) => fd.append('files', file)); // key must be 'files'
    if (paperId) fd.append('paperId', paperId);
    return apiClient.post('/ocr/upload-multiple', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000, // 3 min — multiple files take longer
    });
  },

  processText: (text: string, paperId?: string) =>
    apiClient.post('/ocr/text', { text, paperId }),

  getJob: (jobId: string) => apiClient.get(`/ocr/${jobId}`),

  getHistory: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/ocr', { params }),
};

// ─────────────────────────────────────────
// TEMPLATES API
// ─────────────────────────────────────────

export const templatesApi = {
  list: () => apiClient.get('/templates'),
  get: (id: string) => apiClient.get(`/templates/${id}`),
  create: (data: object) => apiClient.post('/templates', data),
  update: (id: string, data: object) => apiClient.put(`/templates/${id}`, data),
  delete: (id: string) => apiClient.delete(`/templates/${id}`),
};

// ─────────────────────────────────────────
// AI API
// ─────────────────────────────────────────

export const aiApi = {
  chat: (message: string, history?: object[], paperId?: string) =>
    apiClient.post('/ai/chat', { message, history, paperId }),

  generateQuestions: (params: {
    subject: string;
    topic: string;
    count: number;
    type: string;
    difficulty?: string;
    class?: string;
    marks?: number;
  }) => apiClient.post('/ai/generate-questions', params),

  enhancePaper: (paperId: string) =>
    apiClient.post('/ai/enhance', { paperId }),

  bloomTag: (questions: { id: string; text: string }[]) =>
    apiClient.post('/ai/bloom-tag', { questions }),
};

// ─────────────────────────────────────────
// PAYMENTS API
// ─────────────────────────────────────────

export const paymentsApi = {
  getPlans: () => apiClient.get('/payments/plans'),
  createOrder: (planId: string) => apiClient.post('/payments/create-order', { planId }),
  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planId: string;
  }) => apiClient.post('/payments/verify', data),
  getHistory: () => apiClient.get('/payments/history'),
};

// ─────────────────────────────────────────
// ADMIN API
// ─────────────────────────────────────────

export const adminApi = {
  getStats: () => apiClient.get('/admin/stats'),
  getUsers: (params?: { page?: number; search?: string }) =>
    apiClient.get('/admin/users', { params }),
  toggleUserActive: (id: string) => apiClient.patch(`/admin/users/${id}/toggle-active`),
  getActivity: () => apiClient.get('/admin/activity'),
  getOcrStats: () => apiClient.get('/admin/ocr-stats'),
};

// ─────────────────────────────────────────
// DOWNLOAD HELPER
// ─────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
export const otpApi = {
  send: (email: string) =>
    apiClient.post('/otp/send', { email }),

  verify: (email: string, otp: string) =>
    apiClient.post('/otp/verify', { email, otp }),

  resend: (email: string) =>
    apiClient.post('/otp/resend', { email }),
};