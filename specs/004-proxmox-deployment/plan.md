# Implementation Plan: Proxmox LXC Automated Deployment

**Branch**: `004-proxmox-deployment` | **Date**: 2025-10-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-proxmox-deployment/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create an automated deployment system for Vikunja on Proxmox LXC containers that provides single-command installation, zero-downtime updates from main branch, and comprehensive lifecycle management (backup/restore, health monitoring, configuration). The system follows the tteck helper script pattern with interactive setup, blue-green deployment for updates, and automatic rollback on failures. Target: 10-minute initial deployment, 5-minute updates with 99.9% uptime, supporting multiple concurrent instances on a single Proxmox cluster.

## Technical Context

**Language/Version**: Bash 4.0+ (deployment scripts), Go 1.21+ (Vikunja backend), Node.js 22+ (frontend build, MCP server)  
**Primary Dependencies**: 
- Proxmox VE API (container management)
- LXC (Linux Containers)
- Systemd (service management)
- Nginx (reverse proxy, SSL termination)
- Git (source code retrieval)
- Database clients: sqlite3, postgresql-client, mysql-client

**Storage**: 
- YAML configuration files (deployment settings)
- Database: SQLite/PostgreSQL/MySQL (user-selected)
- File storage: task attachments, backups (compressed tar.gz)
- State tracking: lock files, version metadata

**Testing**: 
- Bash script validation (shellcheck)
- Integration tests: full deployment cycle on test Proxmox node
- Health check validation: HTTP endpoint testing
- Rollback testing: failure simulation and recovery verification

**Target Platform**: Proxmox VE 7.0+ on Debian-based hosts, LXC containers (Debian 12 unprivileged)

**Project Type**: Infrastructure automation (deployment scripts + lifecycle management)

**Performance Goals**: 
- Initial deployment: <10 minutes (fresh install)
- Updates: <5 minutes (with migrations)
- Health checks: <10 seconds (all components)
- Backups: <5 minutes (10k tasks + 1GB attachments)
- Rollback: <2 minutes (on failure)

**Constraints**: 
- Bash 4.0+ compatibility (no bashisms beyond)
- Unprivileged LXC containers (security requirement)
- No custom kernel modules (standard Proxmox only)
- Update window: <10 minutes maximum
- Zero-downtime requirement: <5 seconds inaccessibility during switchover
- Resource minimum: 2 CPU cores, 4GB RAM, 20GB disk per instance

**Scale/Scope**: 
- Support up to 5 concurrent Vikunja instances per Proxmox cluster
- Handle databases with 10k+ tasks
- Support 1GB+ attachment storage
- Manage 3 service components (backend, frontend, MCP server)
- Interactive script: ~10 configuration prompts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality Standards

**Architecture Compliance**:
- ✅ **PASS** - This feature is infrastructure/deployment automation, not application code
- ✅ **N/A** - No service layer changes (deploys existing Vikunja components)
- ✅ **N/A** - No frontend changes (deploys existing Vue.js build)
- ⚠️ **NOTE** - Deployment scripts will be Bash, not Go (acceptable for ops tooling)

**Quality Gates**:
- ✅ **PLAN** - Will use shellcheck for Bash linting
- ✅ **PLAN** - Scripts will follow consistent formatting (4-space indent, error handling)
- ✅ **N/A** - No TypeScript/Go code changes to lint

**Technical Debt**:
- ✅ **ACKNOWLEDGED** - Document any shortcuts in deployment scripts for future refactoring

**Result**: ✅ PASS (infrastructure tooling exempted from application architecture patterns)

---

### II. Test-First Development

**TDD Cycle**:
- ✅ **PLAN** - Integration tests: deploy → verify → test update → test rollback
- ✅ **PLAN** - Health check validation tests
- ⚠️ **LIMITATION** - Unit testing Bash is impractical; focus on integration testing
- ✅ **PLAN** - Test matrix: SQLite/PostgreSQL/MySQL, fresh install/upgrade paths

**Coverage**:
- ✅ **PLAN** - Test all 5 user stories (P1-P3 priorities)
- ✅ **PLAN** - Test edge cases: network loss, disk full, port conflicts, concurrent updates
- ✅ **PLAN** - Test positive: successful deployment, update, backup/restore
- ✅ **PLAN** - Test negative: rollback on failure, validation errors, resource limits

**Testing Strategy**:
- Integration tests on actual Proxmox node (test environment)
- Automated CI tests using Proxmox API mocks for basic validation
- Manual QA on production-like Proxmox cluster

**Result**: ✅ PASS (integration testing appropriate for infrastructure automation)

---

### III. User Experience Consistency

