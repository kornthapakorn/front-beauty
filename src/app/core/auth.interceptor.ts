import { HttpInterceptorFn } from '@angular/common/http';

// Attach Authorization header from storage if available
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const ss = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('auth_token') : null;
  const token = ls || ss;

  if (token && !req.headers.has('Authorization')) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};

