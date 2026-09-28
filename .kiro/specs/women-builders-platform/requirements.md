# Requirements Document

## Introduction

Women Builders is a professional community platform that solves quality network curation and relevant professional discovery for women founders, operators, investors, and builders. The platform helps members discover relevant people based on what they do, what they are building, what they need, and what they can offer, enabling meaningful professional relationships.

The platform serves a multi-role professional community where founders, operators, investors, and builders are equally important. Members can hold multiple roles (e.g., founder AND investor). The platform also includes dedicated admin capabilities for managing membership, outreach workflows, and community growth.

## Glossary

- **Member**: A registered user who has completed the application/invitation process and has an active profile on the platform
- **Profile**: A member's professional information including role(s), background, expertise, and what they can offer or need
- **Admin**: A platform user with elevated permissions for member management, outreach tracking, and community operations
- **Potential_Member**: An individual identified for outreach who has not yet joined the platform
- **Outreach_Workflow**: The process of identifying, contacting, and converting potential members into active members
- **Connection**: An accepted relationship between two members that enables direct communication
- **Connection_Request**: A request from one member to connect with another member
- **Role_Type**: One of four member classifications: Founder, Operator, Investor, Builder
- **Primary_Role**: The main professional role a member identifies with
- **Secondary_Role**: An additional professional role a member holds
- **Relevance**: The degree to which a member matches another member's professional context, needs, and offerings
- **Discovery**: The process of finding members who are relevant to a user's professional goals
- **Platform**: The Women Builders system including web application, database, and services

## Requirements

### Requirement 1: Member Profile Creation

**User Story:** As a member, I want to create a comprehensive professional profile, so that other members can discover me and understand what I do and what I can offer.

#### Acceptance Criteria

1. THE Platform SHALL allow members to create a profile with name, email, and exactly one Primary_Role *(R2: was "at least one"; the schema holds exactly one)*
2. WHEN a member selects a Primary_Role, THE Platform SHALL accept Founder, Operator, Investor, or Builder as valid values
3. THE Platform SHALL allow members to select zero or more Secondary_Role values, excluding the member's Primary_Role
4. WHEN a member saves profile information, THE Platform SHALL validate that all required fields contain non-empty values
5. THE Platform SHALL store profile information including headline, professional background, expertise areas, current focus, what the member needs, what the member can offer, location, LinkedIn URL, and website URL
6. *(R2)* THE Platform SHALL create the Profile record at registration so every member always has a profile
7. *(R2)* THE Platform SHALL compute profile completeness as `round(100 × filled / applicable)`, where applicable fields are the 7 core fields plus the role-specific fields of every role the member holds, and SHALL recompute it on every save

### Requirement 2: Member Search and Filtering

**User Story:** As a member, I want to search and filter other members by various criteria, so that I can discover relevant professionals in the community.

#### Acceptance Criteria

1. THE Platform SHALL provide a search interface that accepts text queries for member names and keywords
2. THE Platform SHALL provide filters for Primary_Role, Secondary_Role, expertise areas, and location
3. WHEN a member applies search criteria, THE Platform SHALL return matching member profiles within 2 seconds (p95 at 10,000 active members)
6. *(R2)* WHEN a text query is present, THE Platform SHALL rank results primarily by text match (name matches first), then relevance, then completeness
7. *(R2)* THE Platform SHALL only match text and filters against fields visible to the searching member, and SHALL exclude the searching member, blocked members, and non-active members from results
4. THE Platform SHALL display search results showing member name, roles, and key profile highlights
5. THE Platform SHALL allow members to view the full profile of any member in search results

### Requirement 3: Connection Request Management

**User Story:** As a member, I want to send and receive connection requests, so that I can build relationships with relevant professionals.

#### Acceptance Criteria