**UX Principles**:
- ✅ **PLAN** - Interactive prompts with clear descriptions and validation
- ✅ **PLAN** - Real-time progress feedback with percentage/spinners
- ✅ **PLAN** - User-friendly error messages with remediation steps
- ✅ **PLAN** - Consistent command structure: `vikunja-deploy`, `vikunja-update`, `vikunja-status`
- ✅ **PLAN** - Color-coded output (green=success, red=error, yellow=warning)

**Accessibility**:
- ✅ **PLAN** - Terminal-based (keyboard-only navigation)
- ✅ **PLAN** - Clear prompts with defaults shown
- ✅ **PLAN** - Non-interactive mode option (for automation/CI)

**i18n**:
- ⚠️ **OUT OF SCOPE** - Deployment scripts in English only (admin tooling)
- ✅ **N/A** - Deployed Vikunja application retains full i18n support

**Result**: ✅ PASS (appropriate UX for CLI admin tooling)

---

### IV. Performance Requirements

**Deployment Performance**:
- ✅ **SPEC ALIGNED** - <10 min initial deployment (SC-001)
- ✅ **SPEC ALIGNED** - <5 min updates (SC-002)
- ✅ **SPEC ALIGNED** - <10 sec health checks (SC-005)
- ✅ **SPEC ALIGNED** - <5 min backups (SC-006)
- ✅ **SPEC ALIGNED** - <2 min rollback (SC-004)

**Uptime**:
- ✅ **SPEC ALIGNED** - 99.9% uptime during updates = <5s downtime (SC-003)
- ✅ **PLAN** - Blue-green deployment pattern for zero-dropped connections

**Resource Efficiency**:
- ✅ **PLAN** - Pre-flight resource checks before deployment
- ✅ **PLAN** - Cleanup temporary files after operations
- ✅ **PLAN** - Minimal script memory footprint (<50MB)

**Monitoring**:
- ✅ **PLAN** - Structured logs to `/var/log/vikunja-deploy.log`
- ✅ **PLAN** - Health check endpoint monitoring (HTTP status codes)
- ⚠️ **OUT OF SCOPE** - External monitoring integration (Prometheus/Grafana)

**Result**: ✅ PASS (all performance targets defined and achievable)

---

### V. Security & Reliability Standards

**Authentication**:
- ✅ **N/A** - Deployment scripts run as root on Proxmox host (admin access required)
- ✅ **PLAN** - Deployed Vikunja retains full authentication (JWT/API tokens/LDAP/OIDC)
- ✅ **PLAN** - Unprivileged LXC containers (security constraint met)

**Input Validation**:
- ✅ **PLAN** - Validate all user inputs: domain format, IP addresses, port numbers, resource limits
- ✅ **PLAN** - Database connection testing before proceeding
- ✅ **PLAN** - Port conflict detection before deployment
- ✅ **PLAN** - Version compatibility checks (Proxmox, dependencies)

**Data Protection**:
- ✅ **PLAN** - Configuration files stored with 600 permissions (root-only)
- ✅ **PLAN** - Database credentials not logged or echoed
- ✅ **PLAN** - Backup archives encrypted (user-provided key option)
- ✅ **PLAN** - SSL/TLS certificates handled securely (admin-provided)

**Error Handling**:
- ✅ **PLAN** - All script errors trapped with `set -euo pipefail`
- ✅ **PLAN** - Cleanup on failures (no partial state)
- ✅ **PLAN** - Detailed error messages with troubleshooting steps
- ✅ **PLAN** - Lock file mechanism prevents concurrent operations

**Database**:
- ✅ **PLAN** - Pre-migration backups (automatic before updates)
- ✅ **PLAN** - Support SQLite/PostgreSQL/MySQL (spec requirement)
- ✅ **PLAN** - Migration execution uses Vikunja's existing migration system

**Dependencies**:
- ✅ **PLAN** - Pin specific versions in deployment (reproducible installs)
- ✅ **PLAN** - Version compatibility matrix documented
- ✅ **PLAN** - Download verification (checksums/signatures where available)

**Result**: ✅ PASS (security appropriate for infrastructure automation)

---

## Constitution Check Summary

**Overall Status**: ✅ **PASS - PROCEED TO PHASE 0**

**Justification**: This feature is infrastructure automation (deployment scripts) rather than application code, so some Constitution principles apply differently:
- Architecture patterns N/A (no service layer changes)
- Integration testing over unit testing (appropriate for Bash scripts)
- CLI UX patterns instead of web/mobile UI
- Security focuses on input validation and credential handling

**Technical Debt Items**: None identified at planning stage

