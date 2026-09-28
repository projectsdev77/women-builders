# Technical Design Document: Women Builders Platform

## Overview

Women Builders is a professional community platform built as a responsive web application enabling quality network curation and relevant professional discovery. The platform serves women founders, operators, investors, and builders through intelligent member matching, connection management, and admin-driven community growth.

> **Revision 2 (R2).** This design was reviewed in `spec-review.md` and corrected in `gap-resolutions.md`. Where they conflict, **`gap-resolutions.md` and the implementation win**. Sections marked **SUPERSEDED (R2)** are kept for history only. The authoritative schema is `prisma/schema.prisma` in the repository root.

### Key Design Decisions

This design resolves all open questions from the requirements phase:

1. **Outreach Email**: Platform tracks external communications only (no direct email sending for outreach). Notification emails for member activities use Resend.
2. **Relevance Algorithm**: Hybrid scoring combining role matching (30%), needs-offerings alignment (40%), expertise overlap (20%), and activity recency (10%). R2 changes the component formulas (G13)
3. **Membership Model**: Application-based with admin approval (CONFIRMED)
4. **Profile Completeness**: `round(100 × filled / applicable)`; ≥60% plus the primary role's required fields to send connection requests (R2, G15)
5. **Spam Prevention**: 20 connection requests and 200 messages per rolling 24h per member, plus 20 unanswered messages per conversation (R2, G1). Block and report (Req 21) handle abuse
6. **Connection Request Expiration**: 30-day expiration with auto-decline
7. **Search Ranking**: With a text query, 60% text match + 25% relevance + 15% completeness. Without a query, 70% relevance + 30% completeness (R2, G14)
8. **Data Retention**: 2 years for Not_Interested/Not_A_Fit Potential_Members, then soft-archived. Do_Not_Contact records are kept forever as suppression (R2, G8)
9. **Multi-tenancy**: Single community (CONFIRMED)
10. **Mobile Support**: Responsive web app (CONFIRMED)

### Technology Stack

**Frontend**
- **Framework**: Next.js 14 (App Router) - Server-side rendering, file-based routing, optimal SEO
- **Language**: TypeScript - Type safety across entire stack
- **UI Library**: React 18 with React Server Components
- **Styling**: Tailwind CSS - Utility-first, responsive design, dark mode support
- **State Management**: React Server Components + small client fetch hooks with polling for messages (R2)
- **Form Handling**: React Hook Form + Zod - Type-safe validation
- **Component Library**: ~~shadcn/ui~~ **R2:** small in-house Tailwind component set in `components/ui`; the visual design comes from the designer handoff

**Backend**
- **Framework**: Next.js 14 API Routes - Unified codebase, serverless deployment
- **Language**: TypeScript
- **API Pattern**: RESTful with resource-based endpoints
- **Authentication**: ~~NextAuth.js v5~~ **R2:** custom database sessions (hashed token in an HttpOnly cookie, status re-checked every request) plus bcrypt. See G3
- **Email Service**: Resend - Transactional emails for notifications

**Database**
- **Primary Database**: PostgreSQL 15 - Relational data, ACID compliance, advanced querying
- **ORM**: Prisma - Type-safe database client, migration management
- **Search Enhancement**: PostgreSQL full-text search with GIN indexes

**Infrastructure**
- **Hosting**: Vercel - Optimized for Next.js, automatic deployments, edge functions
- **Database Hosting**: Vercel Postgres (Neon) or Supabase - Managed PostgreSQL
- **File Storage**: ~~Vercel Blob Storage~~ **R2:** not in MVP. Initials avatars; CSV parsed in memory (profile photos are Phase 2)
- **Monitoring**: Vercel Analytics + Sentry - Performance and error tracking

**Justification**: This stack provides a unified TypeScript environment from database to UI, excellent developer experience with type safety, cost-effective serverless deployment, and strong community support. Next.js 14 with App Router provides optimal performance through Server Components and streaming.

## Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WebApp[Web Application<br/>Next.js 14]
    end
    
    subgraph "Application Layer"
        API[API Routes<br/>Next.js API]
        Auth[NextAuth.js<br/>Authentication]
        Search[Search Service]
        Recommend[Recommendation Engine]
        Email[Email Service<br/>Resend]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Primary Database)]
        Cache[Session Store]
        Storage[Blob Storage<br/>Files/Images]
    end
    
    WebApp --> API
    WebApp --> Auth
    API --> Search
    API --> Recommend
    API --> Email
    API --> DB
    Auth --> DB
    Auth --> Cache
    Search --> DB
    Recommend --> DB
    API --> Storage
```

### Application Structure

```
women-builders/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth layout group
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (member)/                 # Member layout group
│   │   ├── dashboard/
│   │   ├── search/
│   │   ├── profile/
│   │   ├── connections/
│   │   ├── messages/
│   │   └── layout.tsx
│   ├── (admin)/                  # Admin layout group
│   │   ├── dashboard/
│   │   ├── members/
│   │   ├── potential-members/
│   │   └── layout.tsx
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   ├── members/
│   │   ├── connections/
│   │   ├── messages/
│   │   ├── recommendations/
│   │   └── admin/
│   └── layout.tsx
├── components/                    # React components
│   ├── ui/                       # shadcn/ui components
│   ├── forms/
│   ├── layouts/
│   └── features/
├── lib/                          # Shared utilities
│   ├── db/                       # Database utilities
│   ├── auth/                     # Auth configuration
│   ├── services/                 # Business logic
│   │   ├── recommendation.ts
│   │   ├── search.ts
│   │   └── relevance.ts
│   ├── validations/              # Zod schemas
│   └── utils/
├── prisma/                       # Database
│   ├── schema.prisma
│   └── migrations/
└── public/                       # Static assets
```

## Components and Interfaces

### Core Services

#### Authentication Service
```typescript
interface AuthService {
  // User authentication
  login(email: string, password: string): Promise<Session>;
  logout(): Promise<void>;
  register(data: RegistrationData): Promise<User>;
  
  // Session management
  getSession(): Promise<Session | null>;
  validateSession(token: string): Promise<boolean>;
  
  // Password management
  validatePassword(password: string): ValidationResult;
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
}
```

#### Search Service
```typescript
interface SearchService {
  // Member search
  searchMembers(query: SearchQuery): Promise<SearchResult[]>;
  
  // Filters
  applyFilters(members: Member[], filters: SearchFilters): Member[];
  
  // Ranking
  rankResults(members: Member[], query: string, requestingMemberId: string): Member[];
}

interface SearchQuery {
  text?: string;
  primaryRole?: RoleType[];
  secondaryRole?: RoleType[];
  expertise?: string[];
  location?: string;
  page: number;
  limit: number;
}

interface SearchFilters {
  roles?: RoleType[];
  expertise?: string[];
  location?: string;
}

interface SearchResult {
  member: Member;
  relevanceScore: number;
  matchReasons: string[];
}
```

#### Recommendation Engine
```typescript
interface RecommendationEngine {
  // Generate recommendations
  generateRecommendations(memberId: string): Promise<Recommendation[]>;
  
  // Relevance calculation
  calculateRelevance(member1: Member, member2: Member): RelevanceScore;
  
  // Dismiss handling
  dismissRecommendation(memberId: string, recommendedId: string): Promise<void>;
}

interface Recommendation {
  member: Member;
  relevanceScore: number;
  explanation: string;
  reasons: RecommendationReason[];
}

interface RelevanceScore {
  total: number;
  breakdown: {
    roleMatch: number;        // 30% weight
    needsOfferings: number;   // 40% weight
    expertiseOverlap: number; // 20% weight
    activityRecency: number;  // 10% weight
  };
}

interface RecommendationReason {
  type: 'role_match' | 'needs_offering' | 'expertise' | 'mutual_connection';
  description: string;
}
```

#### Connection Service
```typescript
interface ConnectionService {
  // Connection requests
  sendRequest(fromId: string, toId: string, message: string): Promise<ConnectionRequest>;
  acceptRequest(requestId: string): Promise<Connection>;
  declineRequest(requestId: string): Promise<void>;
  cancelRequest(requestId: string): Promise<void>;
  
  // Connection management
  getConnections(memberId: string): Promise<Connection[]>;
  getPendingRequests(memberId: string): Promise<ConnectionRequest[]>;
  
  // Rate limiting
  checkRequestLimit(memberId: string): Promise<boolean>;
  
  // Expiration
  expireOldRequests(): Promise<number>; // Returns count of expired
}
```

#### Messaging Service
```typescript
interface MessagingService {
  // Send messages
  sendMessage(fromId: string, toId: string, content: string): Promise<Message>;
  
  // Retrieve messages
  getConversation(member1Id: string, member2Id: string): Promise<Message[]>;
  getConversationList(memberId: string): Promise<Conversation[]>;
  
  // Message management
  markAsRead(messageId: string): Promise<void>;
  
  // Rate limiting
  checkMessageLimit(memberId: string): Promise<boolean>;
}

interface Conversation {
  otherMember: Member;
  lastMessage: Message;
  unreadCount: number;
}
```

#### Notification Service
```typescript
interface NotificationService {
  // Email notifications
  sendConnectionRequestEmail(to: string, from: Member): Promise<void>;
  sendConnectionAcceptedEmail(to: string, accepter: Member): Promise<void>;
  sendMessageEmail(to: string, from: Member, preview: string): Promise<void>;
  sendWelcomeEmail(to: string, member: Member): Promise<void>;
  
  // Preference checking
  shouldSendNotification(memberId: string, type: NotificationType): Promise<boolean>;
}

