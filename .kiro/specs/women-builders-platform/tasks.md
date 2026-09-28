# Implementation Plan: Women Builders Platform

## Overview

This implementation plan builds a professional community platform for women founders, operators, investors, and builders. The platform uses Next.js 14 with TypeScript, Prisma with PostgreSQL, NextAuth.js for authentication, and Resend for email notifications. The implementation follows an incremental approach, building from foundational infrastructure through core features to admin capabilities and deployment.

## Tasks

- [ ] 1. Project setup and foundational infrastructure
  - [ ] 1.1 Initialize Next.js 14 project with TypeScript and configure development environment
    - Create Next.js 14 app with App Router and TypeScript
    - Install core dependencies: React 18, Tailwind CSS, shadcn/ui
    - Configure Tailwind CSS with custom theme and responsive breakpoints
    - Set up project structure with app/, components/, lib/ directories
    - Configure TypeScript with strict mode and path aliases
    - Create initial layout components and global styles
    - _Requirements: All requirements depend on foundational setup_
  
  - [ ] 1.2 Set up Prisma with PostgreSQL and define database schema
    - Install Prisma and PostgreSQL client
    - Create prisma/schema.prisma with all models from design document
    - Define enums: RoleType, OutreachStatus, AccountStatus, ConnectionRequestStatus
    - Define all models: User, Profile, ConnectionRequest, Connection, Message, DismissedRecommendation, NotificationPreference, RateLimit, PotentialMember, OutreachNote, OutreachAttempt
    - Configure indexes for performance optimization
    - Set up database connection with environment variables
    - Generate Prisma client
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 3.1, 6.1, 8.1, 10.1_
  
  - [ ] 1.3 Create database migration and seed script
    - Run initial Prisma migration to create database tables
    - Create seed script with sample admin user and test data
    - Implement password hashing with bcryptjs
    - Add seed command to package.json
    - _Requirements: 11.1, 18.1_
  
  - [ ] 1.4 Configure NextAuth.js with credential provider
    - Install NextAuth.js v5 and dependencies
    - Create lib/auth/auth.config.ts with credential provider
    - Implement password validation and hashing utilities
    - Configure session callbacks with JWT tokens
    - Add authentication middleware for protected routes
    - Create auth API routes in app/api/auth/
    - Set up environment variables for NextAuth
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 2. Checkpoint - Verify project foundation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Authentication and user registration
  - [ ] 3.1 Create registration page with role selection
    - Create app/(auth)/register/page.tsx with registration form
    - Implement form with React Hook Form and Zod validation
    - Add fields: email, password, name, primaryRole
    - Validate password requirements (8+ chars, uppercase, lowercase, number)
    - Create API endpoint POST /api/auth/register
    - Hash password and create pending user account
    - Display appropriate error messages for duplicate emails
    - _Requirements: 18.1, 18.2, 11.4_
  
  - [ ] 3.2 Create login page with account locking
    - Create app/(auth)/login/page.tsx with login form
    - Implement credential validation in NextAuth authorize function
    - Track failed login attempts in database
    - Implement 15-minute account lock after 5 failed attempts within 15 minutes
    - Display appropriate error messages for locked accounts
    - Reset failed attempts counter on successful login
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [ ] 3.3 Create profile onboarding flow
    - Create app/(member)/onboarding/page.tsx for new users
    - Build multi-step form for profile completion
    - Collect role-specific information based on primaryRole
    - Implement Zod validation schemas for each role type
    - Calculate profile completeness score
    - Redirect to dashboard after completion
    - _Requirements: 1.1, 18.4, 10.1_