1. WHEN a member views another member's profile, THE Platform SHALL display an option to send a Connection_Request
2. WHEN a member sends a Connection_Request, THE Platform SHALL allow the sender to include a message up to 500 characters
3. THE Platform SHALL notify the recipient when a Connection_Request is received
4. WHEN a member receives a Connection_Request, THE Platform SHALL allow the member to accept or decline the request
5. WHEN a Connection_Request is accepted, THE Platform SHALL create a Connection between the two members
6. WHEN a Connection_Request is declined, THE Platform SHALL not create a Connection and SHALL not reveal the decline to the sender in any way; the request SHALL appear pending to the sender until its expiry date *(R2)*
7. *(R2)* THE Platform SHALL limit each member to 20 Connection_Requests per rolling 24 hours, enforced atomically
8. *(R2)* THE Platform SHALL allow at most one pending Connection_Request per pair of members in either direction; WHEN a member sends a request to someone who already has a pending request to them, THE Platform SHALL create the Connection immediately
9. *(R2)* WHEN a Connection_Request is declined, cancelled, or expired, THE Platform SHALL allow the sender to send a new request after the original expiry date
10. *(R2)* THE Platform SHALL only allow the recipient to accept or decline a request, and only the sender to cancel it
11. *(R2)* THE Platform SHALL only allow a member to send Connection_Requests once profile completeness is at least 60% and the Primary_Role's required fields are filled; the message is optional (0–500 characters)

### Requirement 4: Connection-Based Messaging

**User Story:** As a member, I want to message my connections directly, so that I can communicate and build professional relationships.

#### Acceptance Criteria

1. WHEN two members have an accepted Connection, THE Platform SHALL enable direct messaging between them
2. WHEN a member sends a message, THE Platform SHALL deliver the message to the recipient within 5 seconds while the recipient has the conversation open (R2: implemented by 3-second polling)
3. THE Platform SHALL notify the recipient when a new message is received
4. THE Platform SHALL display message history in chronological order for each Connection
5. WHEN a member has no Connection with another member, THE Platform SHALL not allow direct messaging between them
6. *(R2)* THE Platform SHALL limit each member to 200 messages per rolling 24 hours and 20 consecutive messages to a recipient who has not replied; messages SHALL be at most 5,000 characters
7. *(R2)* WHEN a Connection is removed, a member is blocked, or either member is no longer active, THE Platform SHALL keep the history visible but read-only

### Requirement 5: Recommended Connections

**User Story:** As a member, I want to receive personalized connection recommendations, so that I can discover relevant members I might not find through search.

#### Acceptance Criteria

1. THE Platform SHALL generate connection recommendations for each member based on profile information, roles, expertise, needs, and offerings
2. WHEN a member views recommendations, THE Platform SHALL display up to 20 recommended members; WHEN fewer than 5 are eligible, THE Platform SHALL show all eligible members and an empty-state prompt *(R2: was "between 5 and 20", impossible for a small community)*
3. THE Platform SHALL provide an explanation for each recommendation indicating why the member is relevant
4. WHEN a member dismisses a recommendation, THE Platform SHALL not show that recommended member again for at least 30 days
5. THE Platform SHALL refresh recommendations when a member updates their profile information
6. *(R2)* THE Platform SHALL exclude from recommendations the member themself, existing connections, members with a pending request in either direction, blocked members, and non-active members
7. *(R2)* THE Platform SHALL build recommendation explanations only from fields visible to the viewing member

### Requirement 6: Potential Member Tracking

**User Story:** As an admin, I want to track potential members through the outreach workflow, so that I can manage community growth and avoid duplicate outreach.

#### Acceptance Criteria

1. THE Platform SHALL allow admins to create Potential_Member records with name, email, LinkedIn URL, company, role, and discovery source; at least one of email or LinkedIn URL is required *(R2)*
2. THE Platform SHALL allow admins to record referrer information for each Potential_Member
3. THE Platform SHALL store outreach status for each Potential_Member with values: Identified, Reviewed, Contacted, Follow_Up_Needed, Interested, Invited, Applied, Approved, Not_Interested, Not_A_Fit, Do_Not_Contact
4. WHEN an admin searches for a Potential_Member by email or LinkedIn URL (normalized), THE Platform SHALL return any existing Potential_Member record or Member to prevent duplicate outreach
5. THE Platform SHALL allow admins to add timestamped notes to Potential_Member records
6. *(R2)* THE Platform SHALL never delete or archive Do_Not_Contact records, and SHALL refuse to create, import, or invite any email or LinkedIn URL matching one
7. *(R2)* THE Platform SHALL allow admins to assign a Potential_Member to an admin owner
8. *(R2)* THE Platform SHALL record every outreach status change with previous status, new status, time, and admin

### Requirement 7: Outreach History and Follow-Up