type NotificationType = 'connection_request' | 'connection_accepted' | 'new_message';
```

#### Admin Service
```typescript
interface AdminService {
  // Potential member management
  createPotentialMember(data: PotentialMemberData): Promise<PotentialMember>;
  importPotentialMembers(csvData: string): Promise<ImportResult>;
  updateOutreachStatus(id: string, status: OutreachStatus): Promise<PotentialMember>;
  addOutreachNote(id: string, note: string): Promise<void>;
  
  // Member management
  approveMember(memberId: string): Promise<void>;
  deactivateMember(memberId: string): Promise<void>;
  reactivateMember(memberId: string): Promise<void>;
  
  // Analytics
  getDashboardMetrics(dateRange?: DateRange): Promise<DashboardMetrics>;
  getConversionFunnel(dateRange?: DateRange): Promise<ConversionMetrics>;
}

interface ImportResult {
  successful: number;
  skipped: number;
  errors: ImportError[];
}

interface DashboardMetrics {
  activeMemberCount: number;
  pendingApplicationCount: number;
  potentialMembersByStatus: Record<OutreachStatus, number>;
  upcomingFollowUps: PotentialMember[];
  memberGrowth: MonthlyGrowth[];
}
```

### Component Architecture

#### Profile Completeness System
```typescript
interface ProfileCompletenessService {
  calculateCompleteness(member: Member): number;
  getRequiredFields(role: RoleType): string[];
  getOptionalFields(role: RoleType): string[];
  canSendConnectionRequests(member: Member): boolean;
}

// Required fields by role
const REQUIRED_FIELDS = {
  FOUNDER: ['name', 'email', 'primaryRole', 'companyName', 'companyStage', 'industry'],
  OPERATOR: ['name', 'email', 'primaryRole', 'functionalExpertise', 'seniorityLevel'],
  INVESTOR: ['name', 'email', 'primaryRole', 'investmentStage', 'checkSizeRange'],
  BUILDER: ['name', 'email', 'primaryRole', 'technicalSkills']
};

// 60% threshold = Required fields + at least 2 optional fields per role
const COMPLETENESS_THRESHOLD = 60;
```

## Data Models

### Database Schema

> **SUPERSEDED (R2).** The authoritative schema is `prisma/schema.prisma`. Main changes: sessions, tokens, login attempts, blocks, reports, invitations, audit log, email outbox, status history; canonical connection pairs; no RateLimit table; optional prospect email; date-only follow-ups.

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum RoleType {
  FOUNDER
  OPERATOR
  INVESTOR
  BUILDER
}

enum OutreachStatus {
  IDENTIFIED
  REVIEWED
  CONTACTED
  FOLLOW_UP_NEEDED
  INTERESTED
  INVITED
  APPLIED
  APPROVED
  NOT_INTERESTED
  NOT_A_FIT
  DO_NOT_CONTACT
}

enum AccountStatus {
  PENDING
  ACTIVE
  DEACTIVATED
}

enum ConnectionRequestStatus {
  PENDING
  ACCEPTED
  DECLINED
  CANCELLED
  EXPIRED
}

model User {
  id                String         @id @default(cuid())
  email             String         @unique
  passwordHash      String
  name              String
  isAdmin           Boolean        @default(false)
  accountStatus     AccountStatus  @default(PENDING)
  failedLoginAttempts Int          @default(0)
  lastFailedLogin   DateTime?
  accountLockedUntil DateTime?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  // Relations
  profile           Profile?
  sentRequests      ConnectionRequest[] @relation("RequestSender")
  receivedRequests  ConnectionRequest[] @relation("RequestReceiver")
  connections1      Connection[]   @relation("Connection1")
  connections2      Connection[]   @relation("Connection2")
  sentMessages      Message[]      @relation("MessageSender")
  receivedMessages  Message[]      @relation("MessageReceiver")
  dismissedRecommendations DismissedRecommendation[]
  notificationPreferences NotificationPreference[]
  
  @@index([email])
}

model Profile {
  id                String     @id @default(cuid())
  userId            String     @unique
  user              User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Core information
  primaryRole       RoleType
  secondaryRoles    RoleType[]
  professionalBackground String? @db.Text
  expertiseAreas    String[]   // Array of expertise tags
  currentFocus      String?    @db.Text
  needs             String?    @db.Text
  offerings         String?    @db.Text
  location          String?
  profileImageUrl   String?
  
  // Profile completeness
  completenessScore Int        @default(0)
  
  // Founder-specific
  companyName       String?
  companyStage      String?    // Seed, Series A, Series B, etc.
  industry          String?
  fundingStatus     String?
  
  // Operator-specific
  functionalExpertise String? // Engineering, Marketing, Sales, etc.
  seniorityLevel    String?    // IC, Manager, Director, VP, C-Level
  operationalFocus  String[]
  
  // Investor-specific
  investmentStage   String?    // Pre-seed, Seed, Series A, etc.
  checkSizeMin      Int?       // In thousands
  checkSizeMax      Int?       // In thousands
  sectorPreferences String[]
  
  // Builder-specific
  technicalSkills   String[]
  projectTypes      String[]
  collaborationInterests String? @db.Text
  
  // Privacy settings
  hiddenFields      String[]   // Field names hidden from non-connections
  
  // Activity tracking
  lastActive        DateTime   @default(now())
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  
  @@index([primaryRole])
  @@index([expertiseAreas])
}

model ConnectionRequest {
  id            String                   @id @default(cuid())
  senderId      String
  sender        User                     @relation("RequestSender", fields: [senderId], references: [id], onDelete: Cascade)
  receiverId    String
  receiver      User                     @relation("RequestReceiver", fields: [receiverId], references: [id], onDelete: Cascade)
  message       String                   @db.VarChar(500)
  status        ConnectionRequestStatus  @default(PENDING)
  expiresAt     DateTime                 // Set to createdAt + 30 days
  respondedAt   DateTime?
  createdAt     DateTime                 @default(now())
  
  @@unique([senderId, receiverId])
  @@index([receiverId, status])
  @@index([senderId, status])
  @@index([expiresAt, status])
}

model Connection {
  id          String   @id @default(cuid())
  user1Id     String
  user1       User     @relation("Connection1", fields: [user1Id], references: [id], onDelete: Cascade)
  user2Id     String
  user2       User     @relation("Connection2", fields: [user2Id], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  
  // Messages in this connection
  messages    Message[]
  
  @@unique([user1Id, user2Id])
  @@index([user1Id])
  @@index([user2Id])
}

model Message {
  id           String     @id @default(cuid())
  connectionId String
  connection   Connection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  senderId     String
  sender       User       @relation("MessageSender", fields: [senderId], references: [id], onDelete: Cascade)
  receiverId   String
  receiver     User       @relation("MessageReceiver", fields: [receiverId], references: [id], onDelete: Cascade)
  content      String     @db.Text
  isRead       Boolean    @default(false)
  createdAt    DateTime   @default(now())
  
  @@index([connectionId, createdAt])
  @@index([receiverId, isRead])
}

model DismissedRecommendation {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dismissedUserId String
  dismissedAt   DateTime @default(now())
  showAgainAfter DateTime // dismissedAt + 30 days
  
  @@unique([userId, dismissedUserId])
  @@index([userId, showAgainAfter])
}

model NotificationPreference {
  id                    String  @id @default(cuid())
  userId                String
  user                  User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  connectionRequest     Boolean @default(true)
  connectionAccepted    Boolean @default(true)
  newMessage            Boolean @default(true)
  updatedAt             DateTime @updatedAt
  
  @@unique([userId])
}

model RateLimit {
  id                String   @id @default(cuid())
  userId            String
  resourceType      String   // 'connection_request' or 'message'
  count             Int      @default(0)
  windowStart       DateTime @default(now())
  
  @@unique([userId, resourceType, windowStart])
  @@index([userId, resourceType])
}

model PotentialMember {
  id              String         @id @default(cuid())
  email           String         @unique
  name            String
  linkedInUrl     String?
  company         String?
  role            String?
  discoverySource String?        // Event, referral, research, etc.
  referrerName    String?
  referrerEmail   String?
  
  // Outreach tracking
  outreachStatus  OutreachStatus @default(IDENTIFIED)
  nextFollowUpDate DateTime?
  
  // Timestamps
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  
  // Relations
  notes           OutreachNote[]
  outreachHistory OutreachAttempt[]
  
  @@index([email])
  @@index([outreachStatus])
  @@index([nextFollowUpDate])
}

model OutreachNote {
  id                String          @id @default(cuid())
  potentialMemberId String
  potentialMember   PotentialMember @relation(fields: [potentialMemberId], references: [id], onDelete: Cascade)
  content           String          @db.Text
  createdBy         String          // Admin user ID
  createdAt         DateTime        @default(now())
  
  @@index([potentialMemberId, createdAt])
}

model OutreachAttempt {
  id                String          @id @default(cuid())
  potentialMemberId String
  potentialMember   PotentialMember @relation(fields: [potentialMemberId], references: [id], onDelete: Cascade)
  attemptDate       DateTime        @default(now())
  method            String          // Email, LinkedIn, Event, etc.
  outcome           String?         @db.Text
  newStatus         OutreachStatus
  createdBy         String          // Admin user ID
  
  @@index([potentialMemberId, attemptDate])
}
```

### Entity Relationships

```mermaid
erDiagram
    User ||--o| Profile : has
    User ||--o{ ConnectionRequest : sends
    User ||--o{ ConnectionRequest : receives
    User ||--o{ Connection : participates
    User ||--o{ Message : sends
    User ||--o{ Message : receives
    User ||--o{ DismissedRecommendation : dismisses
    User ||--|| NotificationPreference : has
    Connection ||--o{ Message : contains
    PotentialMember ||--o{ OutreachNote : has
    PotentialMember ||--o{ OutreachAttempt : has
```

