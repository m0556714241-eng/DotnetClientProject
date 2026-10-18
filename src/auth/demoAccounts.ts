// Demo users created by the server's DbSeeder (also listed in the server README).
// Used ONLY by the demo-login buttons, so the examiner can try both roles in one click.
// They log in through the real POST /api/auth/login – nothing is bypassed.
// Hide the buttons in any deployment by setting VITE_SHOW_DEMO_LOGIN=false.
export const DEMO_ACCOUNTS = {
  admin: { email: 'admin@seatwise.com', password: 'Admin123!' },
  customer: { email: 'customer@seatwise.com', password: 'Customer123!' },
} as const;
