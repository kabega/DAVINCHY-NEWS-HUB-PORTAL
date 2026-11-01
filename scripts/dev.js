import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const viteCli = resolve(projectRoot, "node_modules/vite/bin/vite.js");
const preferredPort = Number(process.env.API_PORT || 5175);

function isPortAvailable(port) {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        resolvePort(false);
        return;
      }
      reject(error);
    });
    server.listen(port, "0.0.0.0", () => {
      server.close((error) => {
        if (error) reject(error);
        else resolvePort(true);
      });
    });
  });
}

async function findAvailablePort() {
  for (let port = preferredPort; port < preferredPort + 100 && port <= 65535; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available API port found starting at ${preferredPort}.`);
}

function startProcess(name, args, env) {
  const child = spawn(process.execPath, args, { cwd: projectRoot, env, stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => {
      const lines = chunk.toString().trimEnd().split(/\r?\n/);
      for (const line of lines) console.log(`[${name}] ${line}`);
    });
  }
  return child;
}

try {
  const apiPort = await findAvailablePort();
  const env = { ...process.env, API_PORT: String(apiPort) };
  delete env.PORT;
  console.log(`[dev] API will use port ${apiPort}.`);

  const api = startProcess("api", [resolve(projectRoot, "server/index.js")], env);
  const web = startProcess("web", [viteCli, "--host", "127.0.0.1"], env);
  const children = [api, web];
  let stopping = false;

  function stop(exitCode) {
    if (stopping) return;
    stopping = true;
    process.exitCode = exitCode;
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill();
    }
  }

  for (const child of children) {
    child.once("error", (error) => {
      console.error(`[dev] Failed to start process: ${error.message}`);
      stop(1);
    });
    child.once("exit", (code, signal) => {
      if (!stopping) {
        const exitCode = code ?? (signal ? 1 : 0);
        stop(exitCode);
      }
    });
  }

  process.once("SIGINT", () => stop(130));
  process.once("SIGTERM", () => stop(143));
} catch (error) {
  console.error(`[dev] ${error.message}`);
  process.exitCode = 1;
}