- [ ] 4. Member profile management
  - [ ] 4.1 Create profile model and completeness calculation service
    - Create lib/services/profile-completeness.ts service
    - Implement calculateCompleteness() function
    - Define REQUIRED_FIELDS constants for each RoleType
    - Implement canSendConnectionRequests() with 60% threshold check
    - Add helper functions for getting required and optional fields by role
    - _Requirements: 1.1, 1.4, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 4.2 Create profile view and edit pages
    - Create app/(member)/profile/page.tsx for viewing own profile
    - Create app/(member)/profile/edit/page.tsx for editing profile
    - Build profile form with role-specific field rendering
    - Implement PATCH /api/members/:id endpoint for profile updates
    - Calculate and update completeness score on save
    - Display profile completeness indicator
    - Handle privacy settings for hidden fields
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.2, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 4.3 Implement member profile viewing with privacy controls
    - Create app/(member)/members/[id]/page.tsx for viewing other profiles
    - Implement GET /api/members/:id endpoint
    - Check connection status between viewing user and profile owner
    - Apply privacy filters for hidden fields when not connected
    - Display role-specific information based on profile roles
    - Show connection action buttons (Send Request/Message/Already Connected)
    - _Requirements: 9.1, 9.2, 9.3, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 5. Member search and filtering
  - [ ] 5.1 Create search service with filtering logic
    - Create lib/services/search.ts service
    - Implement searchMembers() function with text query support
    - Add PostgreSQL full-text search for name and keywords
    - Implement applyFilters() for role, expertise, and location filtering
    - Create hybrid ranking algorithm (70% relevance, 30% completeness)
    - Add pagination support
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 5.2 Build search interface with filters
    - Create app/(member)/search/page.tsx with search UI
    - Build search form with text input and filter dropdowns
    - Implement real-time search with debouncing
    - Add filter chips for primaryRole, secondaryRole, expertise, location
    - Display search results with pagination
    - Show member cards with name, roles, expertise, connection status
    - Implement GET /api/members endpoint with query parameters
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 6. Connection request system
  - [ ] 6.1 Create connection service with rate limiting
    - Create lib/services/connection.ts service
    - Implement sendRequest() with validation and rate limit check
    - Create checkRequestLimit() to enforce 20 requests/day limit
    - Implement acceptRequest() to create Connection record
    - Implement declineRequest() without notifying sender
    - Implement cancelRequest() for outgoing requests
    - Add expireOldRequests() to auto-decline after 30 days
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_
  
  - [ ] 6.2 Build connection request UI and API endpoints
    - Create POST /api/connections/requests endpoint
    - Create POST /api/connections/requests/:id/accept endpoint
    - Create POST /api/connections/requests/:id/decline endpoint
    - Create DELETE /api/connections/requests/:id endpoint (cancel)
    - Add "Send Connection Request" button to member profiles
    - Create modal for composing connection request message (500 char limit)
    - Validate profile completeness before allowing request sending
    - Display rate limit errors appropriately
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_
  
  - [ ] 6.3 Create pending requests management page
    - Create app/(member)/connections/requests/page.tsx
    - Implement GET /api/connections/requests endpoint
    - Display incoming requests with sender info, message, and date
    - Display outgoing requests with recipient info and date
    - Add Accept/Decline buttons for incoming requests
    - Add Cancel button for outgoing requests
    - Update UI immediately on user actions
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 7. Checkpoint - Verify core member features
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Connection list and messaging
  - [ ] 8.1 Create connections list page
    - Create app/(member)/connections/page.tsx
    - Implement GET /api/connections endpoint
    - Display all accepted connections with name, roles, connection date
    - Add search functionality for filtering connections by name
    - Link to profile pages and message initiation
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ] 8.2 Create messaging service with rate limiting
    - Create lib/services/messaging.ts service
    - Implement sendMessage() with connection verification
    - Create checkMessageLimit() to enforce 50 messages/day limit
    - Implement getConversation() to fetch message history
    - Implement getConversationList() with unread counts
    - Implement markAsRead() functionality
    - _Requirements: 4.1, 4.2, 4.4_
  
  - [ ] 8.3 Build messaging interface
    - Create app/(member)/messages/page.tsx for conversation list
    - Create app/(member)/messages/[userId]/page.tsx for conversation view
    - Implement POST /api/messages endpoint for sending messages
    - Implement GET /api/messages/conversations endpoint
    - Implement GET /api/messages/conversations/:userId endpoint
    - Implement PATCH /api/messages/:id/read endpoint
    - Build real-time message UI with chronological ordering
    - Display unread message indicators
    - Prevent messaging non-connected members
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 9. Recommendation engine
  - [ ] 9.1 Create relevance scoring algorithm
    - Create lib/services/relevance.ts service
    - Implement calculateRelevance() with weighted scoring
    - Role matching algorithm (30% weight)
    - Needs-offerings alignment algorithm (40% weight)
    - Expertise overlap algorithm (20% weight)
    - Activity recency algorithm (10% weight)
    - Generate match reasons for each score component
    - _Requirements: 5.1, 5.3_
  
  - [ ] 9.2 Build recommendation engine service
    - Create lib/services/recommendation.ts service
    - Implement generateRecommendations() function
    - Filter out already connected members
    - Filter out dismissed members (within 30 days)
    - Calculate relevance scores for all eligible members
    - Sort by relevance score and return top 5-20 results
    - Generate explanation text for each recommendation
    - Implement dismissRecommendation() with 30-day cooldown
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 9.3 Create recommendations page and API
    - Create app/(member)/recommendations/page.tsx
    - Implement GET /api/recommendations endpoint
    - Implement POST /api/recommendations/:id/dismiss endpoint
    - Display recommendation cards with member info and explanation
    - Show match reasons with icons and descriptions
    - Add "Dismiss" and "View Profile" actions
    - Trigger refresh when profile is updated
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 10. Email notification system
  - [ ] 10.1 Configure Resend email service
    - Install Resend SDK
    - Create lib/services/notification.ts service
    - Set up Resend API key in environment variables
    - Create email templates for each notification type
    - Implement base email sending functionality with error handling
    - _Requirements: 16.1, 16.2, 16.3, 18.5_
  
  - [ ] 10.2 Implement notification preference system
    - Create API endpoint GET /api/notifications/preferences
    - Create API endpoint PATCH /api/notifications/preferences
    - Build notification preferences UI in profile settings
    - Implement shouldSendNotification() preference checking
    - Add toggles for connection_request, connection_accepted, new_message
    - _Requirements: 16.4, 16.5_
  
  - [ ] 10.3 Implement email notifications for all events
    - Implement sendConnectionRequestEmail() in notification service
    - Implement sendConnectionAcceptedEmail() in notification service
    - Implement sendMessageEmail() with message preview
    - Implement sendWelcomeEmail() for approved members
    - Integrate email sending into connection request flow
    - Integrate email sending into message sending flow
    - Integrate email sending into member approval flow
    - Ensure 5-minute delivery time constraint
    - _Requirements: 16.1, 16.2, 16.3, 18.5_