## API Design

### Authentication Endpoints

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/session
POST /api/auth/reset-password
```

### Member Endpoints

```
GET    /api/members               # Search members (with query params)
GET    /api/members/:id           # Get member profile
PATCH  /api/members/:id           # Update own profile
GET    /api/members/me            # Get current user profile
DELETE /api/members/me            # Deactivate own account
```

**GET /api/members** - Search and filter members
```typescript
// Query parameters
interface MemberSearchParams {
  q?: string;                    // Text search
  primaryRole?: RoleType[];      // Filter by primary role
  secondaryRole?: RoleType[];    // Filter by secondary roles
  expertise?: string[];          // Filter by expertise tags
  location?: string;             // Filter by location
  page?: number;                 // Pagination (default: 1)
  limit?: number;                // Results per page (default: 20, max: 50)
}

// Response
interface MemberSearchResponse {
  members: MemberListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface MemberListItem {
  id: string;
  name: string;
  primaryRole: RoleType;
  secondaryRoles: RoleType[];
  expertiseAreas: string[];
  location?: string;
  profileImageUrl?: string;
  relevanceScore?: number;      // When searching with context
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected';
}
```

**GET /api/members/:id** - Get detailed member profile
```typescript
interface MemberProfileResponse {
  id: string;
  name: string;
  primaryRole: RoleType;
  secondaryRoles: RoleType[];
  professionalBackground?: string;
  expertiseAreas: string[];
  currentFocus?: string;
  needs?: string;
  offerings?: string;
  location?: string;
  profileImageUrl?: string;
  
  // Role-specific (visible based on roles)
  founderInfo?: FounderInfo;
  operatorInfo?: OperatorInfo;
  investorInfo?: InvestorInfo;
  builderInfo?: BuilderInfo;
  
  // Metadata
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected';
  completenessScore: number;
  memberSince: string;
  
  // Privacy: Some fields may be null if hidden and not connected
}
```

### Connection Endpoints

```
GET    /api/connections                    # List user's connections
GET    /api/connections/requests           # Get pending requests (in/out)
POST   /api/connections/requests           # Send connection request
POST   /api/connections/requests/:id/accept # Accept request
POST   /api/connections/requests/:id/decline # Decline request
DELETE /api/connections/requests/:id       # Cancel outgoing request
```

**POST /api/connections/requests** - Send connection request
```typescript
interface SendConnectionRequestBody {
  receiverId: string;
  message: string;  // Max 500 chars
}

interface SendConnectionRequestResponse {
  requestId: string;
  status: 'sent' | 'rate_limited' | 'already_connected';
  message?: string;
}

// Rate limit: 20 requests per day
// Returns 429 if limit exceeded
```

### Message Endpoints

```
GET  /api/messages/conversations         # List conversations
GET  /api/messages/conversations/:userId # Get conversation with specific user
POST /api/messages                       # Send message
PATCH /api/messages/:id/read            # Mark as read
```

**POST /api/messages** - Send message
```typescript
interface SendMessageBody {
  receiverId: string;
  content: string;
}

interface SendMessageResponse {
  messageId: string;
  status: 'sent' | 'rate_limited' | 'not_connected';
}

// Rate limit: 50 messages per day
// Requires active connection
```

### Recommendation Endpoints

```
GET    /api/recommendations              # Get personalized recommendations
POST   /api/recommendations/:id/dismiss  # Dismiss recommendation
```

**GET /api/recommendations** - Get member recommendations
```typescript
interface RecommendationResponse {
  recommendations: RecommendationItem[];
  count: number;
}

interface RecommendationItem {
  member: MemberListItem;
  relevanceScore: number;
  explanation: string;
  reasons: Array<{
    type: 'role_match' | 'needs_offering' | 'expertise' | 'mutual_connection';
    description: string;
  }>;
}

// Returns 5-20 recommendations
// Refreshes when profile is updated
```

### Admin Endpoints

```
# Potential Members
GET    /api/admin/potential-members          # Search potential members
POST   /api/admin/potential-members          # Create potential member
POST   /api/admin/potential-members/import   # Bulk import from CSV
PATCH  /api/admin/potential-members/:id      # Update potential member
POST   /api/admin/potential-members/:id/notes # Add note
POST   /api/admin/potential-members/:id/outreach # Log outreach attempt

# Member Management
GET    /api/admin/members                    # List all members
POST   /api/admin/members/:id/approve        # Approve pending member
POST   /api/admin/members/:id/deactivate     # Deactivate member
POST   /api/admin/members/:id/reactivate     # Reactivate member

# Analytics
GET    /api/admin/dashboard                  # Dashboard metrics
GET    /api/admin/analytics/conversion       # Conversion funnel
```

**POST /api/admin/potential-members/import** - Bulk CSV import
```typescript
interface ImportPotentialMembersBody {
  csvData: string;  // CSV content as string
}

interface ImportResponse {
  successful: number;
  skipped: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
  summary: {
    duplicates: string[];  // Emails that were skipped
    invalid: string[];     // Emails with validation errors
  };
}

// CSV format:
// name,email,company,role,linkedInUrl,discoverySource
```

### Error Response Format

All API endpoints use consistent error responses:

```typescript
interface ErrorResponse {
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message
    details?: unknown;      // Additional error context
  };
}

// Common error codes:
// - UNAUTHORIZED: Not logged in
// - FORBIDDEN: Insufficient permissions
// - NOT_FOUND: Resource doesn't exist
// - VALIDATION_ERROR: Invalid input
// - RATE_LIMITED: Too many requests
// - CONFLICT: Resource conflict (e.g., duplicate)
// - INTERNAL_ERROR: Server error
```

## Security and Authentication

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as NextAuth
    participant DB as Database
    
    U->>F: Enter credentials
    F->>A: POST /api/auth/signin
    A->>DB: Query user
    DB-->>A: User record
    A->>A: Verify password
    A->>A: Check account status
    A->>DB: Create session
    A-->>F: Session cookie
    F-->>U: Redirect to dashboard
```

### NextAuth.js Configuration

> **SUPERSEDED (R2).** See `gap-resolutions.md` and the implementation in `lib/`.


```typescript
// lib/auth/auth.config.ts
import { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/db';

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        const { email, password } = credentials;
        
        // Find user
        const user = await prisma.user.findUnique({
          where: { email: email as string },
          include: { profile: true }
        });
        
        if (!user) return null;
        
        // Check account lock
        if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
          throw new Error('Account temporarily locked');
        }
        
        // Verify password
        const isValid = await compare(password as string, user.passwordHash);
        
        if (!isValid) {
          await handleFailedLogin(user.id);
          return null;
        }
        
        // Check account status
        if (user.accountStatus === 'DEACTIVATED') {
          throw new Error('Account deactivated');
        }
        
        // Reset failed attempts
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lastFailedLogin: null }
        });
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          accountStatus: user.accountStatus
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.accountStatus = user.accountStatus;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.isAdmin = token.isAdmin;
      session.user.accountStatus = token.accountStatus;
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  }
};

async function handleFailedLogin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true, lastFailedLogin: true }
  });
  
  if (!user) return;
  
  // Check if within 15-minute window
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const isWithinWindow = user.lastFailedLogin && user.lastFailedLogin > fifteenMinutesAgo;
  
  const newAttempts = isWithinWindow ? user.failedLoginAttempts + 1 : 1;
  
  // Lock account if 5 attempts within 15 minutes
  const shouldLock = newAttempts >= 5;
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: newAttempts,
      lastFailedLogin: new Date(),
      accountLockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null
    }
  });
}
```

### Authorization Middleware

```typescript
// lib/auth/middleware.ts
import { getServerSession } from 'next-auth';
import { authConfig } from './auth.config';

export async function requireAuth() {
  const session = await getServerSession(authConfig);
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (!session.user.isAdmin) {
    throw new Error('FORBIDDEN');
  }
  return session;
}

export async function requireActiveAccount() {
  const session = await requireAuth();
  if (session.user.accountStatus !== 'ACTIVE') {
    throw new Error('ACCOUNT_NOT_ACTIVE');
  }
  return session;
}
```

### Password Security

```typescript
// lib/auth/password.ts
import { hash, compare } from 'bcryptjs';
import { z } from 'zod';

const SALT_ROUNDS = 12;

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

export function validatePassword(password: string) {
  return passwordSchema.safeParse(password);
}
```

### Rate Limiting

> **SUPERSEDED (R2).** See `gap-resolutions.md` and the implementation in `lib/`.

```typescript
// lib/services/rate-limit.ts
import { prisma } from '@/lib/db';

const LIMITS = {
  connection_request: { count: 20, windowHours: 24 },
  message: { count: 50, windowHours: 24 }
};

export async function checkRateLimit(
  userId: string,
  resourceType: 'connection_request' | 'message'
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = LIMITS[resourceType];
  const windowStart = new Date(Date.now() - limit.windowHours * 60 * 60 * 1000);
  
  // Clean old records
  await prisma.rateLimit.deleteMany({
    where: {
      userId,
      resourceType,
      windowStart: { lt: windowStart }
    }
  });
  
  // Get or create current window
  const currentWindow = await prisma.rateLimit.upsert({
    where: {
      userId_resourceType_windowStart: {
        userId,
        resourceType,
        windowStart
      }
    },
    create: {
      userId,
      resourceType,
      windowStart,
      count: 0
    },
    update: {}
  });
  
  const allowed = currentWindow.count < limit.count;
  const remaining = Math.max(0, limit.count - currentWindow.count);
  
  return { allowed, remaining };
}

export async function incrementRateLimit(
  userId: string,
  resourceType: 'connection_request' | 'message'
): Promise<void> {
  const limit = LIMITS[resourceType];
  const windowStart = new Date(Date.now() - limit.windowHours * 60 * 60 * 1000);
  
  await prisma.rateLimit.upsert({
    where: {
      userId_resourceType_windowStart: {
        userId,
        resourceType,
        windowStart
      }
    },
    create: {
      userId,
      resourceType,
      windowStart,
      count: 1
    },
    update: {
      count: { increment: 1 }
    }
  });
}
```

