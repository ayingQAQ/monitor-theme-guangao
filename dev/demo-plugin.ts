import { gzipSync } from "node:zlib";
import { WebSocketServer } from "ws";
import type { Plugin } from "vite";
import { demoNodes, demoHistory } from "./fixtures.ts";

// Imported only by Vite's development config, never by the application.
export function demoPlugin(): Plugin {
  return {
    name: "guangao-demo-fixtures",
    apply: "serve",
    configureServer(server) {
      const sockets = new WebSocketServer({ noServer: true });
      server.httpServer?.on("upgrade", (request, socket, head) => {
        const path = new URL(request.url || "/", "http://localhost");
        if (path.pathname !== "/api/ws") return;
        sockets.handleUpgrade(request, socket, head, (client) => {
          const send = () => {
            if (client.readyState !== 1) return;
            const frame = JSON.stringify({ admin: false, nodes: demoNodes });
            client.send(
              path.searchParams.has("gzip") ? gzipSync(frame) : frame,
            );
          };
          send();
          const timer = setInterval(send, 2000);
          client.on("close", () => clearInterval(timer));
        });
      });
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url || "/", "http://localhost").pathname;
        if (!path.startsWith("/api/")) return next();
        let data: unknown;
        if (path === "/api/me")
          data = {
            authed: false,
            github: false,
            site_name: "广 告 探 针",
            public_page: true,
            history_days: 7,
            demo: true,
          };
        else if (path === "/api/nodes")
          data = { admin: false, nodes: demoNodes };
        else if (path === "/api/themes/guangao-theme/config") data = {};
        else if (/^\/api\/nodes\/\d+\/metrics$/.test(path))
          data = demoHistory();
        else {
          response.statusCode = 404;
          response.end("演示接口不存在");
          return;
        }
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify(data));
      });
      server.httpServer?.on("close", () => sockets.close());
    },
  };
}