- [ ] 11. Checkpoint - Verify member platform complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Admin dashboard and metrics
  - [ ] 12.1 Create admin authorization middleware
    - Create lib/auth/admin-middleware.ts
    - Implement requireAdmin() function checking isAdmin flag
    - Apply middleware to all admin routes
    - Return 403 FORBIDDEN for non-admin users
    - _Requirements: 11.5, 11.6_
  
  - [ ] 12.2 Build admin dashboard with metrics
    - Create app/(admin)/dashboard/page.tsx
    - Implement GET /api/admin/dashboard endpoint
    - Display active member count
    - Display pending application count
    - Display potential members grouped by outreach status
    - Show upcoming follow-ups (next 7 days)
    - Create member growth chart by month
    - Add date range filter for all metrics
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_
  
  - [ ] 12.3 Create conversion funnel analytics
    - Implement GET /api/admin/analytics/conversion endpoint
    - Calculate conversion rates between outreach statuses
    - Display funnel visualization showing progression
    - Show drop-off rates at each stage
    - Support date range filtering
    - _Requirements: 20.2_

- [ ] 13. Admin member management
  - [ ] 13.1 Create member list and search for admins
    - Create app/(admin)/members/page.tsx
    - Implement GET /api/admin/members endpoint
    - Display all members with status indicators
    - Add search and filter functionality
    - Show pending applications prominently
    - Link to approval, deactivation, and reactivation actions
    - _Requirements: 8.1, 8.5_
  
  - [ ] 13.2 Implement member approval workflow
    - Create POST /api/admin/members/:id/approve endpoint
    - Update user accountStatus to ACTIVE
    - Send welcome email via notification service
    - Create member detail view showing application information
    - Add approval button with confirmation modal
    - _Requirements: 8.2, 18.5_
  
  - [ ] 13.3 Implement member deactivation and reactivation
    - Create POST /api/admin/members/:id/deactivate endpoint
    - Create POST /api/admin/members/:id/reactivate endpoint
    - Update accountStatus appropriately
    - Preserve all profile data during deactivation
    - Prevent login for deactivated accounts
    - Add deactivate/reactivate buttons to member detail pages
    - _Requirements: 8.3, 8.4, 9.5_