### Data Privacy and Field Visibility

> **SUPERSEDED (R2).** See `gap-resolutions.md` and the implementation in `lib/`.


```typescript
// lib/services/privacy.ts
export function filterProfileFields(
  profile: Profile,
  viewerId: string,
  isConnected: boolean
): Partial<Profile> {
  const filtered = { ...profile };
  
  // If not connected, respect hidden fields
  if (!isConnected && profile.hiddenFields.length > 0) {
    profile.hiddenFields.forEach(field => {
      if (field in filtered) {
        filtered[field] = null;
      }
    });
  }
  
  return filtered;
}
```


## Relevance Algorithm Implementation

### Relevance Calculation

> **SUPERSEDED (R2, G13).** The tokenizer, needs/offerings formula (now cosine) and role matrix (now symmetric over all roles) changed. See `lib/services/relevance.ts`.

The recommendation engine uses a hybrid scoring system with four weighted components:

```typescript
// lib/services/relevance.ts

interface RelevanceComponents {
  roleMatch: number;        // 0-100, weight: 30%
  needsOfferings: number;   // 0-100, weight: 40%
  expertiseOverlap: number; // 0-100, weight: 20%
  activityRecency: number;  // 0-100, weight: 10%
}

export function calculateRelevance(
  member: MemberWithProfile,
  targetMember: MemberWithProfile
): RelevanceScore {
  const components: RelevanceComponents = {
    roleMatch: calculateRoleMatch(member, targetMember),
    needsOfferings: calculateNeedsOfferingsAlignment(member, targetMember),
    expertiseOverlap: calculateExpertiseOverlap(member, targetMember),
    activityRecency: calculateActivityRecency(targetMember)
  };
  
  // Weighted average
  const total = 
    components.roleMatch * 0.30 +
    components.needsOfferings * 0.40 +
    components.expertiseOverlap * 0.20 +
    components.activityRecency * 0.10;
  
  return {
    total: Math.round(total),
    breakdown: components
  };
}

function calculateRoleMatch(
  member: MemberWithProfile,
  target: MemberWithProfile
): number {
  let score = 0;
  
  // Primary role complementarity (founders <-> investors, operators <-> founders, etc.)
  const complementaryRoles = {
    FOUNDER: ['INVESTOR', 'OPERATOR', 'BUILDER'],
    INVESTOR: ['FOUNDER'],
    OPERATOR: ['FOUNDER', 'OPERATOR'],
    BUILDER: ['FOUNDER', 'OPERATOR', 'BUILDER']
  };
  
  const targetRoles = [target.profile.primaryRole, ...target.profile.secondaryRoles];
  const isComplementary = targetRoles.some(role =>
    complementaryRoles[member.profile.primaryRole]?.includes(role)
  );
  
  if (isComplementary) {
    score += 70;
  }
  
  // Same role bonus (for peer connections)
  if (target.profile.primaryRole === member.profile.primaryRole) {
    score += 30;
  }
  
  return Math.min(100, score);
}

function calculateNeedsOfferingsAlignment(
  member: MemberWithProfile,
  target: MemberWithProfile
): number {
  // Text analysis: Check if member's needs overlap with target's offerings
  // and vice versa (bidirectional matching)
  
  const memberNeeds = tokenizeAndNormalize(member.profile.needs || '');
  const memberOfferings = tokenizeAndNormalize(member.profile.offerings || '');
  const targetNeeds = tokenizeAndNormalize(target.profile.needs || '');
  const targetOfferings = tokenizeAndNormalize(target.profile.offerings || '');
  
  if (memberNeeds.length === 0 && targetNeeds.length === 0) {
    return 0; // No data to match
  }
  
  // Calculate bidirectional overlap
  const memberNeedsTargetOffersOverlap = calculateOverlap(memberNeeds, targetOfferings);
  const targetNeedsMemberOffersOverlap = calculateOverlap(targetNeeds, memberOfferings);
  
  // Average the two directions
  const avgOverlap = (memberNeedsTargetOffersOverlap + targetNeedsMemberOffersOverlap) / 2;
  
  return Math.min(100, avgOverlap * 100);
}

function calculateExpertiseOverlap(
  member: MemberWithProfile,
  target: MemberWithProfile
): number {
  const memberExpertise = new Set(member.profile.expertiseAreas);
  const targetExpertise = new Set(target.profile.expertiseAreas);
  
  if (memberExpertise.size === 0 || targetExpertise.size === 0) {
    return 0;
  }
  
  const intersection = new Set(
    [...memberExpertise].filter(x => targetExpertise.has(x))
  );
  
  // Jaccard similarity
  const union = new Set([...memberExpertise, ...targetExpertise]);
  const similarity = intersection.size / union.size;
  
  return Math.round(similarity * 100);
}

function calculateActivityRecency(target: MemberWithProfile): number {
  const lastActive = new Date(target.profile.lastActive);
  const now = new Date();
  const daysSinceActive = Math.floor(
    (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Decay function: 100 for today, decreasing to 0 at 90 days
  if (daysSinceActive === 0) return 100;
  if (daysSinceActive >= 90) return 0;
  
  return Math.max(0, 100 - Math.round((daysSinceActive / 90) * 100));
}

// Helper functions
function tokenizeAndNormalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3) // Filter out short words
    .filter(word => !STOP_WORDS.has(word));
}

function calculateOverlap(set1: string[], set2: string[]): number {
  if (set1.length === 0 || set2.length === 0) return 0;
  
  const s1 = new Set(set1);
  const s2 = new Set(set2);
  const intersection = new Set([...s1].filter(x => s2.has(x)));
  
  return intersection.size / Math.min(s1.size, s2.size);
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have',
  'need', 'looking', 'seeking', 'offering', 'provide'
]);
```

### Search Ranking Algorithm

> **SUPERSEDED (R2).** See `gap-resolutions.md` and the implementation in `lib/`.


```typescript
// lib/services/search.ts

export function rankSearchResults(
  members: MemberWithProfile[],
  query: string,
  requestingMemberId: string,
  requestingMember: MemberWithProfile
): MemberSearchResult[] {
  return members.map(member => {
    // Calculate relevance to requesting member
    const relevance = calculateRelevance(requestingMember, member);
    
    // Text match score (for search query)
    const textScore = calculateTextMatchScore(member, query);
    
    // Profile completeness score (0-100)
    const completeness = member.profile.completenessScore;
    
    // Combined ranking score
    // 70% relevance, 30% completeness
    const rankingScore = (relevance.total * 0.70) + (completeness * 0.30);
    
    return {
      member,
      relevanceScore: relevance.total,
      rankingScore,
      textMatchScore: textScore
    };
  })
  .sort((a, b) => b.rankingScore - a.rankingScore);
}

function calculateTextMatchScore(member: MemberWithProfile, query: string): number {
  if (!query) return 0;
  
  const queryTerms = tokenizeAndNormalize(query);
  const searchableText = [
    member.name,
    member.profile.professionalBackground || '',
    member.profile.currentFocus || '',
    ...member.profile.expertiseAreas
  ].join(' ').toLowerCase();
  
  const matches = queryTerms.filter(term =>
    searchableText.includes(term)
  );
  
  return queryTerms.length > 0 ? (matches.length / queryTerms.length) * 100 : 0;
}
```

## Testing Strategy

### Testing Approach

This is a web application with complex business logic, user interactions, and data relationships. The testing strategy combines:

1. **Unit Tests**: Business logic, utility functions, validation schemas
2. **Integration Tests**: API endpoints, database operations, service interactions
3. **E2E Tests**: Critical user journeys, authentication flows
4. **Manual Testing**: UX flows, responsive design, accessibility

**Property-based testing is NOT applicable** for this feature because:
- The platform is primarily a web application with UI rendering, database CRUD operations, and external integrations
- Most functionality involves side effects (database writes, email sending, session management)
- Business rules are specific scenario-based rather than universal mathematical properties
- Testing approach should focus on example-based tests for specific user scenarios and integration tests for system behavior

### Test Coverage Goals

- **Unit Tests**: 80%+ coverage for service layer
- **Integration Tests**: All API endpoints
- **E2E Tests**: 5 critical user journeys

### Testing Stack

> **R2:** Vitest for unit and integration tests (the tasks.md reference to Jest is corrected). Core service tests are required.

```typescript
// Testing dependencies
{
  "vitest": "^1.0.0",           // Unit test framework
  "playwright": "^1.40.0",       // E2E testing
  "@testing-library/react": "^14.0.0",  // Component testing
  "msw": "^2.0.0",               // API mocking
  "prisma": "^5.0.0"             // Test database
}
```

### Unit Tests

#### Service Layer Tests

