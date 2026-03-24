import { HttpInterceptorFn } from '@angular/common/http';

const backendPort = (window as any).electronAPI?.backendPort as number | undefined;
const backendOrigin = backendPort ? `http://localhost:${backendPort}` : '';

export const electronApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (backendOrigin && req.url.startsWith('/')) {
    return next(req.clone({ url: `${backendOrigin}${req.url}` }));
  }
  return next(req);
};