- [ ] 14. Potential member tracking system
  - [ ] 14.1 Create potential member data model and service
    - Create lib/services/admin.ts service
    - Implement createPotentialMember() function
    - Check for duplicate emails before creating records
    - Implement updateOutreachStatus() function
    - Implement addOutreachNote() function
    - Support all OutreachStatus enum values
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 14.2 Build potential member management UI
    - Create app/(admin)/potential-members/page.tsx
    - Implement GET /api/admin/potential-members endpoint
    - Display searchable/filterable table of potential members
    - Add filters for outreach status and follow-up date
    - Show name, company, role, status, next follow-up date
    - Create form for adding new potential members
    - Implement POST /api/admin/potential-members endpoint
    - Display duplicate warning when email already exists
    - _Requirements: 6.1, 6.4, 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 14.3 Create potential member detail page with outreach tracking
    - Create app/(admin)/potential-members/[id]/page.tsx
    - Display all potential member information
    - Show complete outreach history in chronological order
    - Create form for logging new outreach attempts
    - Implement POST /api/admin/potential-members/:id/outreach endpoint
    - Create form for adding timestamped notes
    - Implement POST /api/admin/potential-members/:id/notes endpoint
    - Add next follow-up date picker
    - Update outreach status when logging attempts
    - _Requirements: 6.3, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ] 14.4 Implement CSV bulk import for potential members
    - Create CSV upload UI in potential members page
    - Implement POST /api/admin/potential-members/import endpoint
    - Parse CSV with columns: name, email, company, role, linkedInUrl, discoverySource
    - Validate required fields and data format for each row
    - Check for duplicate emails against existing potential members and members
    - Create records for valid, non-duplicate entries
    - Return import summary with success count, skipped count, and errors
    - Display detailed import results to admin
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 15. Checkpoint - Verify admin features complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Data validation and error handling
  - [ ] 16.1 Create comprehensive Zod validation schemas
    - Create lib/validations/schemas.ts file
    - Define schemas for registration, login, profile updates
    - Define schemas for connection requests, messages
    - Define schemas for potential member creation and import
    - Add email format validation
    - Add URL format validation for LinkedIn URLs
    - Validate password requirements
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [ ] 16.2 Implement consistent error handling across API
    - Create lib/utils/errors.ts with error response helper
    - Define ErrorResponse interface with code, message, details
    - Map common error types to consistent error codes
    - Implement form data preservation on validation errors
    - Add user-friendly error messages for all error scenarios
    - Log technical errors for admin review
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 17. Background jobs and maintenance
  - [ ] 17.1 Create connection request expiration job
    - Create lib/jobs/expire-requests.ts
    - Implement job to find requests older than 30 days with PENDING status
    - Update expired requests to EXPIRED status
    - Set up cron trigger for daily execution
    - Log expiration counts for monitoring
    - _Requirements: 3.6_
  
  - [ ] 17.2 Create data retention archival job
    - Create lib/jobs/archive-potential-members.ts
    - Find potential members in terminal states (NOT_INTERESTED, NOT_A_FIT, DO_NOT_CONTACT)
    - Filter records older than 2 years
    - Archive to separate table or export to storage
    - Log archival counts for monitoring
    - Set up cron trigger for monthly execution
    - _Requirements: Data retention design decision_