```typescript
// __tests__/services/relevance.test.ts
import { describe, it, expect } from 'vitest';
import { calculateRelevance } from '@/lib/services/relevance';

describe('Relevance Algorithm', () => {
  it('should score complementary roles highly', () => {
    const founder = createMockMember({ primaryRole: 'FOUNDER' });
    const investor = createMockMember({ primaryRole: 'INVESTOR' });
    
    const score = calculateRelevance(founder, investor);
    
    expect(score.breakdown.roleMatch).toBeGreaterThan(70);
  });
  
  it('should match needs with offerings', () => {
    const member1 = createMockMember({
      needs: 'fundraising advice',
      offerings: 'technical expertise'
    });
    const member2 = createMockMember({
      needs: 'technical expertise',
      offerings: 'fundraising advice'
    });
    
    const score = calculateRelevance(member1, member2);
    
    expect(score.breakdown.needsOfferings).toBeGreaterThan(50);
  });
  
  it('should calculate expertise overlap correctly', () => {
    const member1 = createMockMember({
      expertiseAreas: ['machine-learning', 'python', 'cloud']
    });
    const member2 = createMockMember({
      expertiseAreas: ['machine-learning', 'cloud', 'devops']
    });
    
    const score = calculateRelevance(member1, member2);
    
    // 2 overlapping out of 4 unique = 50% Jaccard
    expect(score.breakdown.expertiseOverlap).toBeCloseTo(50, 0);
  });
  
  it('should penalize inactive members', () => {
    const activeMember = createMockMember({
      lastActive: new Date()
    });
    const inactiveMember = createMockMember({
      lastActive: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000) // 91 days ago
    });
    
    const member = createMockMember({ primaryRole: 'FOUNDER' });
    
    const activeScore = calculateRelevance(member, activeMember);
    const inactiveScore = calculateRelevance(member, inactiveMember);
    
    expect(activeScore.total).toBeGreaterThan(inactiveScore.total);
  });
});
```

#### Validation Tests

```typescript
// __tests__/validations/profile.test.ts
import { describe, it, expect } from 'vitest';
import { profileSchema } from '@/lib/validations/profile';

describe('Profile Validation', () => {
  it('should require primary role', () => {
    const result = profileSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@example.com'
    });
    
    expect(result.success).toBe(false);
  });
  
  it('should validate founder-specific fields', () => {
    const result = profileSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@example.com',
      primaryRole: 'FOUNDER',
      companyName: 'StartupCo'
    });
    
    expect(result.success).toBe(true);
  });
  
  it('should enforce connection request message length', () => {
    const longMessage = 'a'.repeat(501);
    
    const result = connectionRequestSchema.safeParse({
      receiverId: 'user123',
      message: longMessage
    });
    
    expect(result.success).toBe(false);
  });
});
```

### Integration Tests

#### API Endpoint Tests

```typescript
// __tests__/api/connections.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { testClient } from '@/tests/setup';
import { prisma } from '@/lib/db';

describe('Connection API', () => {
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.connectionRequest.deleteMany(),
      prisma.connection.deleteMany(),
      prisma.user.deleteMany()
    ]);
  });
  
  it('should send connection request', async () => {
    const sender = await createTestUser({ name: 'Sender' });
    const receiver = await createTestUser({ name: 'Receiver' });
    
    const response = await testClient
      .post('/api/connections/requests')
      .auth(sender.id)
      .send({
        receiverId: receiver.id,
        message: 'Would love to connect'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('sent');
    
    const request = await prisma.connectionRequest.findFirst({
      where: { senderId: sender.id, receiverId: receiver.id }
    });
    
    expect(request).toBeTruthy();
    expect(request?.status).toBe('PENDING');
  });
  
  it('should enforce rate limits on connection requests', async () => {
    const sender = await createTestUser();
    const receivers = await Promise.all(
      Array(21).fill(null).map(() => createTestUser())
    );
    
    // Send 20 requests (should succeed)
    for (let i = 0; i < 20; i++) {
      const response = await testClient
        .post('/api/connections/requests')
        .auth(sender.id)
        .send({ receiverId: receivers[i].id, message: 'Hi' });
      
      expect(response.status).toBe(200);
    }
    
    // 21st request should be rate limited
    const response = await testClient
      .post('/api/connections/requests')
      .auth(sender.id)
      .send({ receiverId: receivers[20].id, message: 'Hi' });
    
    expect(response.status).toBe(429);
  });
  
  it('should create connection when request is accepted', async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    
    const request = await prisma.connectionRequest.create({
      data: {
        senderId: sender.id,
        receiverId: receiver.id,
        message: 'Test',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    
    const response = await testClient
      .post(`/api/connections/requests/${request.id}/accept`)
      .auth(receiver.id);
    
    expect(response.status).toBe(200);
    
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { user1Id: sender.id, user2Id: receiver.id },
          { user1Id: receiver.id, user2Id: sender.id }
        ]
      }
    });
    
    expect(connection).toBeTruthy();
  });
});
```

#### Recommendation Engine Tests

```typescript
// __tests__/services/recommendations.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { generateRecommendations } from '@/lib/services/recommendations';
import { prisma } from '@/lib/db';

describe('Recommendation Engine', () => {
  beforeEach(async () => {
    await seedTestDatabase();
  });
  
  it('should generate 5-20 recommendations', async () => {
    const member = await createTestMember({
      primaryRole: 'FOUNDER',
      needs: 'fundraising',
      expertiseAreas: ['saas', 'b2b']
    });
    
    const recommendations = await generateRecommendations(member.id);
    
    expect(recommendations.length).toBeGreaterThanOrEqual(5);
    expect(recommendations.length).toBeLessThanOrEqual(20);
  });
  
  it('should prioritize complementary roles', async () => {
    const founder = await createTestMember({ primaryRole: 'FOUNDER' });
    const investor = await createTestMember({ primaryRole: 'INVESTOR' });
    await createTestMember({ primaryRole: 'FOUNDER' }); // Another founder
    
    const recommendations = await generateRecommendations(founder.id);
    
    const investorRank = recommendations.findIndex(r => r.member.id === investor.id);
    expect(investorRank).toBeGreaterThanOrEqual(0);
    expect(investorRank).toBeLessThan(5); // Should be in top 5
  });
  
  it('should exclude dismissed recommendations', async () => {
    const member = await createTestMember();
    const dismissed = await createTestMember();
    
    await prisma.dismissedRecommendation.create({
      data: {
        userId: member.id,
        dismissedUserId: dismissed.id,
        showAgainAfter: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    
    const recommendations = await generateRecommendations(member.id);
    
    expect(recommendations.find(r => r.member.id === dismissed.id)).toBeUndefined();
  });
  
  it('should include dismissed after 30 days', async () => {
    const member = await createTestMember();
    const dismissed = await createTestMember();
    
    await prisma.dismissedRecommendation.create({
      data: {
        userId: member.id,
        dismissedUserId: dismissed.id,
        showAgainAfter: new Date(Date.now() - 1000) // Already expired
      }
    });
    
    const recommendations = await generateRecommendations(member.id);
    
    // May or may not appear depending on relevance, but shouldn't error
    expect(recommendations).toBeDefined();
  });
});
```

### E2E Tests

#### Critical User Journeys

```typescript
// e2e/member-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Member Registration and Connection Journey', () => {
  test('should complete full registration and connection flow', async ({ page }) => {
    // Registration
    await page.goto('/register');
    await page.fill('[name="name"]', 'Jane Founder');
    await page.fill('[name="email"]', 'jane@startup.com');
    await page.fill('[name="password"]', 'SecurePass123');
    await page.selectOption('[name="primaryRole"]', 'FOUNDER');
    await page.click('button[type="submit"]');
    
    // Should show pending approval message
    await expect(page.locator('text=pending approval')).toBeVisible();
    
    // Admin approves (simulate)
    await approveUser('jane@startup.com');
    
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'jane@startup.com');
    await page.fill('[name="password"]', 'SecurePass123');
    await page.click('button[type="submit"]');
    
    // Complete profile
    await expect(page).toHaveURL('/profile/edit');
    await page.fill('[name="companyName"]', 'StartupCo');
    await page.selectOption('[name="companyStage"]', 'SEED');
    await page.fill('[name="currentFocus"]', 'Building AI platform');
    await page.fill('[name="needs"]', 'Technical co-founder');
    await page.click('button:has-text("Save Profile")');
    
    // Search for members
    await page.goto('/search');
    await page.fill('[name="query"]', 'technical');
    await page.click('button:has-text("Search")');
    
    // View member profile
    await page.click('.member-card:first-child');
    await expect(page.locator('h1')).toContainText('Profile');
    
    // Send connection request
    await page.click('button:has-text("Send Connection Request")');
    await page.fill('[name="message"]', 'Would love to connect and discuss potential collaboration');
    await page.click('button:has-text("Send Request")');
    
    await expect(page.locator('text=Connection request sent')).toBeVisible();
  });
  
  test('should enforce profile completeness for connections', async ({ page, context }) => {
    // Create incomplete profile
    await page.goto('/register');
    await page.fill('[name="name"]', 'Incomplete User');
    await page.fill('[name="email"]', 'incomplete@test.com');
    await page.fill('[name="password"]', 'SecurePass123');
    await page.selectOption('[name="primaryRole"]', 'FOUNDER');
    await page.click('button[type="submit"]');
    
    await approveUser('incomplete@test.com');
    
    // Login but skip profile completion
    await page.goto('/login');
    await page.fill('[name="email"]', 'incomplete@test.com');
    await page.fill('[name="password"]', 'SecurePass123');
    await page.click('button[type="submit"]');
    
    // Try to send connection request
    await page.goto('/search');
    await page.click('.member-card:first-child');
    
    const requestButton = page.locator('button:has-text("Send Connection Request")');
    await expect(requestButton).toBeDisabled();
    
    // Should show warning
    await expect(page.locator('text=Complete your profile')).toBeVisible();
  });
});
```

