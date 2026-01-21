import { legalLayout } from './layout.js';

export function renderPrivacyPolicy() {
  const content = `
    <h1>Privacy Policy</h1>
    <p><em>Last updated: January 2025</em></p>

    <h2>1. Information We Collect</h2>
    <p>We collect information you provide directly, such as account details and usage data.</p>

    <h2>2. How We Use Information</h2>
    <p>We use collected information to:</p>
    <ul>
      <li>Provide and maintain our service</li>
      <li>Improve user experience</li>
      <li>Send important updates</li>
    </ul>

    <h2>3. Data Storage</h2>
    <p>Your data is stored securely and we take reasonable measures to protect it.</p>

    <h2>4. Third-Party Services</h2>
    <p>We may use third-party services that collect information for analytics and service improvement.</p>

    <h2>5. Your Rights</h2>
    <p>You have the right to access, correct, or delete your personal data.</p>

    <h2>6. Cookies</h2>
    <p>We use cookies to maintain session state and improve service functionality.</p>

    <h2>7. Changes to Policy</h2>
    <p>We may update this policy periodically. Changes will be posted on this page.</p>

    <h2>8. Contact</h2>
    <p>For privacy-related inquiries, please contact us.</p>
  `;

  return legalLayout({ title: 'Privacy Policy', content });
}