- [ ] 18. Testing infrastructure
  - [ ]* 18.1 Set up testing framework with Jest and React Testing Library
    - Install Jest, React Testing Library, and dependencies
    - Configure Jest for Next.js with TypeScript
    - Create jest.config.js with appropriate settings
    - Set up test database with separate connection
    - Create test utilities and helpers
    - Add test scripts to package.json
  
  - [ ]* 18.2 Write unit tests for core services
    - Test profile completeness calculation
    - Test relevance scoring algorithm
    - Test search filtering logic
    - Test rate limiting logic
    - Test password validation
    - Test authentication utilities
  
  - [ ]* 18.3 Write integration tests for API endpoints
    - Test authentication endpoints (register, login, logout)
    - Test member endpoints (search, profile view, profile update)
    - Test connection endpoints (send, accept, decline, cancel)
    - Test messaging endpoints (send, conversation view)
    - Test recommendation endpoints (get, dismiss)
    - Test admin endpoints (member approval, potential member management)
  
  - [ ]* 18.4 Write end-to-end tests for critical user flows
    - Test complete registration and onboarding flow
    - Test connection request workflow (send, accept, message)
    - Test search and recommendation discovery flow
    - Test admin approval and outreach workflow
    - Use Playwright or Cypress for E2E testing

- [ ] 19. Deployment preparation
  - [ ] 19.1 Configure environment variables and secrets
    - Document all required environment variables
    - Set up production DATABASE_URL for PostgreSQL
    - Configure NEXTAUTH_URL and NEXTAUTH_SECRET
    - Set up RESEND_API_KEY for email service
    - Configure Vercel Blob Storage credentials
    - Add all variables to Vercel project settings
    - _Requirements: All deployment-related requirements_
  
  - [ ] 19.2 Set up production database and run migrations
    - Create production PostgreSQL database (Vercel Postgres or Supabase)
    - Run Prisma migrations against production database
    - Verify all tables and indexes created correctly
    - Create initial admin user in production
    - Set up database backup strategy
    - _Requirements: All database-related requirements_
  
  - [ ] 19.3 Deploy to Vercel and verify functionality
    - Connect repository to Vercel project
    - Configure build settings for Next.js
    - Deploy to production
    - Verify all pages load correctly
    - Test authentication flow in production
    - Test email notifications are sent correctly
    - Test file upload functionality
    - Verify API endpoints respond correctly
    - _Requirements: All functional requirements_
  
  - [ ] 19.4 Set up monitoring and error tracking
    - Configure Vercel Analytics for performance monitoring
    - Set up Sentry for error tracking
    - Add error boundaries to React components
    - Configure alerts for critical errors
    - Set up log aggregation for troubleshooting
    - _Requirements: Platform reliability and maintenance_

- [ ] 20. Final checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- The implementation follows an incremental approach: infrastructure → member features → admin features → testing → deployment
- Rate limiting (20 connection requests/day, 50 messages/day) is enforced at the service layer
- Profile completeness threshold (60%) is required before members can send connection requests
- Connection requests automatically expire after 30 days
- All email notifications respect user preferences
- Admin features are protected by authorization middleware
- The technology stack (Next.js 14, TypeScript, Prisma, PostgreSQL, NextAuth.js, Resend) provides type safety and excellent developer experience
- Checkpoints are placed at major milestones to verify progress and gather feedback

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1", "6.1"] },
    { "id": 5, "tasks": ["4.3", "5.2", "6.2", "8.2"] },
    { "id": 6, "tasks": ["6.3", "8.1", "9.1", "10.1"] },
    { "id": 7, "tasks": ["8.3", "9.2", "10.2"] },
    { "id": 8, "tasks": ["9.3", "10.3", "12.1"] },
    { "id": 9, "tasks": ["12.2", "13.1", "14.1"] },
    { "id": 10, "tasks": ["12.3", "13.2", "14.2"] },
    { "id": 11, "tasks": ["13.3", "14.3"] },
    { "id": 12, "tasks": ["14.4", "16.1"] },
    { "id": 13, "tasks": ["16.2", "17.1"] },
    { "id": 14, "tasks": ["17.2", "18.1"] },
    { "id": 15, "tasks": ["18.2", "18.3", "18.4", "19.1"] },
    { "id": 16, "tasks": ["19.2"] },
    { "id": 17, "tasks": ["19.3"] },
    { "id": 18, "tasks": ["19.4"] }
  ]
}
```