#### Admin Workflow Tests

```typescript
// e2e/admin-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Workflow', () => {
  test('should manage potential members through outreach funnel', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Add potential member
    await page.goto('/admin/potential-members');
    await page.click('button:has-text("Add Potential Member")');
    await page.fill('[name="name"]', 'Sarah Investor');
    await page.fill('[name="email"]', 'sarah@vc.com');
    await page.fill('[name="company"]', 'VC Fund');
    await page.selectOption('[name="role"]', 'INVESTOR');
    await page.fill('[name="discoverySource"]', 'Conference');
    await page.click('button:has-text("Save")');
    
    // Update outreach status
    await page.click('text=Sarah Investor');
    await page.selectOption('[name="outreachStatus"]', 'CONTACTED');
    await page.fill('[name="outreachMethod"]', 'Email');
    await page.fill('[name="outreachOutcome"]', 'Interested, scheduling call');
    await page.fill('[name="nextFollowUpDate"]', '2024-12-20');
    await page.click('button:has-text("Log Outreach")');
    
    // Verify appears in follow-up queue
    await page.goto('/admin/dashboard');
    await expect(page.locator('text=Sarah Investor')).toBeVisible();
    await expect(page.locator('text=Upcoming Follow-ups')).toBeVisible();
    
    // Add note
    await page.goto('/admin/potential-members');
    await page.click('text=Sarah Investor');
    await page.fill('[name="note"]', 'Very interested in women-led startups');
    await page.click('button:has-text("Add Note")');
    
    await expect(page.locator('text=Very interested')).toBeVisible();
  });
  
  test('should import potential members from CSV', async ({ page }) => {
    await loginAsAdmin(page);
    
    const csvContent = `name,email,company,role,linkedInUrl,discoverySource
Alice Builder,alice@tech.com,TechCorp,Builder,https://linkedin.com/in/alice,Event
Bob Operator,bob@startup.com,StartupCo,Operator,https://linkedin.com/in/bob,Referral`;
    
    await page.goto('/admin/potential-members/import');
    await page.setInputFiles('[name="csvFile"]', {
      name: 'prospects.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    await page.click('button:has-text("Import")');
    
    // Check import summary
    await expect(page.locator('text=2 successful')).toBeVisible();
    await expect(page.locator('text=0 skipped')).toBeVisible();
    
    // Verify members appear in list
    await page.goto('/admin/potential-members');
    await expect(page.locator('text=Alice Builder')).toBeVisible();
    await expect(page.locator('text=Bob Operator')).toBeVisible();
  });
});
```

### Test Data Management

```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

export const prisma = new PrismaClient();

export async function createTestUser(overrides = {}) {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      passwordHash: await hash('TestPass123', 10),
      name: 'Test User',
      accountStatus: 'ACTIVE',
      ...overrides
    }
  });
}

export async function createTestMember(profileData = {}) {
  const user = await createTestUser();
  
  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      primaryRole: 'FOUNDER',
      secondaryRoles: [],
      expertiseAreas: [],
      completenessScore: 60,
      ...profileData
    }
  });
  
  return { ...user, profile };
}

export async function seedTestDatabase() {
  // Create diverse test members for recommendation testing
  const roles: RoleType[] = ['FOUNDER', 'OPERATOR', 'INVESTOR', 'BUILDER'];
  
  for (const role of roles) {
    for (let i = 0; i < 5; i++) {
      await createTestMember({
        primaryRole: role,
        expertiseAreas: [`skill-${role}-${i}`, 'common-skill'],
        needs: `Need ${role} specific help`,
        offerings: `Offer ${role} expertise`
      });
    }
  }
}
```

## Error Handling

### Error Categories

```typescript
// lib/errors/types.ts

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(resource: string, limit: number) {
    super(
      'RATE_LIMITED',
      `Rate limit exceeded for ${resource}. Limit: ${limit} per day`,
      429
    );
    this.name = 'RateLimitError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}
```

### Global Error Handler

```typescript
// lib/errors/handler.ts
import { NextResponse } from 'next/server';
import { AppError } from './types';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  // Known application errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      },
      { status: error.statusCode }
    );
  }
  
  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: error.errors
        }
      },
      { status: 400 }
    );
  }
  
  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Resource already exists',
            details: error.meta
          }
        },
        { status: 409 }
      );
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found'
          }
        },
        { status: 404 }
      );
    }
  }
  
  // Unknown errors
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    },
    { status: 500 }
  );
}
```

### API Route Error Handling Pattern

```typescript
// Example: app/api/connections/requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors/handler';
import { requireActiveAccount } from '@/lib/auth/middleware';
import { sendConnectionRequest } from '@/lib/services/connections';

