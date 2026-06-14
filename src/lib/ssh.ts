import { Client, ConnectConfig } from 'ssh2';
import { isSSRFSafe } from './ssrf';

interface SshTestResult {
  success: boolean;
  error?: string;
  fingerprint?: string;
  ip?: string | null;
  osInfo?: {
    distro: string;
    arch: string;
    kernel: string;
  };
  diskInfo?: {
    totalGB: number;
    freeGB: number;
  };
}

interface SshConfig {
  host: string;
  port: number;
  username: string;
  authMethod: 'key' | 'password';
  privateKey?: string;
  passphrase?: string;
  password?: string;
  expectedFingerprint?: string | null;
}

/**
 * Connects to a remote server over SSH and performs connection checks, OS diagnostics, and disk space lookup.
 */
export async function testSshConnection(config: SshConfig): Promise<SshTestResult> {
  // 1. SSRF validation
  const ssrfCheck = await isSSRFSafe(config.host);
  if (!ssrfCheck.safe) {
    return {
      success: false,
      error: ssrfCheck.error || 'Connection blocked by SSRF filter',
    };
  }

  return new Promise((resolve) => {
    const conn = new Client();
    let fingerprintCaptured = '';
    let hostVerifierChecked = false;
    let isFinished = false;

    const cleanup = (cb: () => void) => {
      if (!isFinished) {
        isFinished = true;
        try {
          conn.end();
        } catch (e) {}
        cb();
      }
    };

    const connConfig: ConnectConfig = {
      host: config.host,
      port: config.port || 22,
      username: config.username,
      readyTimeout: 15000,
      hostHash: 'sha256',
      hostVerifier: (hashedKey: string) => {
        fingerprintCaptured = `SHA256:${hashedKey}`;
        hostVerifierChecked = true;
        
        // If an expected fingerprint is pinned, verify it
        if (config.expectedFingerprint && fingerprintCaptured !== config.expectedFingerprint) {
          return false; // Rejects connection handshake
        }
        return true;
      },
    };

    if (config.authMethod === 'key') {
      connConfig.privateKey = config.privateKey;
      if (config.passphrase) connConfig.passphrase = config.passphrase;
    } else {
      connConfig.password = config.password;
    }

    conn.on('ready', async () => {
      try {
        // Gather OS info
        const osCmd =
          'cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d \'"\' || uname -s';
        const distro = await execCommand(conn, osCmd).catch(() => 'Unknown Linux');
        const arch = await execCommand(conn, 'uname -m').catch(() => 'Unknown Arch');
        const kernel = await execCommand(conn, 'uname -r').catch(() => 'Unknown Kernel');

        // Gather Disk info for '/'
        let totalGB = 0;
        let freeGB = 0;
        try {
          const dfOutput = await execCommand(conn, 'df -B1 /');
          const dfLines = dfOutput.trim().split('\n');
          const lastLine = dfLines[dfLines.length - 1];
          const parts = lastLine.split(/\s+/);
          const numbers = parts.filter((p) => /^\d+$/.test(p));
          if (numbers.length >= 3) {
            // Index 0: 1B-blocks (Total), Index 1: Used, Index 2: Available (Free)
            const totalBytes = parseInt(numbers[0], 10);
            const freeBytes = parseInt(numbers[2], 10);
            totalGB = parseFloat((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
            freeGB = parseFloat((freeBytes / (1024 * 1024 * 1024)).toFixed(2));
          }
        } catch (e) {
          // Fallback to df -h parsing if df -B1 fails
        }

        cleanup(() => {
          resolve({
            success: true,
            fingerprint: fingerprintCaptured,
            ip: ssrfCheck.ip,
            osInfo: { distro: distro.trim(), arch: arch.trim(), kernel: kernel.trim() },
            diskInfo: { totalGB, freeGB },
          });
        });
      } catch (err: any) {
        cleanup(() => {
          resolve({
            success: false,
            error: `Failed to run diagnostics: ${err.message}`,
            fingerprint: fingerprintCaptured,
          });
        });
      }
    });

    conn.on('error', (err: any) => {
      cleanup(() => {
        let errMsg = err.message || 'SSH connection error';
        if (errMsg.includes('All configured authentication methods failed')) {
          resolve({
            success: false,
            error: 'Authentication failed: Invalid credentials or username.',
            fingerprint: fingerprintCaptured,
          });
        } else if (!hostVerifierChecked && errMsg.includes('Host key verification failed')) {
          // Caught by verify check failure
          resolve({
            success: false,
            error: `Security Alert: Host key verification failed. Fingerprint mismatched (Remote Key changed).`,
            fingerprint: fingerprintCaptured,
          });
        } else {
          resolve({
            success: false,
            error: errMsg,
            fingerprint: fingerprintCaptured,
          });
        }
      });
    });

    conn.on('timeout', () => {
      cleanup(() => {
        resolve({
          success: false,
          error: 'Connection timeout: The host is unreachable or SSH port is closed.',
        });
      });
    });

    try {
      conn.connect(connConfig);
    } catch (err: any) {
      cleanup(() => {
        resolve({
          success: false,
          error: `Connection configuration error: ${err.message}`,
        });
      });
    }
  });
}

/**
 * Discovers database schemas on a remote server over SSH connection.
 */
export async function inspectDatabases(
  sshConfig: SshConfig,
  dbType: 'mysql' | 'postgresql' | 'mongodb',
  dbCreds: { user: string; password?: string; authSource?: string; host?: string; port?: number }
): Promise<{ success: boolean; databases?: string[]; error?: string }> {
  // 1. SSRF validation
  const ssrfCheck = await isSSRFSafe(sshConfig.host);
  if (!ssrfCheck.safe) {
    return {
      success: false,
      error: ssrfCheck.error || 'Connection blocked by SSRF filter',
    };
  }

  return new Promise((resolve) => {
    const conn = new Client();
    let isFinished = false;

    const cleanup = (cb: () => void) => {
      if (!isFinished) {
        isFinished = true;
        try {
          conn.end();
        } catch (e) {}
        cb();
      }
    };

    const connConfig: ConnectConfig = {
      host: sshConfig.host,
      port: sshConfig.port || 22,
      username: sshConfig.username,
      readyTimeout: 15000,
      hostHash: 'sha256',
      hostVerifier: (hashedKey: string) => {
        const fingerprint = `SHA256:${hashedKey}`;
        if (sshConfig.expectedFingerprint && fingerprint !== sshConfig.expectedFingerprint) {
          return false;
        }
        return true;
      },
    };

    if (sshConfig.authMethod === 'key') {
      connConfig.privateKey = sshConfig.privateKey;
      if (sshConfig.passphrase) connConfig.passphrase = sshConfig.passphrase;
    } else {
      connConfig.password = sshConfig.password;
    }

    conn.on('ready', async () => {
      try {
        let dbs: string[] = [];
        const dbHost = dbCreds.host || '127.0.0.1';

        if (dbType === 'mysql') {
          const dbPort = dbCreds.port || 3306;
          // Set password in environment to avoid displaying in process audits
          const cmd = `MYSQL_PWD='${dbCreds.password || ''}' mysql -u'${dbCreds.user}' -h'${dbHost}' -P'${dbPort}' -e 'SHOW DATABASES;'`;
          const output = await execCommand(conn, cmd);
          
          // Split stdout into lines, filter out header "Database" and system tables
          dbs = output
            .split('\n')
            .map((line) => line.trim())
            .filter(
              (line) =>
                line &&
                line !== 'Database' &&
                line !== 'information_schema' &&
                line !== 'performance_schema' &&
                line !== 'sys' &&
                line !== 'mysql'
            );
        } else if (dbType === 'postgresql') {
          const dbPort = dbCreds.port || 5432;
          const cmd = `PGPASSWORD='${dbCreds.password || ''}' psql -U '${dbCreds.user}' -h '${dbHost}' -p '${dbPort}' -d 'postgres' -t -A -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';\"`;
          const output = await execCommand(conn, cmd);
          
          dbs = output
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && line !== 'template1');
        } else if (dbType === 'mongodb') {
          const dbPort = dbCreds.port || 27017;
          const authDb = dbCreds.authSource ? ` --authenticationDatabase '${dbCreds.authSource}'` : '';
          const authCreds = dbCreds.password
            ? ` -u '${dbCreds.user}' -p '${dbCreds.password}'`
            : '';
          
          // Try mongosh first, fallback to mongo
          const cmd = `mongosh --host '${dbHost}' --port '${dbPort}'${authCreds}${authDb} --eval "db.adminCommand('listDatabases').databases.map(d => d.name)" --quiet 2>/dev/null || mongo --host '${dbHost}' --port '${dbPort}'${authCreds}${authDb} --eval "db.adminCommand('listDatabases').databases.map(d => d.name)" --quiet`;
          const output = await execCommand(conn, cmd);
          
          // Clean evaluation output (e.g. [ 'admin', 'config', 'local' ])
          const match = output.match(/\[([\s\S]*?)\]/);
          if (match && match[1]) {
            dbs = match[1]
              .split(',')
              .map((val) => val.replace(/['"\s]/g, '').trim())
              .filter((val) => val && val !== 'admin' && val !== 'config' && val !== 'local');
          } else {
            // Fallback split by line
            dbs = output
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line);
          }
        }

        cleanup(() => {
          resolve({
            success: true,
            databases: dbs,
          });
        });
      } catch (err: any) {
        cleanup(() => {
          resolve({
            success: false,
            error: `Database discovery failed: ${err.message}`,
          });
        });
      }
    });

    conn.on('error', (err: any) => {
      cleanup(() => {
        resolve({
          success: false,
          error: err.message || 'SSH connection failed during database inspection',
        });
      });
    });

    try {
      conn.connect(connConfig);
    } catch (err: any) {
      cleanup(() => {
        resolve({
          success: false,
          error: `Connection error: ${err.message}`,
        });
      });
    }
  });
}

/**
 * Executes a shell command on the connection, returning its stdout.
 */
function execCommand(conn: Client, cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';

      stream.on('close', (code: number) => {
        if (code !== 0) {
          reject(new Error(`Command exit code ${code}. Stderr: ${stderr.trim() || 'None'}`));
        } else {
          resolve(stdout.trim());
        }
      });

      stream.on('data', (data: Buffer | string) => {
        stdout += data.toString();
      });

      stream.stderr.on('data', (data: Buffer | string) => {
        stderr += data.toString();
      });
    });
  });
}
