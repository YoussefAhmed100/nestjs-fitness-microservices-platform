import { ClientProxyFactory, Transport } from '@nestjs/microservices';

async function testAuth() {
  const client = ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://admin:admin123@localhost:5672'],
      queue: 'auth_queue',
      queueOptions: { durable: true },
    },
  });

  await client.connect();

  console.log('--- Testing Register ---');
  const registerResult = await client
    .send('auth.register', {
      email: 'test3@example.com',
      password: 'password123',
      name: 'Test3 User',
    })
    .toPromise();
  console.log(registerResult);

  console.log('--- Testing Login ---');
  const loginResult = await client
    .send('auth.login', {
      email: 'test@example.com',
      password: 'password123',
    })
    .toPromise();
  console.log(loginResult);

  await client.close();
  process.exit(0);
}

testAuth().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});