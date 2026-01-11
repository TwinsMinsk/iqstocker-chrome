import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | IQSTOCKER GENERATOR',
  description: 'Privacy Policy for IQSTOCKER GENERATING browser extension explaining how we collect, use, and protect your data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container-custom py-12 md:py-20">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4 border-b border-gray-800 pb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Privacy Policy</h1>
          <div className="space-y-1">
            <p className="text-xl md:text-2xl text-indigo-400 font-semibold uppercase tracking-wide">IQSTOCKER GENERATOR</p>
            <p className="text-gray-400">Last updated: 09.01.2026</p>
          </div>
        </div>

        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">1. Overview</h2>
            <p>
              This Privacy Policy explains how the IQSTOCKER GENERATING browser extension (the "Extension") collects, uses, and protects user data.
            </p>
            <p>
              The Extension is designed to automate the process of sending user-defined prompts to Midjourney via the Discord web interface and to manage access to its functionality through license validation.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">2. Data We Collect</h2>
            <p>The Extension collects only the minimum data necessary to provide its core functionality.</p>
            <p>This may include:</p>
            
            <div className="space-y-4 pl-4 border-l-2 border-indigo-500/30">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Authentication information</h3>
                <p>License status, license identifiers, and access tokens required to validate and manage access to the Extension.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">User-provided content required for automation</h3>
                <p>Prompt text entered by the user for the sole purpose of user-initiated automation.</p>
                <p className="mt-1 text-sm text-gray-400">Prompts are not stored, analyzed, or used outside the automation process.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Technical identifiers</h3>
                <p>Limited technical information (such as browser or device identifiers) used exclusively for license binding, fraud prevention, and service security.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">3. Data We Do NOT Collect</h2>
            <p>The Extension does not collect or store:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-2">
              <li>usernames or passwords for third-party services</li>
              <li>Discord, Midjourney, or Telegram account credentials</li>
              <li>private messages or chat history</li>
              <li>payment card details or financial information</li>
              <li>browsing history unrelated to the Extension's functionality</li>
              <li>health data or sensitive personal data</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">4. How We Use Data</h2>
            <p>Collected data is used only to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-2">
              <li>enable and operate automation features explicitly initiated by the user</li>
              <li>validate licenses and manage access to the Extension</li>
              <li>maintain security and prevent unauthorized use</li>
              <li>ensure stable and correct operation of the service</li>
            </ul>
            <p className="mt-4 font-medium text-white">
              Data is never used for advertising, profiling, analytics, or tracking unrelated to the Extension's single purpose.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">5. Data Sharing</h2>
            <p>We do not sell or transfer user data to third parties.</p>
            <p>Data may be processed by the Extension's backend infrastructure only as required to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-2">
              <li>validate licenses,</li>
              <li>maintain service functionality.</li>
            </ul>
            <p>No data is shared with advertisers, data brokers, or analytics providers.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">6. Local Storage</h2>
            <p>
              Certain information (such as user settings, prompt templates, and license status flags) may be stored locally in the user's browser to preserve functionality between sessions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">7. User Control</h2>
            <p>
              Users may remove the Extension at any time through their browser settings.
              Removing the Extension stops all data processing related to it.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">8. Security</h2>
            <p>
              We apply reasonable technical and organizational measures to protect data from unauthorized access, alteration, or disclosure.
            </p>
            <p>
              All data transmitted between the Extension and its backend services is sent over secure HTTPS connections. Data is retained only for as long as necessary to fulfill the Extension's single purpose.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">9. Changes to This Policy</h2>
            <p>This Privacy Policy may be updated from time to time.</p>
            <p>
              The most current version will always be available at the URL where this policy is published.
              Continued use of the Extension constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section className="space-y-4 pt-8 border-t border-gray-800">
            <h2 className="text-2xl md:text-3xl font-bold text-white">10. Contact</h2>
            <p>
              For privacy-related questions, users may contact the service operator via Telegram:{" "}
              <a 
                href="https://t.me/iqstockersupport" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-indigo-400 hover:text-indigo-300 underline transition-colors"
              >
                https://t.me/iqstockersupport
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
