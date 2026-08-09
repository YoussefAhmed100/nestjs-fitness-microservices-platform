export function welcomeEmailTemplate(name: string): { subject: string; body: string } {
  return {
    subject: 'Welcome!',
    body: `<h1>Welcome, ${name}!</h1><p>Your account has been created successfully.</p>`,
  };
}