# Configuration Guide

This guide covers all configuration options for aMule Web Controller.

## Table of Contents

- [Setup Wizard](#setup-wizard)
- [Settings Page](#settings-page)
- [Configuration Precedence](#configuration-precedence)
- [Environment Variables](#environment-variables)
- [aMule EC Setup](#amule-ec-setup)
- [Docker Network Configuration](#docker-network-configuration)

> **GeoIP Setup:** For displaying peer locations, see the [GeoIP Setup Guide](./GEOIP.md).
>
> **Sonarr/Radarr Integration:** For setting up *arr applications, see the [Integration Guide](./INTEGRATIONS.md).

---

## Setup Wizard

When you first access the web interface (or if no configuration exists), an interactive setup wizard guides you through the initial configuration:

1. **Welcome** - Introduction to the setup process
2. **Security** - Configure web interface authentication (password protection)
3. **aMule Connection** - Configure host, port, and EC password (with connection testing)
4. **Directories** - Set data, logs, and GeoIP directories
5. **Integrations** - Optionally enable Sonarr and Radarr integration
6. **Review & Save** - Test all settings and save configuration

The wizard will:
- Auto-populate fields with environment variable values or sensible defaults
- Allow you to test each configuration section before proceeding
- Show Docker-specific warnings when running in a container
- Save configuration to `server/data/config.json` for persistence
- Enable authentication by default (recommended for security)

**Password Requirements:**
When authentication is enabled, the password must meet these requirements:
- At least 8 characters
- Contains at least one digit
- Contains at least one letter
- Contains at least one special character (`!@#$%^&*()_+-=[]{}|;:,.<>?`)

> **Note:** If you're running in Docker, the setup wizard will warn you that changing directory paths requires updating your `docker-compose.yml` volume mounts.

---

## Settings Page

After initial setup, access the Settings page anytime via the sidebar (desktop) or bottom navigation bar (mobile). The Settings page allows you to:

- View and edit all configuration options
- Test individual configuration sections (aMule, Directories, Sonarr, Radarr)
- Test all configuration at once before saving
- Enable/disable Sonarr and Radarr integrations with toggle switches

**Environment Variable Indicators:**

- **Non-sensitive fields** (host, port, URLs): Show a "From Env" badge but remain editable. Your saved value will override the environment variable.
- **Sensitive fields** (passwords, API keys): When set via environment variable, the input field is hidden and replaced with a warning message. To change these values, update the environment variable and restart the server.

**Important:**
- Some changes (like PORT) may require a server restart to take effect
- Passwords are masked in the UI for security
- Changes take effect immediately after saving (except server port)

---

## Configuration Precedence

The application uses different precedence rules for sensitive and non-sensitive fields:

### Sensitive Fields (passwords, API keys)

**Precedence:** Environment Variables > Config File > Defaults

Sensitive fields include:
- `WEB_AUTH_PASSWORD` - Web UI authentication password
- `AMULE_PASSWORD` - aMule EC connection password
- `SONARR_API_KEY` - Sonarr API key
- `RADARR_API_KEY` - Radarr API key

When these are set via environment variables:
- The environment variable **always takes precedence**
- The value is **never saved** to the config file
- The input field is **hidden** and replaced with a warning message
- Users cannot modify these values through the wizard or settings page

### Non-Sensitive Fields

**Precedence:** Config File > Environment Variables > Defaults

For all other fields:
- **User-saved configuration takes priority** - When you save settings via the UI, they override environment variables
- **Environment variables serve as initial defaults** - When you first run the wizard, it pre-populates fields with env var values
- **Easy configuration updates** - Change settings through the UI without touching environment variables

### Example Workflows

**Recommended: Use the Setup Wizard**
1. Start the container with minimal config (just PORT)
2. Access the web interface
3. Complete the interactive setup wizard
4. All settings saved to `config.json`

**Alternative: Pre-populate with Environment Variables**
1. Add environment variables to your `docker-compose.yml`
2. First run: Wizard auto-populates from these env vars
3. Review and save in the wizard
4. Later: Use Settings page to modify configuration

**Advanced: Skip Wizard Entirely**
1. Set all required environment variables
2. Set `SKIP_SETUP_WIZARD=true`
3. Application uses env vars directly (no wizard shown)

---

## Environment Variables

Environment variables are **completely optional**. The setup wizard is the recommended configuration method.

Add these to your `docker-compose.yml` if needed:

```yaml
services:
  amule-web:
    environment:
      # Server Configuration
      - PORT=4000

      # Web UI Authentication (optional)
      - WEB_AUTH_ENABLED=true
      - WEB_AUTH_PASSWORD=your_secure_password  # Locks UI editing

      # aMule Connection (optional - wizard will ask if not set)
      - AMULE_HOST=host.docker.internal
      - AMULE_PORT=4712
      - AMULE_PASSWORD=your_ec_password  # Locks UI editing

      # Sonarr Integration (optional)
      - SONARR_URL=http://sonarr:8989
      - SONARR_API_KEY=your_api_key  # Locks UI editing
      - SONARR_SEARCH_INTERVAL_HOURS=6

      # Radarr Integration (optional)
      - RADARR_URL=http://radarr:7878
      - RADARR_API_KEY=your_api_key  # Locks UI editing
      - RADARR_SEARCH_INTERVAL_HOURS=6

      # Skip wizard (optional - only if all settings provided)
      - SKIP_SETUP_WIZARD=false
```

### Complete Reference

#### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Web server listening port |

#### Web UI Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `WEB_AUTH_ENABLED` | `false` | Enable password protection for the web UI |
| `WEB_AUTH_PASSWORD` | - | Password for web UI access (locks UI editing) |

#### aMule Connection

| Variable | Default | Description |
|----------|---------|-------------|
| `AMULE_HOST` | `127.0.0.1` | aMule daemon hostname or IP |
| `AMULE_PORT` | `4712` | aMule EC protocol port |
| `AMULE_PASSWORD` | - | aMule EC connection password (locks UI editing) |

#### Sonarr Integration

| Variable | Default | Description |
|----------|---------|-------------|
| `SONARR_URL` | - | Sonarr base URL (auto-enables integration) |
| `SONARR_API_KEY` | - | Sonarr API key (locks UI editing) |
| `SONARR_SEARCH_INTERVAL_HOURS` | `6` | Hours between automatic searches |

#### Radarr Integration

| Variable | Default | Description |
|----------|---------|-------------|
| `RADARR_URL` | - | Radarr base URL (auto-enables integration) |
| `RADARR_API_KEY` | - | Radarr API key (locks UI editing) |
| `RADARR_SEARCH_INTERVAL_HOURS` | `6` | Hours between automatic searches |

#### Advanced

| Variable | Default | Description |
|----------|---------|-------------|
| `SKIP_SETUP_WIZARD` | `false` | Skip the setup wizard entirely |

> **Note:** Fields marked with "locks UI editing" cannot be modified through the web interface when set via environment variables. This is a security feature to prevent accidental exposure of sensitive credentials.

---

## aMule EC Setup

Before using this web controller, you must enable External Connections in aMule:

1. **Open aMule** (or amuled configuration)
2. **Navigate to Preferences** → **Remote Controls** → **External Connections**
3. **Enable "Accept external connections"**
4. **Set an EC password** (remember this for the web controller configuration)
5. **Note the EC port** (default: 4712)
6. **Optional:** Configure allowed IP addresses for security

---

## Docker Network Configuration

### Default Setup - aMule on Host Machine

This is the most common scenario:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"  # Required!
```

- In the setup wizard, use **`host.docker.internal`** as the aMule Host
- The `extra_hosts` line creates a special hostname that points to your host machine
- Works on Docker Desktop (Mac/Windows) and Linux with recent Docker versions

### aMule in Another Container

If using the all-in-one setup or aMule is in a separate container:
- Use the **service name** as hostname (e.g., `amule`)
- Ensure both containers are on the same Docker network
- The `extra_hosts` line is not needed

### Remote aMule

If aMule is running on a different machine:
- Use the **IP address** or **hostname** of the remote machine
- Ensure aMule EC port (4712) is accessible from your network
- The `extra_hosts` line is not needed

