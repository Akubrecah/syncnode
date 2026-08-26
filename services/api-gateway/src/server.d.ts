import http from 'node:http';
import { Request } from 'express';
import { AuthJwtPayload } from '@syncnode/security';
declare const app: import("express-serve-static-core").Express;
declare const server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
export interface AuthenticatedRequest extends Request {
    user?: AuthJwtPayload;
}
export { app, server };
