# Implementation Plan: Universal Data Export/Import System

**Feature**: 003-data-export-import  
**Duration**: 4 weeks  
**Status**: Planning  

## Overview

Implement a comprehensive data export/import system to enable seamless migration between Vikunja instances, supporting different database backends and authentication methods.

## Phase Breakdown

### Phase 1: SQLite Database Import (Week 1) ⭐ **CRITICAL**

**Goal**: Implement SQLite database import for migration from original instance

**Tasks**:
1. [ ] Create `SQLiteImportService` in `pkg/services/sqlite_import.go`
2. [ ] Implement SQLite database reading (direct file access)
3. [ ] Implement schema mapping (old schema → new schema)
4. [ ] Implement data transformation and migration
5. [ ] Implement files migration (copy to new location)
6. [ ] Implement `import-db` CLI command in `pkg/cmd/import_db.go`
7. [ ] Add transaction management and rollback
8. [ ] Add progress reporting
9. [ ] Add unit tests for SQLite import service

**Deliverables**:
- Working CLI command: `vikunja import-db`
- SQLite import service with transaction safety
- Unit tests with >80% coverage
- **PRIMARY MIGRATION PATH FUNCTIONAL**

### Phase 2: Export & ZIP Import (Week 2)

**Goal**: Implement admin export and ZIP archive import for portability

**Tasks**:
1. [ ] Create `AdminExportService` in `pkg/services/admin_export.go`
2. [ ] Implement manifest generation
3. [ ] Implement `export` CLI command in `pkg/cmd/export.go`
4. [ ] Create `ZipImportService` in `pkg/services/zip_import.go`
5. [ ] Implement ZIP archive reading and validation
6. [ ] Implement manifest parsing and validation
7. [ ] Implement full import mode (empty database)
8. [ ] Implement `import` CLI command in `pkg/cmd/import.go`
9. [ ] Add ID remapping logic for foreign key updates
10. [ ] Add unit tests for export and import services

**Deliverables**:
- Working CLI commands: `vikunja export`, `vikunja import`
- Export and import services with transaction safety
- Unit tests with >80% coverage

### Phase 3: Merge & User Import (Week 3)

**Goal**: Implement merge and user import modes with conflict resolution

**Tasks**:
1. [ ] Implement conflict detection logic
2. [ ] Implement conflict resolution strategies (skip, rename, error)
3. [ ] Implement merge import mode
4. [ ] Implement user import mode
5. [ ] Create `MigrationValidatorService` in `pkg/services/migration_validator.go`
6. [ ] Implement pre-import validation
7. [ ] Implement post-import verification
8. [ ] Add CLI commands: `validate-export`, `verify-migration`
9. [ ] Add integration tests

**Deliverables**:
- Working merge and user import modes
- Validation and verification tools
- Integration tests covering main workflows

### Phase 4: Testing & Documentation (Week 4)

**Goal**: Comprehensive testing and documentation

**Tasks**:
1. [ ] Write comprehensive unit tests for all services
2. [ ] Write integration tests for full migration workflow
3. [ ] Test with SQLite → PostgreSQL migration
4. [ ] Test with SQLite → MySQL migration
5. [ ] Test with large datasets (1000+ users, 10000+ tasks)
6. [ ] Performance testing and optimization
7. [ ] Write migration guide for administrators
8. [ ] Write CLI command reference documentation
9. [ ] Create troubleshooting guide
10. [ ] Write example migration workflows
11. [ ] Create video tutorial (optional)

**Deliverables**:
- Complete test suite
- Migration documentation
- Admin guide
- CLI reference
- Troubleshooting guide

## Dependencies

### Internal Dependencies
- ✅ Spec 001 (service-layer refactor) - COMPLETE
- ✅ Existing user export service - COMPLETE

### External Dependencies
- Database drivers (PostgreSQL, MySQL, SQLite)
- Archive/zip library (stdlib)
- CLI framework (already in use)

## Technical Architecture

### Service Layer Components

```
pkg/services/
├── admin_export.go        # NEW: Admin export service
├── import.go              # NEW: Import service  
├── migration_validator.go # NEW: Validation service
└── user_export.go         # EXISTING: Enhanced for new format
```

### CLI Commands

```
pkg/cmd/
├── export.go              # NEW: Export CLI command
├── export_db.go           # NEW: Direct database export
├── import.go              # NEW: Import CLI command
├── validate_export.go     # NEW: Validation command
└── verify_migration.go    # NEW: Verification command
```

### Data Flow

```
┌──────────────┐
│ Original DB  │
│ (Any Engine) │
└──────┬───────┘
       │
       ├─── AdminExportService ───┐
       │                          │
       └─── DirectDBExport ───────┤
                                  │
                          ┌───────▼────────┐
                          │  Export ZIP    │
                          │  - manifest    │
                          │  - users       │
                          │  - projects    │
                          │  - files       │
                          └───────┬────────┘
                                  │
                          ┌───────▼────────┐
                          │   Validation   │
                          │   (Optional)   │
                          └───────┬────────┘
                                  │
                          ┌───────▼────────┐
                          │ ImportService  │
                          │ - Parse        │
                          │ - Validate     │
                          │ - Transform    │
                          │ - Insert       │
                          └───────┬────────┘
                                  │
                          ┌───────▼────────┐
                          │   Target DB    │
                          │  (Any Engine)  │
                          └────────────────┘
```

