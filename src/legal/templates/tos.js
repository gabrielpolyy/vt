import { legalLayout } from './layout.js';

export function renderTos() {
  const content = `
    <h1>Terms of Service</h1>
    <p><em>Last updated: January 2025</em></p>

    <h2>1. Acceptance of Terms</h2>
    <p>By accessing or using this service, you agree to be bound by these Terms of Service.</p>

    <h2>2. Use of Service</h2>
    <p>You agree to use the service only for lawful purposes and in accordance with these terms.</p>

    <h2>3. User Accounts</h2>
    <p>You are responsible for maintaining the confidentiality of your account credentials.</p>

    <h2>4. Intellectual Property</h2>
    <p>All content and materials available through the service are protected by intellectual property rights.</p>

    <h2>5. Limitation of Liability</h2>
    <p>The service is provided "as is" without warranties of any kind.</p>

    <h2>6. Changes to Terms</h2>
    <p>We reserve the right to modify these terms at any time. Continued use constitutes acceptance of changes.</p>

    <h2>7. Contact</h2>
    <p>For questions about these terms, please contact us.</p>
  `;

  return legalLayout({ title: 'Terms of Service', content });
}
