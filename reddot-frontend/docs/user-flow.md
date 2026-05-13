# User Flow Documentation

The User Journey outlines the experience from landing on the site to completing membership registration.

### 1. Discovery (Landing Page)
- **Landing**: Users arrive at the home page (`/`) and see the custom hero banner and brand messaging.
- **Exploration**: Users browse the "Simple, Transparent Pricing" section to compare available membership tiers.
- **Selection**: Users click **Select [Plan Name]** on their preferred tier.

### 2. Tier Selection & Redirect
- **Path**: Clicking a tier button redirects the user to `/register?tier=[tierId]`.
- **Context**: The registration page automatically detects the selected tier and displays its specific benefits and pricing (Monthly, Yearly, or One-time) in a summary sidebar.

### 3. Membership Registration
- **Dynamic Form**: Users see a registration form built dynamically from the Admin's configured fields (e.g., Full Name, Email, Business ID, File Uploads).
- **Validation**: The form enforces "Required" status and proper email formats as defined in the site configuration.
- **Security**: All data entry is protected by SSL encryption, and the interface provides visual reassurance (Shield icons).

### 4. Completion
- **Submission**: Users click **Complete Registration** to submit their details.
- **Success**: Upon a successful write, a toast notification confirms submission and directs the user to check their email for next steps.
- **Persistence**: Admin-side configuration changes (like new fields or price updates) update the user's view in real-time if they are currently on the page.