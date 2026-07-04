import http from 'http';
import url from 'url';
import { Request, RequestHandler } from 'express';
import { WebSocketServer } from 'ws';
import { AuthenticatedWebSocket } from './types';

export function initializeUpgradeHandler(
    server: http.Server,
    wss: WebSocketServer,
    sessionParser: RequestHandler
): void {
    server.on('upgrade', (request: Request, socket, head) => {
        const isDev = process.env.NODE_ENV !== 'production';

        if (isDev) {
            console.log('[WebSocket Upgrade] Received upgrade request.');
            console.log('[WebSocket Upgrade] Request Headers:', JSON.stringify(request.headers, null, 2));
            console.log(`[WebSocket Upgrade] Initial request.ip value: ${request.ip}`);
            console.log(`[WebSocket Upgrade] X-Real-IP Header: ${request.headers['x-real-ip']}`);
            console.log(`[WebSocket Upgrade] X-Forwarded-For Header: ${request.headers['x-forwarded-for']}`);
        }

        const parsedUrl = url.parse(request.url || '', true);
        const pathname = parsedUrl.pathname;

        let ipAddress: string | undefined;
        const xForwardedFor = request.headers['x-forwarded-for'];
        const xRealIp = request.headers['x-real-ip'];

        if (xForwardedFor) {
            const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0];
            ipAddress = ips?.trim();
            if (isDev) console.log(`[WebSocket Upgrade] Using first IP from X-Forwarded-For: ${ipAddress}`);
        } else if (xRealIp) {
            ipAddress = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp.trim();
            if (isDev) console.log(`[WebSocket Upgrade] Using IP from X-Real-IP: ${ipAddress}`);
        } else {
            ipAddress = request.socket.remoteAddress || request.ip;
            if (isDev) console.log(`[WebSocket Upgrade] Using fallback IP: ${ipAddress}`);
        }

        ipAddress = ipAddress || 'unknown';
        if (isDev) console.log(`[WebSocket Upgrade] Determined IP Address: ${ipAddress}`);
        
        console.log(`WebSocket: 升级请求来自 IP: ${ipAddress}, Path: ${pathname}`);

        try {
            sessionParser(request, {} as any, () => {
                if (!request.session || !request.session.userId) {
                    console.log(`WebSocket 认证失败 (Path: ${pathname})：未找到会话或用户未登录。`);
                    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                    socket.destroy();
                    return;
                }
                console.log(`WebSocket 认证成功 (Path: ${pathname})：用户 ${request.session.username} (ID: ${request.session.userId})`);

                if (pathname === '/rdp-proxy' || pathname === '/ws/rdp-proxy') {
                    wss.handleUpgrade(request, socket, head, (ws) => {
                        const extWs = ws as AuthenticatedWebSocket;
                        extWs.authenticated = true;
                        extWs.userId = request.session.userId;
                        extWs.username = request.session.username;
                        (request as any).clientIpAddress = ipAddress;
                        (request as any).isRdpProxy = true;
                        (request as any).rdpToken = parsedUrl.query.token;
                        (request as any).rdpWidth = parsedUrl.query.width;
                        (request as any).rdpHeight = parsedUrl.query.height;
                        (request as any).rdpDpi = parsedUrl.query.dpi;
                        wss.emit('connection', extWs, request);
                    });
                } else {
                    wss.handleUpgrade(request, socket, head, (ws) => {
                        const extWs = ws as AuthenticatedWebSocket;
                        extWs.authenticated = true;
                        extWs.userId = request.session.userId;
                        extWs.username = request.session.username;
                        (request as any).clientIpAddress = ipAddress;
                        (request as any).isRdpProxy = false;
                        wss.emit('connection', extWs, request);
                    });
                }
            });
        } catch (err) {
            console.error(`WebSocket upgrade error for ${pathname}:`, err);
            socket.destroy();
        }
    });
    console.log('WebSocket upgrade handler initialized.');
}