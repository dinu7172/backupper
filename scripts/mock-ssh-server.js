const { Server } = require('ssh2');
const crypto = require('crypto');

console.log('Generating temporary RSA host key for mock SSH server...');
const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});
console.log('Host key generated successfully.');

const server = new Server(
  {
    hostKeys: [privateKey],
  },
  (client) => {
    console.log('\n[SSH Server] Client connection initiated...');

    client
      .on('authentication', (ctx) => {
        console.log(`[SSH Server] Authenticating user "${ctx.username}" via "${ctx.method}"`);
        // Accept any credentials for easy testing
        ctx.accept();
      })
      .on('ready', () => {
        console.log('[SSH Server] Client successfully authenticated.');

        client.on('session', (accept, reject) => {
          const session = accept();

          session.on('exec', (accept, reject, info) => {
            console.log(`[SSH Server] Executing command: ${info.command}`);
            const stream = accept();

            // Match command and send mocked response
            const cmd = info.command.trim();

            if (cmd.includes('cat /etc/os-release') || cmd.includes('uname -s')) {
              // Mocking OS details
              stream.write('PRETTY_NAME="Ubuntu 22.04.4 LTS (Mock Server)"\n');
            } else if (cmd === 'uname -m') {
              // Mocking CPU Architecture
              stream.write('x86_64\n');
            } else if (cmd === 'uname -r') {
              // Mocking Kernel version
              stream.write('5.15.0-mock-generic\n');
            } else if (cmd.includes('df -B1 /')) {
              // Mocking Disk Space
              // Column order: Filesystem, 1B-blocks (Total), Used, Available (Free), Use%, Mounted on
              // Total: 100 GB (107374182400 B), Used: 30 GB (32212254720 B), Free: 70 GB (75161927680 B)
              stream.write('Filesystem     1B-blocks      Used Available Use% Mounted on\n');
              stream.write('/dev/sda1      107374182400 32212254720 75161927680  30% /\n');
            } else if (cmd.includes('SHOW DATABASES;')) {
              // Mocking MySQL Database Discovery
              stream.write('Database\n');
              stream.write('mock_wordpress_production\n');
              stream.write('mock_ecommerce_store\n');
              stream.write('mock_user_profiles_db\n');
            } else if (cmd.includes('SELECT datname FROM pg_database')) {
              // Mocking PostgreSQL Database Discovery
              stream.write('mock_postgres_app_db\n');
              stream.write('mock_billing_engine\n');
              stream.write('mock_inventory_system\n');
            } else if (cmd.includes('listDatabases')) {
              // Mocking MongoDB Database Discovery
              stream.write('[ "mock_mongodb_analytics", "mock_logs_archive", "mock_customer_relations" ]\n');
            } else {
              console.log(`[SSH Server] Warning: Unrecognized/unhandled command executed: "${info.command}"`);
              stream.write('\n');
            }

            stream.exit(0);
            stream.end();
          });
        });
      })
      .on('close', () => {
        console.log('[SSH Server] Client disconnected.');
      });
  }
);

const PORT = 2222;
const HOST = '127.0.0.1';

server.listen(PORT, HOST, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Mock SSH Server is running and listening!`);
  console.log(`   Host: ${HOST}`);
  console.log(`   Port: ${PORT}`);
  console.log(`======================================================`);
  console.log(`You can now connect to this server locally using:`);
  console.log(`  - Host: 127.0.0.1`);
  console.log(`  - Port: 2222`);
  console.log(`  - Username: (any value, e.g., test)`);
  console.log(`  - Password: (any value, e.g., password)`);
  console.log(`======================================================\n`);
});
