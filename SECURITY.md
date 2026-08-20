# Security Policy

Security and user privacy are important to Quik. We appreciate responsible reports that help us identify and resolve vulnerabilities safely.

## Supported Versions

Quik is currently under active development. Security fixes are applied to the latest code on the default branch.

| Version or branch | Supported |
| ----------------- | --------- |
| `main`            | Yes       |
| Older commits     | No        |

## Reporting a Vulnerability

Do not disclose a suspected vulnerability through a public GitHub issue, discussion, pull request, or social media post.

Submit the report privately through [GitHub Security Advisories](https://github.com/huysg136/chat-realtime/security/advisories/new). Please keep the vulnerability and its technical details confidential until a fix has been released or disclosure has been coordinated with the maintainers.

Include as much of the following information as possible:

- A clear description of the vulnerability and its potential impact.
- The affected page, component, endpoint, or service.
- Reproduction steps or a minimal proof of concept.
- Required account type, permissions, and environment.
- Relevant logs, screenshots, or request and response samples with secrets removed.
- Any known mitigations or remediation suggestions.

Never include real user data, credentials, access tokens, private keys, or other secrets in a report.

## Scope

Examples of issues that are in scope include:

- Authentication or authorization bypasses.
- Unauthorized access to accounts, rooms, messages, reports, or administrative features.
- Exposure of personal data, credentials, tokens, or private configuration.
- Firestore Security Rules or Firebase access-control vulnerabilities.
- Cross-site scripting, injection, or unsafe content handling.
- Vulnerabilities in file uploads, media access, voice or video calling, and backend integrations.
- Privilege escalation or manipulation of roles, plans, quotas, and permissions.

The following activities are out of scope unless explicitly authorized:

- Denial-of-service, load, or stress testing.
- Social engineering, phishing, or physical attacks.
- Automated scanning that degrades service availability.
- Accessing, modifying, downloading, or deleting data that does not belong to your test account.
- Reports without a reproducible security impact.
- Vulnerabilities that affect only unsupported versions or previously fixed code.

## Responsible Testing

Use accounts and data that you own. Stop testing as soon as you confirm a vulnerability, avoid persistence or lateral movement, and collect only the minimum evidence required to explain the issue.

Testing does not authorize access to other users' data, disruption of Quik or its providers, or violation of applicable laws and service terms.

## Response and Disclosure

Maintainers will review reports based on severity, exploitability, and user impact. We may request additional information while validating and remediating an issue.

Public disclosure should occur only after a fix is available and both parties have had a reasonable opportunity to coordinate. Eligible reporters may be credited in a security advisory or release note with their consent.

Thank you for helping keep Quik and its users safe.
