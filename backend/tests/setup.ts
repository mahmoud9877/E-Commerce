// Placeholder config; nothing here reaches a real external service (see tests/helpers.ts fakes)
Object.assign(process.env, {
  MOOD: "TEST",
  APP_NAME: "ecommerce-test",
  BEARER_KEY: "Bearer__",
  TOKEN_SIGNATURE: "test-token-signature",
  EMAIL_TOKEN: "test-email-token",
  SALT_ROUND: "10",
  FE_URL: "http://localhost:3000",
  gmail: "test@example.com",
  gmailPass: "unused",
});