export async function POST(request: NextRequest) {
  try {
    const session = await requireActiveAccount();
    const body = await request.json();
    
    const result = await sendConnectionRequest(
      session.user.id,
      body.receiverId,
      body.message
    );
    
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Client-Side Error Handling

```typescript
// lib/api/client.ts
export class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error.code,
        error.error.message,
        response.status,
        error.error.details
      );
    }
    
    return response.json();
  }
  
  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  // ... other methods
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

## Operational Considerations

### Database Migrations

```typescript
// Migration strategy using Prisma

// 1. Development: Create migrations
// $ npx prisma migrate dev --name add_rate_limiting

// 2. Production: Apply migrations
// $ npx prisma migrate deploy

// 3. Seed data (admin user, initial data)
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await hash(process.env.ADMIN_INITIAL_PASSWORD!, 12);
  
  await prisma.user.upsert({
    where: { email: 'admin@womenbuilders.com' },
    update: {},
    create: {
      email: 'admin@womenbuilders.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      isAdmin: true,
      accountStatus: 'ACTIVE',
      profile: {
        create: {
          primaryRole: 'OPERATOR',
          secondaryRoles: [],
          expertiseAreas: ['platform-management'],
          completenessScore: 100
        }
      }
    }
  });
  
  console.log('Seed data created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Scheduled Jobs

> **SUPERSEDED (R2).** Jobs: `/api/cron/outbox` (every minute), `/api/cron/expire-requests` (daily), `/api/cron/archive` (weekly, soft-archive, never Do_Not_Contact). There is no completeness job: it's recomputed on save.

```typescript
// lib/jobs/cleanup.ts
// Run daily via cron (Vercel Cron or external scheduler)

import { prisma } from '@/lib/db';

export async function expireConnectionRequests() {
  const expired = await prisma.connectionRequest.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: {
        lt: new Date()
      }
    },
    data: {
      status: 'EXPIRED',
      respondedAt: new Date()
    }
  });
  
  console.log(`Expired ${expired.count} connection requests`);
  return expired.count;
}

export async function archiveOldPotentialMembers() {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  const terminalStatuses = ['NOT_INTERESTED', 'NOT_A_FIT', 'DO_NOT_CONTACT'];
  
  // In a real system, move to archive table or cold storage
  const archived = await prisma.potentialMember.deleteMany({
    where: {
      outreachStatus: { in: terminalStatuses },
      updatedAt: { lt: twoYearsAgo }
    }
  });
  
  console.log(`Archived ${archived.count} old potential members`);
  return archived.count;
}

export async function updateProfileCompleteness() {
  const profiles = await prisma.profile.findMany();
  
  for (const profile of profiles) {
    const score = calculateCompletenessScore(profile);
    
    if (score !== profile.completenessScore) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { completenessScore: score }
      });
    }
  }
  
  console.log(`Updated ${profiles.length} profile completeness scores`);
}

// Vercel Cron configuration (vercel.json)
{
  "crons": [
    {
      "path": "/api/cron/expire-requests",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/archive-old-data",
      "schedule": "0 2 * * 0"
    },
    {
      "path": "/api/cron/update-completeness",
      "schedule": "0 1 * * *"
    }
  ]
}
```

### Monitoring and Logging

```typescript
// lib/monitoring/logger.ts
import { headers } from 'next/headers';

interface LogContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};
  
  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }
  
  info(message: string, data?: unknown) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      data,
      context: this.context,
      timestamp: new Date().toISOString()
    }));
  }
  
  error(message: string, error?: unknown) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      context: this.context,
      timestamp: new Date().toISOString()
    }));
  }
  
  warn(message: string, data?: unknown) {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      data,
      context: this.context,
      timestamp: new Date().toISOString()
    }));
  }
}

export const logger = new Logger();

// Usage in API routes
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.setContext({ requestId, endpoint: '/api/connections/requests' });
  
  try {
    logger.info('Processing connection request');
    // ... handle request
  } catch (error) {
    logger.error('Failed to process connection request', error);
    throw error;
  }
}
```

### Performance Optimization

```typescript
// Database query optimization with Prisma

// 1. Use selective field selection
const members = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    profile: {
      select: {
        primaryRole: true,
        expertiseAreas: true
      }
    }
  }
});

// 2. Pagination
const page = 1;
const limit = 20;
const members = await prisma.user.findMany({
  skip: (page - 1) * limit,
  take: limit
});

// 3. Cursor-based pagination for large datasets
const members = await prisma.user.findMany({
  take: 20,
  skip: 1,
  cursor: {
    id: lastSeenId
  }
});

// 4. Eager loading to avoid N+1
const conversations = await prisma.connection.findMany({
  where: {
    OR: [{ user1Id: userId }, { user2Id: userId }]
  },
  include: {
    user1: { select: { name: true, profile: true } },
    user2: { select: { name: true, profile: true } },
    messages: {
      take: 1,
      orderBy: { createdAt: 'desc' }
    }
  }
});

// 5. Use database indexes (defined in schema)
// Already added in schema.prisma:
// @@index([email])
// @@index([receiverId, status])
// @@index([connectionId, createdAt])
```

### Backup and Disaster Recovery

```bash
# Database backups (automated by hosting provider)
# Vercel Postgres: Automatic daily backups, 7-day retention

# Manual backup (if needed)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup-20241215.sql

# Export user data (GDPR compliance)
# Implement data export API endpoint
GET /api/members/me/export
```

### Environment Configuration

```bash
# .env.local (development)
DATABASE_URL="postgresql://user:password@localhost:5432/womenbuilders_dev"
NEXTAUTH_SECRET="development-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_test_key"

# .env.production (Vercel)
DATABASE_URL="postgresql://..." # Vercel Postgres connection string
NEXTAUTH_SECRET="..." # Generate with: openssl rand -base64 32
NEXTAUTH_URL="https://womenbuilders.com"
RESEND_API_KEY="re_prod_key"
ADMIN_INITIAL_PASSWORD="..." # For seed script
```


## UX Flows for Critical Journeys

### 1. Member Registration and Onboarding Flow

```mermaid
flowchart TD
    A[Landing Page] --> B[Click 'Sign Up']
    B --> C[Registration Form]
    C --> D{Valid Input?}
    D -->|No| C
    D -->|Yes| E[Create Account<br/>Status: PENDING]
    E --> F[Show 'Pending Approval' Message]
    F --> G[User Waits]
    
    H[Admin Dashboard] --> I[Review Applications]
    I --> J{Approve?}
    J -->|Yes| K[Update Status: ACTIVE]
    J -->|No| L[Reject Application]
    K --> M[Send Welcome Email]
    M --> N[User Receives Email]
    N --> O[User Logs In]
    O --> P[Profile Completion Wizard]
    
    P --> Q[Step 1: Core Info]
    Q --> R[Step 2: Role-Specific]
    R --> S[Step 3: Expertise & Focus]
    S --> T[Step 4: Needs & Offerings]
    T --> U{Completeness >= 60%?}
    U -->|No| V[Warning: Complete Profile]
    U -->|Yes| W[Enable Full Features]
    W --> X[Dashboard]
    V --> X
```

**Key UX Decisions:**
- Progressive disclosure: Show role-specific fields only after role selection
- Real-time completeness indicator in profile editor
- Graceful degradation: Incomplete profiles can browse but not connect
- Clear feedback at each step with validation messages

### 2. Member Discovery and Connection Flow

```mermaid
flowchart TD
    A[Dashboard] --> B{Discovery Method}
    B -->|Search| C[Search Interface]
    B -->|Recommendations| D[Recommendations Page]
    B -->|Browse| E[Browse by Role]
    
    C --> F[Enter Query + Filters]
    F --> G[View Results]
    
    D --> H[View 5-20 Recommendations]
    H --> I[See Relevance Explanation]
    
    E --> J[Filter by Role Type]
    J --> G
    
    G --> K[Click Member Card]
    K --> L[View Full Profile]
    L --> M{Connection Status?}
    
    M -->|None| N{Profile Complete?}
    M -->|Pending Sent| O[Show 'Request Pending']
    M -->|Pending Received| P[Show Accept/Decline]
    M -->|Connected| Q[Show Message Button]
    
    N -->|Yes| R[Send Connection Request]
    N -->|No| S[Disabled + Warning]
    
    R --> T[Write Personal Message]
    T --> U{Rate Limit OK?}
    U -->|Yes| V[Send Request]
    U -->|No| W[Show Limit Error]
    V --> X[Request Sent Confirmation]
    
    P --> Y{User Decision}
    Y -->|Accept| Z[Create Connection]
    Y -->|Decline| AA[Decline Silently]
    Z --> AB[Send Acceptance Email]
    AB --> Q
```

**Key UX Decisions:**
- Multiple discovery paths cater to different user preferences
- Clear visual distinction between connection states
- Explanation cards for recommendations build trust
- Inline rate limit warnings before hitting limit
- Non-confrontational decline (no notification to sender)

### 3. Messaging Flow

```mermaid
flowchart TD
    A[Dashboard] --> B[Messages Section]
    B --> C[View Conversation List]
    C --> D[Sorted by Recent Activity]
    D --> E[Show Unread Count Badge]
    
    E --> F[Click Conversation]
    F --> G[Load Message History]
    G --> H[Display in Chronological Order]
    H --> I[Auto-scroll to Unread]
    
    I --> J[User Types Message]
    J --> K{Rate Limit OK?}
    K -->|Yes| L[Send Message]
    K -->|No| M[Show Limit Warning]
    
    L --> N[Optimistic UI Update]
    N --> O[API Call]
    O --> P{Success?}
    P -->|Yes| Q[Mark as Sent]
    P -->|No| R[Show Retry Option]
    
    Q --> S[Notify Recipient]
    S --> T[Email Notification]
    
    U[Recipient] --> V[Opens App]
    V --> W[Sees Unread Badge]
    W --> F
```

**Key UX Decisions:**
- Optimistic UI updates for fast perceived performance
- Clear visual hierarchy: unread messages bold, timestamps subtle
- Email notifications configurable per user
- Graceful error handling with retry option
- Rate limit warning appears as user approaches limit (e.g., at 45/50 messages)

### 4. Admin Potential Member Management Flow

```mermaid
flowchart TD
    A[Admin Dashboard] --> B[View Metrics]
    B --> C[See Conversion Funnel]
    C --> D[Upcoming Follow-ups Alert]
    
    D --> E{Action Needed?}
    E -->|Add New| F[Add Potential Member Form]
    E -->|Import| G[CSV Upload]
    E -->|Follow Up| H[Follow-up Queue]
    E -->|Search| I[Search Interface]
    
    F --> J[Fill Form Manually]
    J --> K[Save Record]
    K --> L[Status: IDENTIFIED]
    
    G --> M[Select CSV File]
    M --> N[Validate Data]
    N --> O{Valid?}
    O -->|Yes| P[Import Records]
    O -->|No| Q[Show Errors]
    P --> R[Show Import Summary]
    R --> S[Review New Records]
    
    H --> T[See Due Follow-ups]
    T --> U[Click Potential Member]
    U --> V[View Full Record]
    
    I --> W[Filter by Status]
    W --> X[Search Results]
    X --> U
    
    V --> Y[View Outreach History]
    Y --> Z[View Notes]
    Z --> AA[Log New Outreach]
    AA --> AB[Update Status]
    AB --> AC[Set Follow-up Date]
    AC --> AD[Add Notes]
    AD --> AE[Save Changes]
    
    AE --> AF{Status Changed?}
    AF -->|To APPROVED| AG[Convert to Member]
    AF -->|Other| AH[Update Record]
    
    AG --> AI[Create User Account]
    AI --> AJ[Send Invitation Email]
```

**Key UX Decisions:**
- Dashboard provides at-a-glance metrics and action items
- Duplicate detection on email field prevents redundant outreach
- CSV import with clear error reporting and preview before commit
- Follow-up queue sorted by urgency (overdue first, then by date)
- Inline note-taking without leaving context
- Status transitions have clear visual feedback
- Bulk actions available for common tasks (bulk status updates)

### 5. Profile Editing and Completeness Flow

```mermaid
flowchart TD
    A[View Own Profile] --> B[Click Edit]
    B --> C[Profile Editor]
    C --> D[Real-time Completeness Bar]
    
    D --> E[Edit Field]
    E --> F[Auto-save Draft]
    F --> G[Recalculate Completeness]
    G --> H{Completeness >= 60%?}
    
    H -->|No| I[Yellow Warning Badge]
    H -->|Yes| J[Green Check Badge]
    
    I --> K[Show Missing Fields]
    K --> L{User Adds Field}
    L -->|Yes| G
    L -->|No| M[Save Anyway]
    
    J --> N[Enable Connection Features]
    N --> M
    
    M --> O[Validate All Fields]
    O --> P{Valid?}
    P -->|Yes| Q[Save to Database]
    P -->|No| R[Show Inline Errors]
    R --> E
    
    Q --> S[Update Completeness Score]
    S --> T[Trigger Recommendation Refresh]
    T --> U[Show Success Message]
    U --> V[Return to Profile View]
```

**Key UX Decisions:**
- Auto-save prevents data loss
- Real-time completeness indicator provides clear goal
- Visual differentiation: required fields marked with asterisk
- Role-specific sections collapse/expand based on selected roles
- Progressive enhancement: start basic, add details over time
- Inline validation with helpful error messages
- Preview mode before saving shows how profile appears to others

### Responsive Design Considerations

#### Breakpoints
```css
/* Mobile-first approach */
- Mobile: 320px - 639px (single column, stacked cards)
- Tablet: 640px - 1023px (2-column grid, side drawer for filters)
- Desktop: 1024px+ (3-column grid, persistent sidebar)
```

#### Mobile-Specific UX Patterns

1. **Navigation**: Bottom tab bar for primary navigation (Dashboard, Search, Messages, Profile)
2. **Search**: Full-screen search overlay with filter accordion
3. **Member Cards**: Full-width cards with tap-to-expand details
4. **Messages**: Native-like chat interface with input fixed at bottom
5. **Profile Editing**: One section per screen with progress indicator
6. **Admin**: Simplified dashboard with drill-down pattern

#### Touch Targets
- Minimum 44x44px for all interactive elements
- Adequate spacing between tappable elements (8px minimum)
- Swipe gestures for common actions (swipe to dismiss recommendation)

### Accessibility Considerations

#### WCAG 2.1 Level AA Compliance

1. **Keyboard Navigation**
   - All interactive elements accessible via keyboard
   - Logical tab order throughout application
   - Skip navigation links for main content
   - Visible focus indicators (2px outline)

2. **Screen Reader Support**
   - Semantic HTML (nav, main, section, article)
   - ARIA labels for icon buttons
   - Live regions for dynamic content updates
   - Alt text for all images and icons

3. **Color and Contrast**
   - Minimum 4.5:1 contrast ratio for normal text
   - Minimum 3:1 for large text and UI components
   - Information not conveyed by color alone
   - Dark mode support with maintained contrast ratios

4. **Form Accessibility**
   - Label elements associated with inputs
   - Error messages linked via aria-describedby
   - Required fields indicated with aria-required
   - Helpful instructions and format examples

5. **Dynamic Content**
   - Loading states announced to screen readers
   - Error messages announced politely
   - Success messages announced assertively
   - Modal focus trap and return focus on close

```typescript
// Example accessible component
export function ConnectionRequestButton({ member }: { member: Member }) {
  const [loading, setLoading] = useState(false);
  const announceRef = useRef<HTMLDivElement>(null);
  
  return (
    <>
      <button
        onClick={handleSendRequest}
        disabled={loading || !canSendRequest}
        aria-label={`Send connection request to ${member.name}`}
        aria-busy={loading}
        className="btn-primary"
      >
        {loading ? 'Sending...' : 'Send Connection Request'}
      </button>
      
      {/* Screen reader announcements */}
      <div 
        ref={announceRef}
        role="status"
        aria-live="polite"
        className="sr-only"
      />
    </>
  );
}
```

## Security Considerations

### Input Validation and Sanitization

```typescript
// All user inputs validated with Zod schemas
import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100),
  primaryRole: z.enum(['FOUNDER', 'OPERATOR', 'INVESTOR', 'BUILDER']),
  professionalBackground: z.string().max(5000).optional(),
  expertiseAreas: z.array(z.string().max(50)).max(20),
  currentFocus: z.string().max(1000).optional(),
  needs: z.string().max(2000).optional(),
  offerings: z.string().max(2000).optional(),
  location: z.string().max(100).optional(),
  // Sanitize URLs
  linkedInUrl: z.string().url().optional().refine(
    (url) => !url || url.startsWith('https://linkedin.com/'),
    'Must be a LinkedIn URL'
  )
});

// Sanitize HTML in user-generated content
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeUserContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // Strip all HTML
    ALLOWED_ATTR: []
  });
}
```

### SQL Injection Prevention

Prisma ORM provides built-in protection against SQL injection through parameterized queries. Never use raw SQL unless absolutely necessary.

```typescript
// SAFE: Parameterized query
const user = await prisma.user.findUnique({
  where: { email: userEmail } // Automatically parameterized
});

// UNSAFE: Avoid raw SQL
// const users = await prisma.$queryRaw`SELECT * FROM User WHERE email = ${email}`;
```

### XSS Prevention

```typescript
// React automatically escapes values in JSX
// Additional protection for dynamic content
import { escape } from 'lodash';

function MemberBio({ bio }: { bio: string }) {
  // Bio is sanitized before storage and escaped on render
  return <p>{bio}</p>; // React handles escaping
}

// For admin-rendered content from untrusted sources
function AdminNote({ note }: { note: string }) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note) }} />;
}
```

### CSRF Protection

> **SUPERSEDED (R2).** See `gap-resolutions.md` and the implementation in `lib/`.


NextAuth.js provides built-in CSRF protection for authentication endpoints. For other mutations, use CSRF tokens.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // NextAuth handles CSRF for /api/auth/*
  // For other POST/PUT/DELETE, verify origin
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    if (origin && !origin.includes(host || '')) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }
  
  return NextResponse.next();
}
```

### Rate Limiting (Additional Layer)

> **SUPERSEDED (R2).** See `gap-resolutions.md` and the implementation in `lib/`.


Beyond application-level rate limiting, implement edge-level protection:

```typescript
// middleware.ts - Edge rate limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 requests per hour
  analytics: true
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString()
      }
    });
  }
  
  return NextResponse.next();
}
```

### Content Security Policy

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requirement
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.resend.com",
      "frame-ancestors 'none'"
    ].join('; ')
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ];
  }
};
```