**User Story:** As an admin, I want to track outreach communications and follow-up dates, so that I can maintain context and ensure timely follow-up with potential members.

#### Acceptance Criteria

1. THE Platform SHALL allow admins to log outreach attempts with date, method, and outcome for each Potential_Member
2. THE Platform SHALL allow admins to set a next follow-up date for each Potential_Member
3. WHEN the current date (in the platform's configured timezone) matches or exceeds a Potential_Member next follow-up date, THE Platform SHALL display that Potential_Member in the admin follow-up queue, unless the record is archived or in status Approved, Not_Interested, Not_A_Fit, or Do_Not_Contact
4. THE Platform SHALL display the complete outreach history for each Potential_Member in chronological order
5. THE Platform SHALL allow admins to update the outreach status when recording new outreach attempts

### Requirement 8: Admin Member Management

**User Story:** As an admin, I want to manage member accounts and profiles, so that I can maintain community quality and handle member lifecycle events.

#### Acceptance Criteria

1. THE Platform SHALL allow admins to view all member profiles regardless of connection status
2. THE Platform SHALL allow admins to approve or reject member applications (R2: rejection added)
3. THE Platform SHALL allow admins to deactivate member accounts while preserving profile data; deactivation SHALL end all of the member's sessions immediately *(R2)*
4. THE Platform SHALL allow admins to reactivate previously deactivated member accounts
5. THE Platform SHALL provide admins with a searchable list of all members and Potential_Members

### Requirement 9: Profile Visibility and Privacy

**User Story:** As a member, I want control over my profile visibility, so that I can manage my presence in the community appropriately.

#### Acceptance Criteria

1. THE Platform SHALL make member profiles visible to all other members by default
2. THE Platform SHALL allow members to hide these fields from non-connected members: location, professional background, current focus, needs, offerings, company name, funding status, check size, LinkedIn URL, website URL *(R2: explicit allow-list)*
3. WHEN members are connected, THE Platform SHALL display all profile fields, including hidden ones, to both parties *(R2: resolves the contradiction with 9.2)*
4. THE Platform SHALL not display Potential_Member information to any member except admins
5. THE Platform SHALL allow members to deactivate their own accounts and to reactivate them by logging in
6. *(R2)* THE Platform SHALL never display a member's email address to other members
7. *(R2)* THE Platform SHALL apply hidden-field rules consistently to profile view, search results, search filters, recommendations, and connection lists

### Requirement 10: Role-Specific Profile Information

**User Story:** As a member, I want to provide role-specific information on my profile, so that other members can understand my specific context and relevance to their needs.

#### Acceptance Criteria

1. WHERE a member has selected Founder as a Primary_Role or Secondary_Role, THE Platform SHALL allow the member to provide company name, company stage, industry, and funding status
2. WHERE a member has selected Operator as a Primary_Role or Secondary_Role, THE Platform SHALL allow the member to provide functional expertise, seniority level, and areas of operational focus
3. WHERE a member has selected Investor as a Primary_Role or Secondary_Role, THE Platform SHALL allow the member to provide investment stage focus, check size range, and sector preferences
4. WHERE a member has selected Builder as a Primary_Role or Secondary_Role, THE Platform SHALL allow the member to provide technical skills, project types, and collaboration interests
5. THE Platform SHALL display role-specific information on member profiles and include it in search and recommendation algorithms

### Requirement 11: Authentication and Authorization

**User Story:** As a platform user, I want secure access to the platform, so that my information and communications are protected.

#### Acceptance Criteria

1. THE Platform SHALL require email and password authentication for all users
2. WHEN a user attempts to log in with correct credentials, THE Platform SHALL grant access within 3 seconds
3. WHEN 5 failed login attempts for one account come from the same IP address within 15 minutes, THE Platform SHALL block further attempts for that account from that IP for 15 minutes; WHEN 50 failures for one account occur within an hour from any IPs, THE Platform SHALL lock the account for 15 minutes and email the owner *(R2: per-account lock allowed anyone to lock anyone out)*
4. THE Platform SHALL enforce password requirements of at least 8 characters including one uppercase letter, one lowercase letter, and one number
5. THE Platform SHALL restrict admin functionality to users with the Admin role
6. WHEN a non-admin user attempts to access admin functionality, THE Platform SHALL deny access and return an authorization error
7. *(R2)* THE Platform SHALL derive the acting user only from the server-side session, and SHALL verify the actor owns or is party to every resource they read or change
8. *(R2)* THE Platform SHALL check account status and admin rights against the database on every request
9. *(R2)* THE Platform SHALL return the same error message for unknown email, wrong password, and locked account

### Requirement 12: Member Profile Viewing

**User Story:** As a member, I want to view detailed profiles of other members, so that I can learn about their background, expertise, and what they offer.

#### Acceptance Criteria

1. WHEN a member selects another member's profile from search results or recommendations, THE Platform SHALL display the full profile within 2 seconds
2. THE Platform SHALL display Primary_Role, Secondary_Role values, professional background, expertise areas, current focus, needs, and offerings on member profiles
3. THE Platform SHALL display role-specific information relevant to each member's selected roles
4. WHERE privacy settings hide certain fields from non-connected members, THE Platform SHALL not display those fields to members without a Connection
5. THE Platform SHALL display connection status and appropriate action buttons (Send Connection Request, Request Pending, Accept/Decline, Message) on each profile, plus Block and Report

### Requirement 13: Potential Member Search for Admins

**User Story:** As an admin, I want to search and filter potential members, so that I can manage outreach priorities and track conversion progress.

#### Acceptance Criteria

1. THE Platform SHALL allow admins to search Potential_Members by name, email, company, or role
2. THE Platform SHALL allow admins to filter Potential_Members by outreach status
3. THE Platform SHALL allow admins to filter Potential_Members by next follow-up date range
4. WHEN an admin applies filters to Potential_Members, THE Platform SHALL return matching results within 2 seconds
5. THE Platform SHALL display Potential_Member search results showing name, company, role, outreach status, and next follow-up date

### Requirement 14: Connection List Management

**User Story:** As a member, I want to view and manage my connections, so that I can maintain my professional network within the platform.

#### Acceptance Criteria

1. THE Platform SHALL provide a connections list showing all members with accepted Connection relationships
2. THE Platform SHALL display connection name, roles, and connection date in the connections list
3. THE Platform SHALL allow members to search their connections by name or keyword
4. WHEN a member selects a connection from the list, THE Platform SHALL display that member's full profile
5. THE Platform SHALL allow members to initiate a message to any connection directly from the connections list

### Requirement 15: Pending Connection Request Management

**User Story:** As a member, I want to view and manage pending connection requests, so that I can respond to requests and track my outgoing requests.

#### Acceptance Criteria

1. THE Platform SHALL display a list of incoming Connection_Requests showing sender name, roles, request message, and request date
2. THE Platform SHALL display a list of outgoing Connection_Requests showing recipient name, roles, and request date
3. WHEN a member accepts an incoming Connection_Request, THE Platform SHALL create a Connection and remove the request from pending lists
4. WHEN a member declines an incoming Connection_Request, THE Platform SHALL remove the request from pending lists without creating a Connection
5. THE Platform SHALL allow members to cancel their outgoing Connection_Requests before they are accepted or declined

### Requirement 16: Email Notifications

**User Story:** As a member, I want to receive email notifications for important platform activities, so that I stay informed even when not actively using the platform.

#### Acceptance Criteria

1. WHEN a member receives a Connection_Request, THE Platform SHALL send an email notification within 5 minutes (sent through a durable outbox with retries)
2. WHEN a Connection_Request is accepted, THE Platform SHALL send an email notification to the original requester within 5 minutes
3. WHEN a member receives a message from a connection, THE Platform SHALL send an email notification within 5 minutes, coalescing to at most one email per conversation per 30 minutes and none if already read
4. THE Platform SHALL allow members to configure email notification preferences for each notification type
5. WHEN a member disables a notification type in preferences, THE Platform SHALL not send email notifications of that type to the member
6. *(R2)* THE Platform SHALL include a one-click unsubscribe link for the notification type in every notification email
7. *(R2)* THE Platform SHALL always send account and security emails (verification, password reset, welcome, application decision, lockout)

### Requirement 17: Data Validation and Error Handling

**User Story:** As a user, I want clear error messages when I provide invalid information, so that I can correct issues and complete my tasks.

#### Acceptance Criteria

1. WHEN a user submits a form with missing required fields, THE Platform SHALL display an error message identifying which fields are required
2. WHEN a user provides an invalid email format, THE Platform SHALL display an error message indicating the email format is invalid
3. WHEN a user provides a URL in an incorrect format, THE Platform SHALL display an error message indicating the expected URL format
4. WHEN a platform operation fails due to a server error, THE Platform SHALL display a user-friendly error message with a reference ID and log the technical error details with that ID
5. THE Platform SHALL preserve user-entered data in forms when displaying validation errors to avoid data loss

### Requirement 18: Account Registration and Onboarding

**User Story:** As a new user, I want to register for an account and complete my profile, so that I can join the Women Builders community.

#### Acceptance Criteria

1. THE Platform SHALL provide a registration interface that accepts email, password, full name, Primary_Role, a headline, and an application statement ("what are you building"), plus an optional invitation token
2. WHEN a user registers with an email already in use (compared case-insensitively), THE Platform SHALL display an error message indicating the email is already registered
3. WHEN a user completes registration, THE Platform SHALL create a PENDING account and send an email verification link; only verified applications appear in the admin review queue. WHEN registration uses a valid invitation token for the same email, THE Platform SHALL activate the account immediately *(R2)*
4. THE Platform SHALL guide new users through profile completion with prompts for role-specific information, expertise, needs, and offerings
5. WHEN an admin approves a new member account, THE Platform SHALL activate the account, record approvedAt, and send a welcome email to the member
6. *(R2)* WHEN an admin rejects an application, THE Platform SHALL set the account to REJECTED and send a neutral email; the email address MAY re-apply after 90 days
7. *(R2)* WHEN a PENDING user logs in, THE Platform SHALL show only an "application under review" page
8. *(R2)* WHEN an applicant's email matches a Potential_Member, THE Platform SHALL link them and set the outreach status to Applied, then Approved on approval

### Requirement 19: Bulk Potential Member Import

**User Story:** As an admin, I want to import multiple potential members from a CSV file, so that I can efficiently add prospects from events, referrals, or research.

#### Acceptance Criteria

1. THE Platform SHALL allow admins to upload CSV files containing Potential_Member information with columns for name, email, company, role, LinkedIn URL, and discovery source
2. WHEN an admin uploads a CSV file, THE Platform SHALL validate each row for required fields and data format
3. WHEN a CSV row's email or LinkedIn URL matches an existing Potential_Member, Member, or an earlier row in the same file, THE Platform SHALL skip that row and report the duplicate in an import summary
4. THE Platform SHALL show a preview of per-row results before import, and on confirmation SHALL create Potential_Member records for all valid rows even if other rows are invalid *(R2: partial import)*
5. THE Platform SHALL display an import summary showing successful imports, skipped duplicates, and validation errors
6. *(R2)* THE Platform SHALL reject files over 1 MB or 2,000 rows, and SHALL neutralize spreadsheet formula prefixes in imported cells

### Requirement 20: Admin Dashboard and Metrics

**User Story:** As an admin, I want to view community growth metrics and outreach performance, so that I can track progress and identify areas needing attention.

#### Acceptance Criteria

1. THE Platform SHALL display total counts of active members, pending applications, and Potential_Members grouped by outreach status
2. THE Platform SHALL display conversion metrics showing, for each outreach status, how many Potential_Members entered it within a selected date range and how many of those later reached Approved *(R2: the funnel is non-linear, so "the next" status is undefined)*
3. THE Platform SHALL display member growth over time in a chart showing new member approvals by month
4. THE Platform SHALL display upcoming follow-ups showing Potential_Members with next follow-up dates in the next 7 days
5. THE Platform SHALL allow admins to filter dashboard metrics by date range

### Requirement 21: Trust and Safety *(R2, new)*

**User Story:** As a member, I want to block, report, and disconnect from people, so that I feel safe in the community.

#### Acceptance Criteria

1. THE Platform SHALL allow a member to block any other member; WHEN blocked, the two members SHALL not see each other in search, recommendations, or profile view, any Connection SHALL be removed, pending requests between them SHALL be cancelled, and messaging SHALL be disabled
2. THE Platform SHALL not notify the blocked member of the block
3. THE Platform SHALL allow a member to unblock a member they blocked; unblocking SHALL not restore the Connection
4. THE Platform SHALL allow a member to report another member, optionally referencing a specific message, with a reason category (Harassment, Spam, Fake profile, Inappropriate content, Other) and details up to 2,000 characters
5. THE Platform SHALL present reports to admins in a queue with status Open, Resolved, or Dismissed, and SHALL record the resolving admin and a resolution note
6. THE Platform SHALL allow a member to remove a Connection; the message history SHALL remain visible but read-only, and reconnecting SHALL require a new Connection_Request

### Requirement 22: Invitations *(R2, new)*

**User Story:** As an admin, I want to invite prospects directly, so that warm leads can join without waiting in the approval queue.

#### Acceptance Criteria

1. THE Platform SHALL allow admins to send an invitation to an email address, optionally linked to a Potential_Member
2. THE Platform SHALL create a single-use invitation link that expires after 14 days
3. WHEN a user registers through a valid invitation link using the invited email, THE Platform SHALL activate the account without admin review
4. THE Platform SHALL refuse to invite an email or LinkedIn URL that matches a Do_Not_Contact record
5. WHEN an invitation is sent to a Potential_Member, THE Platform SHALL set its status to Invited

### Requirement 23: Admin Management and Audit *(R2, new)*

**User Story:** As an admin, I want to manage the admin team and see who did what, so that operations are accountable.

#### Acceptance Criteria

1. THE Platform SHALL allow admins to grant or revoke admin rights for other users
2. THE Platform SHALL prevent an admin from revoking their own admin rights and SHALL prevent removing the last admin
3. THE Platform SHALL record every admin action (approve, reject, deactivate, reactivate, grant/revoke admin, resolve report, invite, import) in an audit log with actor, target, action, and time
4. THE Platform SHALL allow admins to view the audit log

### Requirement 24: Account Security *(R2, new)*

**User Story:** As a member, I want to verify my email, reset a forgotten password, and change my password, so that my account stays secure.

#### Acceptance Criteria

1. THE Platform SHALL send an email verification link on registration that is single-use and expires after 24 hours, and SHALL allow requesting a new link
2. THE Platform SHALL provide a password reset flow using a single-use link that expires after 1 hour; the request response SHALL not reveal whether the email is registered
3. WHEN a password is reset or changed, THE Platform SHALL end all other sessions and clear login blocks for the account
4. THE Platform SHALL allow a logged-in member to change their password after confirming the current password
5. THE Platform SHALL store emails in normalized (trimmed, lowercase) form and compare them case-insensitively

### Requirement 25: Data Rights *(R2, new)*

**User Story:** As a member, I want to export or delete my data, so that I stay in control of my information.

#### Acceptance Criteria

1. THE Platform SHALL allow a member to download all their data (account, profile, connections, requests, sent and received messages, preferences) as a JSON file
2. THE Platform SHALL allow a member to permanently delete their account after confirming their password
3. WHEN an account is deleted, THE Platform SHALL delete the member's profile, connections, requests, and sent messages, and SHALL show the member as "Deleted member" in other members' conversation lists

## Open Questions for Design Phase

> **R2:** All questions below are resolved. See `design.md` Key Design Decisions and `gap-resolutions.md`.

The following questions should be addressed during the design phase:

1. **Outreach Email Integration**: Should the platform send outreach emails directly or only track external communications? If sending emails, what email service provider should be used?

2. **Relevance Algorithm**: How should relevance be calculated for member recommendations? What weights should be assigned to role matching, expertise overlap, needs/offerings alignment, and other factors?

3. **Membership Model**: Should the platform use open signup, application-based approval, or invite-only access? What criteria determine approval for application-based models?

4. **Profile Completeness**: What profile fields should be required versus optional for each role type? Should there be a minimum completeness threshold before a member can send connection requests?

5. **Spam Prevention**: What rate limits should be applied to connection requests and messages? Should there be a daily limit per member?

6. **Connection Request Expiration**: Should connection requests expire after a certain period of inactivity? If so, what is the appropriate timeout duration?

7. **Search Ranking**: How should member search results be ranked? Should recently active members appear higher, or should relevance matching take precedence?

8. **Data Retention**: How long should Potential_Member records be retained after reaching terminal statuses (Not_Interested, Not_A_Fit, Do_Not_Contact)?

9. **Multi-tenancy**: Is this a single community instance or should the platform support multiple separate communities with isolated data?

10. **Mobile Support**: Should this be a web-only platform or should there be native mobile applications? What features are essential for mobile access?