## Risk Management

### High Priority Risks

1. **Data Loss During Import**
   - Mitigation: Transaction-based imports with automatic rollback
   - Testing: Extensive integration tests with rollback scenarios
   - Recovery: Keep original database as backup

2. **Authentication Failure Post-Import**
   - Mitigation: Password reset mechanism for local users
   - Testing: Test OIDC/LDAP authentication separately
   - Recovery: Admin password reset command

3. **Performance with Large Datasets**
   - Mitigation: Stream processing, batch inserts
   - Testing: Performance tests with large datasets
   - Monitoring: Progress reporting during import

## Success Metrics

### Functional Metrics
- ✅ Zero data loss in migration
- ✅ All relationships preserved correctly
- ✅ All files transferred successfully
- ✅ Users can authenticate post-migration

### Performance Metrics
- Export 1000 users in < 5 minutes
- Import 1000 users in < 15 minutes
- Memory usage < 500 MB during import
- Compressed export < 50% of original database size

### Quality Metrics
- Unit test coverage > 80%
- Zero critical bugs in production
- Clear error messages for all failure cases
- Complete documentation available

## Timeline

```
Week 1: Export Enhancements
├─ Day 1-2: AdminExportService implementation
├─ Day 3: CLI commands (export, export-db)
├─ Day 4: Manifest and format updates
└─ Day 5: Unit tests and documentation

Week 2: Import Implementation
├─ Day 1-2: ImportService core (full mode)
├─ Day 3: Transaction management
├─ Day 4: CLI command and ID remapping
└─ Day 5: Unit tests

Week 3: Merge & User Import
├─ Day 1-2: Conflict detection and resolution
├─ Day 3: Merge and user import modes
├─ Day 4: Validation service
└─ Day 5: Integration tests

Week 4: Testing & Documentation
├─ Day 1-2: Comprehensive testing
├─ Day 3: Cross-database testing
├─ Day 4: Documentation writing
└─ Day 5: Review and polish
```

## Resources Required

### Development
- 1 Senior Backend Developer (full-time, 4 weeks)
- 1 QA Engineer (part-time, week 4)

### Infrastructure
- Test servers with PostgreSQL and MySQL
- Staging environment for migration testing
- Test data sets (small, medium, large)

### Tools
- Database clients (psql, mysql)
- Profiling tools for performance testing
- Documentation tools (markdown editors)

## Testing Strategy

### Unit Tests
- Export services (all methods)
- Import services (all methods)
- Validation services
- Conflict resolution logic
- ID remapping logic

### Integration Tests
- Full export → import workflow
- Merge import scenarios
- User import scenarios
- Cross-database migrations
- Error handling and rollback

### Performance Tests
- Large dataset exports (1000+ users)
- Large dataset imports (10000+ tasks)
- Memory usage monitoring
- Disk I/O optimization

### Manual Testing
- OIDC authentication post-import
- LDAP authentication post-import
- Local user password reset
- File attachment verification
- UI functionality verification

## Documentation Deliverables

### Technical Documentation
- Export format specification
- Import service architecture
- Database schema mapping
- CLI command reference

### User Documentation
- Migration guide for administrators
- Step-by-step migration workflows
- Troubleshooting guide
- FAQ document

### Developer Documentation
- Service layer API documentation
- Extension points for custom migrations
- Testing guide
- Contributing guide for import/export features

## Rollout Plan

### Phase 1: Internal Testing
- Test on development instances
- Migrate staging environments
- Gather feedback from development team

### Phase 2: Beta Testing
- Select volunteer users for migration testing
- Document issues and edge cases
- Refine documentation based on feedback

### Phase 3: Production Release
- Release with documentation
- Provide migration support
- Monitor for issues
- Collect feedback for improvements

### Phase 4: Post-Release
- Bug fixes and improvements
- Performance optimizations
- Feature enhancements based on feedback

## Communication Plan

### Development Phase
- Daily standups for progress updates
- Weekly demos of completed features
- Slack/Discord updates for blockers

### Testing Phase
- Test results shared in documentation
- Bug tracking in issue tracker
- Performance benchmarks published

### Release
- Release notes with migration guide
- Blog post explaining the feature
- Community announcement
- Video tutorial (optional)

## Budget Estimate

### Development Time
- 4 weeks × 1 developer = 160 hours
- QA testing = 40 hours
- Total: 200 hours

### Infrastructure
- Test servers: $100/month
- Development tools: Included in existing
- Total: ~$100

### Overall Estimate
- Low-cost implementation
- High value for users
- Enables production migration to refactored version

## Next Steps

1. ✅ Specification approved
2. [ ] Create development branch
3. [ ] Setup test infrastructure
4. [ ] Begin Phase 1 implementation
5. [ ] Daily progress updates

---

**Approved by**: [Pending]  
**Start Date**: [TBD]  
**Target Completion**: [TBD + 4 weeks]
