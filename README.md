# TOWA — All-in-One Discord Server Management & Real-Time Sync Engine

A feature-rich, high-performance Discord bot combining full server administration, community engagement tools, and an event-driven background sync engine that connects server activity to the TOWA web portal.

---

##  Feature Overview

### Server Administration & Moderation
* **Automated Onboarding**: Custom `welcome`, `farewell` messages, `autorole` assignment, and member counters.
* **Moderation Controls**: Configurable `modlog`, `maxwarns` thresholds, custom command prefixes, and audit trailing.
* **Interactive Roles**: `reaction roles` and automated `flag translation` for multilingual servers.

### Ticket & Support System
* **Multi-Category Tickets**: Route member inquiries to designated staff teams using interactive select menus.
* **Staff Permissions**: Role-restricted ticket controls to streamline support workflows without cluttering channels.

### Leveling & Community Analytics
* **Activity Tracking**: XP accumulation based on text and voice participation.
* **Leaderboards & Profiles**: Customizable rank cards and top-active member leaderboards.

### Suggestion Engine
* **Feedback Pipeline**: Channel-based suggestion submission (`suggest`) with full staff review lifecycle (`approve`, `reject`, `status`).
* **Role Controls**: Dedicated staff access management for approving or rejecting community ideas.

### Giveaways & Social Reputation
* **Flexible Giveaways**: Unlimited, role-specific, and customizable giveaway campaigns.
* **Reputation System**: Server-specific social currency and reputation tracking (`rep give`, `rep view`).

### Utility & Context Tools
* **Context Menus**: Deep inspection of user profiles, channels, and role permissions via context interactions.
* **Helper Utilities**: Integrated tools for weather, translation, urban dictionary, pastebin, big emoji extraction, and more.

---

## Backend Architecture & Reliability

Beyond community features, TOWA is built with an enterprise-grade backend infrastructure:

* **Real-Time Web Sync**: Event-driven tracking pushing voice channel updates, online presence, and citizen directories to **Supabase (PostgreSQL)** in real time for the TOWA landing page.
* **Memory Sweeper Architecture**: Automatic internal garbage collector sweeping inactive member caches every 60 minutes (3,600s), maintaining RAM footprint below **100 MB** 24/7.
* **Rate-Limit Interceptor**: Queue system handling Discord API `rateLimited` backoffs automatically to ensure zero execution throttles.
* **Anti-Crash Guards**: Unhandled promise rejection handlers preventing process downtime during unexpected API glitches.

---

## Tech Stack 

* **Runtime**: Node.js (JavaScript / ES6+)
* **Bot Framework**: Discord.js v14
* **Database**: Supabase (PostgreSQL)
* **Process Management**: PM2 (Zero-downtime execution)
* **Infrastructure**: Oracle Cloud VPS (Linux)

---

## System Architecture

```text
[ Discord Events ] ──► [ Command / Event Router ]
                                │
   ┌────────────────────────────┼────────────────────────────┐
   ▼                            ▼                            ▼
[ Moderation & Ticket ]   [ Leveling & Social ]    [ Real-Time Sync Pipeline ]
                                                             │
                                                             ▼
                                                    [ Supabase (PostgreSQL) ]
                                                             │
                                                             ▼
                                                    [ TOWA Web Portal ]