### Secrets Management

```bash
# Never commit secrets to version control
# Use environment variables for all sensitive data

# .env.example (committed)
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
RESEND_API_KEY="your-api-key"

# .gitignore
.env
.env.local
.env.production
```

### Data Encryption

```typescript
// Passwords: bcrypt with 12 rounds (already implemented)
import { hash } from 'bcryptjs';
const passwordHash = await hash(password, 12);

// Sensitive data at rest: Use database-level encryption
// Vercel Postgres and Supabase provide encryption at rest by default

// Data in transit: HTTPS enforced
// Vercel enforces HTTPS for all deployments
```

## Deployment Strategy

### Development Workflow

```bash
# 1. Local development
npm run dev

# 2. Run tests
npm run test
npm run test:e2e

# 3. Check types and lint
npm run type-check
npm run lint

# 4. Database migrations
npx prisma migrate dev

# 5. Commit changes
git add .
git commit -m "feat: add connection request feature"

# 6. Push to GitHub
git push origin feature/connection-requests

# 7. Open Pull Request
# GitHub Actions runs CI pipeline
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Setup database
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        run: |
          npx prisma migrate deploy
          npx prisma db seed
      
      - name: Run unit tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        run: npm run test
      
      - name: Run E2E tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        run: npm run test:e2e
      
      - name: Build
        run: npm run build

  deploy-preview:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Production Deployment

```bash
# Automatic deployment on merge to main
git checkout main
git merge develop
git push origin main

# Vercel automatically:
# 1. Builds the application
# 2. Runs database migrations (via build script)
# 3. Deploys to production
# 4. Runs smoke tests
# 5. Routes traffic to new deployment

# Rollback if needed (via Vercel dashboard or CLI)
vercel rollback
```

### Environment Setup Checklist

**Development**
- [ ] Install Node.js 20+
- [ ] Install PostgreSQL 15+
- [ ] Clone repository
- [ ] Copy .env.example to .env.local
- [ ] Run `npm install`
- [ ] Run `npx prisma migrate dev`
- [ ] Run `npx prisma db seed`
- [ ] Run `npm run dev`

**Staging**
- [ ] Create Vercel project
- [ ] Connect GitHub repository
- [ ] Provision Vercel Postgres database
- [ ] Set environment variables
- [ ] Deploy from develop branch
- [ ] Run smoke tests

**Production**
- [ ] Configure custom domain
- [ ] Set production environment variables
- [ ] Run security audit
- [ ] Deploy from main branch
- [ ] Monitor error rates
- [ ] Set up alerts

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Advanced Search**
   - Saved searches
   - Search alerts (notify when new matches)
   - Boolean operators (AND, OR, NOT)
   - Fuzzy matching for expertise

2. **Enhanced Messaging**
   - File attachments
   - Message reactions
   - Message threading
   - Video call integration (Whereby, Daily.co)

3. **Events and Meetups**
   - Event creation and management
   - RSVP tracking
   - Attendee networking suggestions
   - Virtual event integration

4. **Content Sharing**
   - Resource library (articles, templates, guides)
   - Member blog posts
   - Curated newsletters
   - Success story showcase

5. **Advanced Analytics (Admin)**
   - Member engagement scores
   - Network graph visualization
   - Cohort analysis
   - Predictive churn detection

6. **Gamification**
   - Profile badges (Connector, Contributor, etc.)
   - Achievement system
   - Leaderboards (optional, tasteful)

7. **AI Enhancements**
   - AI-powered introduction writing
   - Smart reply suggestions
   - Automated meeting scheduling
   - Personalized content recommendations

### Scalability Considerations

**Current Architecture** supports up to ~10,000 active members with current design.

**For 10,000+ members:**
- Implement Redis caching for recommendations
- Use database read replicas for search queries
- Consider Algolia for search (better than PostgreSQL full-text)
- Implement CDN for profile images
- Add database connection pooling (PgBouncer)

**For 100,000+ members:**
- Migrate to microservices architecture
- Separate read/write databases
- Implement message queue (Redis, RabbitMQ)
- Use Elasticsearch for search and analytics
- Consider GraphQL for flexible data fetching

## Conclusion

This technical design provides a complete blueprint for implementing the Women Builders platform. All open questions have been resolved with specific implementation decisions:

✅ **Outreach emails**: Track externally, use Resend for notifications only  
✅ **Relevance algorithm**: 4-component weighted scoring (30/40/20/10)  
✅ **Membership model**: Application-based with admin approval  
✅ **Profile completeness**: 60% threshold, role-specific required fields  
✅ **Spam prevention**: 20 connection requests/day, 50 messages/day  
✅ **Connection expiration**: 30-day auto-expire  
✅ **Search ranking**: 70% relevance + 30% completeness  
✅ **Data retention**: 2 years for terminal state potential members  
✅ **Multi-tenancy**: Single community  
✅ **Mobile support**: Responsive web app  

The design is ready for implementation with:
- Complete database schema with all tables and relationships
- Comprehensive API design with detailed endpoints
- Service layer architecture with interfaces
- Security best practices and authentication flow
- Testing strategy with examples
- UX flows for all critical journeys
- Operational considerations and deployment strategy

Developers can begin implementation immediately with clear guidance on technology choices, design patterns, and implementation details.
