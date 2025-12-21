import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createConnection, type Socket } from 'node:net';

type StartLocalSshTunnelParams = {
  readonly bastionHost: string;
  readonly bastionPort: number;
  readonly bastionUsername: string;
  readonly privateKeyPath: string;
  readonly localPort: number;
  readonly remoteHost: string;
  readonly remotePort: number;
  readonly connectTimeoutMs: number;
  readonly readyTimeoutMs: number;
};

/**
 * Manages an SSH local port-forwarding tunnel using the system `ssh` binary.
 * This is intentionally used instead of an SSH library to avoid adding runtime dependencies.
 */
export class LocalSshTunnel {
  private sshProcess: ChildProcessWithoutNullStreams | null = null;
  private readonly sockets: Set<Socket> = new Set<Socket>();
  private readonly maxStderrLength: number = 8_000;

  /**
   * Starts a local port-forward SSH tunnel and waits until the local port is reachable.
   */
  public async startTunnel(params: StartLocalSshTunnelParams): Promise<void> {
    if (this.sshProcess) {
      return;
    }
    const args: readonly string[] = this.buildSshArgs(params);
    const sshProcess: ChildProcessWithoutNullStreams = spawn('ssh', args, {
      stdio: 'pipe',
    });
    this.sshProcess = sshProcess;
    sshProcess.stdout.on('data', () => undefined);
    let stderrSnapshot: string = '';
    sshProcess.stderr.on('data', (chunk: Buffer) => {
      stderrSnapshot = `${stderrSnapshot}${chunk.toString('utf8')}`;
      if (stderrSnapshot.length > this.maxStderrLength) {
        stderrSnapshot = stderrSnapshot.slice(
          stderrSnapshot.length - this.maxStderrLength,
        );
      }
    });
    const exitPromise: Promise<void> = new Promise((resolve, reject) => {
      sshProcess.once('error', (err: Error) => reject(err));
      sshProcess.once('exit', (code: number | null, signal: string | null) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(
          new Error(
            `SSH tunnel process exited unexpectedly (code=${code ?? 'null'}, signal=${signal ?? 'null'}). stderr="${stderrSnapshot.trim()}"`,
          ),
        );
      });
    });
    try {
      await Promise.race([
        this.waitForLocalPort({
          localPort: params.localPort,
          readyTimeoutMs: params.readyTimeoutMs,
        }),
        exitPromise,
      ]);
    } catch (err: unknown) {
      await this.stopTunnel();
      throw err;
    }
  }

  /**
   * Stops the SSH tunnel process.
   */
  public async stopTunnel(): Promise<void> {
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets.clear();
    if (!this.sshProcess) {
      return;
    }
    const sshProcess: ChildProcessWithoutNullStreams = this.sshProcess;
    this.sshProcess = null;
    await new Promise<void>((resolve) => {
      sshProcess.once('exit', () => resolve());
      sshProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!sshProcess.killed) {
          sshProcess.kill('SIGKILL');
        }
      }, 2_000).unref();
    });
  }

  private buildSshArgs(params: StartLocalSshTunnelParams): readonly string[] {
    const connectTimeoutSeconds: number = Math.max(
      1,
      Math.ceil(params.connectTimeoutMs / 1000),
    );
    return [
      '-N',
      '-T',
      '-p',
      String(params.bastionPort),
      '-i',
      params.privateKeyPath,
      '-o',
      'BatchMode=yes',
      '-o',
      'ExitOnForwardFailure=yes',
      '-o',
      `ConnectTimeout=${connectTimeoutSeconds}`,
      '-o',
      'ServerAliveInterval=30',
      '-o',
      'ServerAliveCountMax=3',
      '-o',
      'StrictHostKeyChecking=accept-new',
      '-L',
      `${params.localPort}:${params.remoteHost}:${params.remotePort}`,
      `${params.bastionUsername}@${params.bastionHost}`,
    ] as const;
  }

  private async waitForLocalPort(params: {
    readonly localPort: number;
    readonly readyTimeoutMs: number;
  }): Promise<void> {
    const deadlineAt: number = Date.now() + params.readyTimeoutMs;
    while (Date.now() < deadlineAt) {
      const isReady: boolean = await this.checkTcpConnectable({
        localPort: params.localPort,
      });
      if (isReady) {
        return;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(
      `SSH tunnel did not become ready within ${params.readyTimeoutMs}ms.`,
    );
  }

  private async checkTcpConnectable(params: {
    readonly localPort: number;
  }): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      const socket: Socket = createConnection({
        host: '127.0.0.1',
        port: params.localPort,
      });
      this.sockets.add(socket);
      const finalize = (result: boolean): void => {
        this.sockets.delete(socket);
        socket.destroy();
        resolve(result);
      };
      socket.once('connect', () => finalize(true));
      socket.once('error', () => finalize(false));
      socket.setTimeout(500, () => finalize(false));
    });
  }
}