**Re-check Required**: After Phase 1 design (data model, contracts, quickstart)

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
deploy/
├── proxmox/
│   ├── vikunja-install.sh           # Bootstrap installer (curl-able entry point)
│   ├── vikunja-install-bootstrap.sh # Bootstrap source (copied to vikunja-install.sh)
│   ├── vikunja-install-main.sh      # Main deployment script (downloaded by bootstrap)
│   ├── vikunja-update.sh            # Update/upgrade script
│   ├── vikunja-manage.sh            # Management wrapper (status/backup/restore/uninstall)
│   ├── lib/
│   │   ├── common.sh                # Shared functions (logging, colors, validation)
│   │   ├── proxmox-api.sh           # Proxmox VE API interactions
│   │   ├── lxc-setup.sh             # Container creation and configuration
│   │   ├── service-setup.sh         # Systemd service generation and management
│   │   ├── nginx-setup.sh           # Reverse proxy configuration
│   │   ├── health-check.sh          # Health validation for all components
│   │   ├── backup-restore.sh        # Backup/restore operations
│   │   └── blue-green.sh            # Blue-green deployment logic
│   ├── templates/
│   │   ├── vikunja-backend.service  # Systemd unit template (backend)
│   │   ├── vikunja-frontend.service # Systemd unit template (frontend/nginx)
│   │   ├── vikunja-mcp.service      # Systemd unit template (MCP server)
│   │   ├── nginx-vikunja.conf       # Nginx site configuration template
│   │   ├── deployment-config.yaml   # Deployment configuration template
│   │   └── health-check.sh          # Health check script (deployed to container)
│   ├── tests/
│   │   ├── integration/
│   │   │   ├── test-fresh-install.sh      # Test P1: fresh deployment
│   │   │   ├── test-update-cycle.sh       # Test P1: update with migrations
│   │   │   ├── test-rollback.sh           # Test P1: failure and rollback
│   │   │   ├── test-reconfigure.sh        # Test P2: configuration changes
│   │   │   ├── test-health-checks.sh      # Test P2: status monitoring
│   │   │   ├── test-backup-restore.sh     # Test P3: backup/restore cycle
│   │   │   └── test-multi-instance.sh     # Test: concurrent instances
│   │   └── fixtures/
│   │       ├── mock-proxmox-api.sh        # Mock Proxmox API for CI
│   │       └── test-config.yaml           # Test configuration
│   └── docs/
│       ├── README.md                      # Quick start guide
│       ├── ARCHITECTURE.md                # Blue-green deployment explanation
│       ├── TROUBLESHOOTING.md             # Common issues and solutions
│       └── DEVELOPMENT.md                 # Testing and contribution guide

# Existing Vikunja structure (unchanged, referenced by deployment)
pkg/                                       # Go backend (deployed to container)
frontend/                                  # Vue.js frontend (deployed to container)
mcp-server/                                # MCP server (deployed to container)
```

**Structure Decision**: 

This feature adds a new `deploy/proxmox/` directory containing all deployment automation. The structure is organized as:

1. **Bootstrap installer**: `vikunja-install.sh` is the curl-able entry point that downloads all required components
2. **Main installer**: `vikunja-install-main.sh` contains the actual deployment logic (requires lib/ dependencies)
3. **lib/**: Modular library functions for code reuse and maintainability
4. **templates/**: Configuration file templates (systemd units, nginx, YAML config)
5. **tests/**: Integration test suite matching the 5 user stories from spec
6. **docs/**: User and developer documentation

**Bootstrap Architecture Pattern**:

The deployment uses a two-stage bootstrap pattern to enable single-command curl-based installation while maintaining modular code structure:

1. **Stage 1 (Bootstrap)**: User runs `bash <(curl -fsSL .../vikunja-install.sh)` which executes the lightweight bootstrap script
2. **Stage 2 (Download)**: Bootstrap downloads all required files (main installer, libraries, templates) to `/tmp/vikunja-installer-$$`
3. **Stage 3 (Execute)**: Bootstrap executes the full installer with all dependencies available locally

This pattern solves the fundamental problem of sourcing library dependencies when the script is piped through curl (where `SCRIPT_DIR` would be `/dev/fd/` instead of a filesystem path). It matches industry-standard patterns used by Docker, Kubernetes, and other infrastructure tools.

The deployment scripts are **independent** of the Vikunja codebase - they deploy the existing `pkg/`, `frontend/`, and `mcp-server/` directories without modifying them. This maintains clear separation of concerns: deployment infrastructure vs. application code.

## Complexity Tracking

*No Constitution violations identified - this section is not applicable.*

All complexity is inherent to the deployment domain:
- Blue-green deployment pattern: required for zero-downtime updates (SC-003)
- Multiple script components: necessary for modularity and testing
- Bash scripting: appropriate for infrastructure automation on Linux
- Three service components: matches Vikunja's existing architecture (backend/frontend/MCP)
