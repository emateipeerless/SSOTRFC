
# TurfConnect Web App — v0.1 Specification

## 📌 Overview
This document outlines the **0.1 spec** for the TurfConnect Web Application, describing the UI layout, data flows, and API endpoints involved in the current version.

---

## 🧭 Application Layout

### Sidebar — User Devices
The sidebar dynamically loads devices for the logged‑in user:

1. Retrieve `UserKey` from the authenticated session.
2. Query **SSOU2S** to determine which sites the user has access to.
3. Query **SSOSites** to fetch all devices linked to those sites.
4. Display the resulting site → device hierarchy.

---

### Top Header Bar
The header contains:
- 🚜 **TurfConnect Logo**
- 🏷️ **Website version number**
- 🌗 **Dark / Light mode toggle**
- 👤 **Logged‑in user’s name**
- 🔓 **Logout button**

---

## Per‑Device Navigation
Each device view contains the following pages:

### 1. Overview Page
- Displays **daily** and **monthly run counts**
- Includes **timestamps** and **durations** of each run

### 2. Trends Page
- Graph RMS and Analog (AN / Amp) data
- Compare data streams to visualize relationships

### 3. Events Page
- Timeline view of device events
- Shows **event start**, **end**, and **duration**

### 4. Settings Page
- Backend device metadata such as:
  - Firmware/code version
  - Device description

---

## 🔌 API Endpoints Used So Far
Below is the current API usage mapped to their Lambda handlers:

### Devices
| Endpoint | Purpose | Lambda |
|---------|---------|--------|
| `GET /devices` | Fetch user devices using their `UserKey` | `SSOgetUserDevices` |
| `GET /devices/{deviceId}/snapshot` | Data for the Overview page | `SSOdeviceSnap` |
| `GET /devices/{deviceId}/Events` | Event data for Events page | `SSOeventTable` |
| `GET /devices/{deviceId}/settings` | Backend info for Settings page | `SSOsettingsGrab` |
| `GET /devices/{deviceId}/rms` | RMS trend data (`from`, `to` params) | `SSOrmsTrends` |
| `GET /devices/{deviceId}/analog` | Analog/Amp trend data | `SSOmaTrends` |

### User Sync
| Endpoint | Purpose | Lambda |
|---------|---------|--------|
| `POST /me/sync` | Syncs SSO user database, saves name + recent login | `SSOSyncUsers` |

### Sites
| Endpoint | Purpose | Lambda |
|---------|---------|--------|
| `GET /sites` | Gets user’s sites using `UserKey` from **SSOU2S** | `SSOgetUserSites` |

---

## 🏭 Current Site & Device Setup
### Active Sites
- **INDY-01**
  - Devices:
    - `TRFCPCB`
    - `TRFC2`

### Prototype Device
- **`PROTO`** → Sending data to the RMS table

---

## 🔧 Next Steps
- Begin formalizing the **deviceID schema** for all devices.
- Ensure consistent IDs across device firmware, database tables, and web queries.

