# Administrator Flow Documentation

The Administrator Portal provides full control over site content, pricing structures, and registration requirements without code changes.

### 1. Authentication & Access
- **Login**: Admins authenticate via the `/login` page using Email/Password or Google.
- **Redirect**: Upon successful login, users are automatically routed to the `/admin` dashboard.
- **Security**: Route protection ensures only authenticated users can view or modify the Admin Control Hub.

### 2. Dashboard Operations
The dashboard is split into two primary management zones:

#### Landing Content Management
- **Hero Banner**: Update main headlines, subtitles, and background images with real-time preview.
- **Pricing Headers**: Customize the main headings for the membership section.
- **Feature Sections**: Edit the specific "Powerful CMS Capabilities" article, including the image and "Pro Tip" content.

#### Membership Tier Management
- **Branding**: Rename plans (e.g., "Starter" to "Basic").
- **Pricing**: Set cost and frequency (Monthly, Yearly, or One-time).
- **Visibility**: Use the toggle switch to hide/show specific tiers on the public landing page.
- **Benefits**: Manage a dynamic list of features/benefits for each plan.

#### Registration Field Builder
- **Customization**: Define the exact data collected during user sign-up.
- **Field Types**: Supports text, textarea, email, number, file uploads, and dropdown selects.
- **Validation**: Toggle "Required" status for mandatory information.

### 3. Publishing Workflow
- **State Management**: Changes made in the UI are kept in local state for review.
- **Publishing**: Clicking **Publish Changes** triggers a single batch write to Firestore (`/settings/siteConfig`).
- **Live Sync**: All public pages (`/` and `/register`) utilize real-time listeners and update instantly for all visitors upon publishing.