import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const TOKEN_KEY = 'auth_token';

const hasToken = (): boolean => {
  if (typeof window === 'undefined') return false;
  const local = window.localStorage?.getItem(TOKEN_KEY) ?? null;
  const session = window.sessionStorage?.getItem(TOKEN_KEY) ?? null;
  return !!(local || session);
};

export const authGuard: CanActivateFn = (_route, state) => {
  if (hasToken()) return true;
  const router = inject(Router);
  return router.createUrlTree(['/Login'], {
    queryParams: state.url && state.url !== '/Login' ? { returnUrl: state.url } : undefined,
  });
};
