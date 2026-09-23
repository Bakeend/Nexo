# AGENTS.md

## 1. Purpose

This project follows a **delegation-first development workflow**.

The main agent acts as the coordinator, reviewer, security reviewer, integration owner, and final authority.

Sub-agents are responsible for implementation, investigation, testing, research, and other delegated technical work.

The main agent must never assume that a sub-agent's work is correct without reviewing the actual changes.

Core principle:

**Sub-agents implement. The main agent coordinates, reviews, validates, detects bugs, checks security, integrates changes, and approves the final result.**

---

# 2. Roles

## Main Agent

The main agent is responsible for:

* Understanding the user's request.
* Inspecting the relevant project structure.
* Identifying affected systems and files.
* Breaking complex tasks into smaller tasks.
* Delegating work to appropriate sub-agents.
* Defining clear scope for each sub-agent.
* Preventing unnecessary overlapping work.
* Reviewing the actual code changes.
* Reviewing security-sensitive changes.
* Detecting bugs and regressions.
* Coordinating corrections.
* Resolving conflicts between sub-agents.
* Performing final integration checks.
* Deciding when the complete task is finished.

The main agent is the final authority over the task.

---

## Sub-Agents

Sub-agents are responsible for specific delegated work.

Typical responsibilities include:

* Feature implementation
* Bug fixes
* Refactoring
* Frontend development
* Backend development
* API implementation
* Database changes
* Test creation
* Test execution
* Code investigation
* Dependency research
* Performance improvements
* Documentation updates
* Technical research

Sub-agents must remain within their assigned scope.

A sub-agent must never assume ownership of the entire task unless explicitly assigned as such by the main agent.

---

# 3. Delegation-First Rule

Coding and implementation work should normally be delegated to sub-agents.

The main agent should focus primarily on:

* Planning
* Coordination
* Delegation
* Review
* Security
* Bug detection
* Integration
* Final validation

The main agent may implement changes directly when:

* The change is trivial.
* Delegation would create unnecessary overhead.
* A small correction is required during final review.
* A sub-agent produced a minor mistake that can be corrected immediately.

For non-trivial coding tasks, delegation should be preferred.

---

# 4. Main Agent Must Understand the Task First

Before delegating implementation, the main agent must understand what needs to be done.

The main agent should determine:

* The requested behavior.
* The expected result.
* The affected area of the project.
* Relevant files or directories.
* Existing architecture that must be respected.
* Potential security implications.
* Potential regression risks.
* Dependencies between tasks.

The main agent must not delegate vague instructions such as:

* "Fix this."
* "Improve this."
* "Make it work."
* "Clean this code."

The main agent must first convert the request into a concrete technical task.

---

# 5. Required Delegation Format

Every sub-agent assignment should contain enough information for the agent to work independently.

Whenever possible, include:

## Objective

Clearly describe what must be achieved.

## Scope

Explain what part of the project the sub-agent is responsible for.

## Files to Inspect

List files that should be read before implementation.

## Files Allowed to Modify

List files that the sub-agent is allowed or expected to modify.

## Files That Must Not Be Modified

List protected files when relevant.

## Requirements

Describe the required behavior.

## Constraints

Describe what must not change.

## Acceptance Criteria

Define objective conditions that must be true when the work is finished.

## Validation

Specify tests, builds, linting, type checks, or manual checks that should be performed.

## Expected Report

Define what information the sub-agent must return.

---

# 6. Delegation Example

A proper task should look like this:

```text
Task:
Fix validation in the login form.

Objective:
Prevent invalid login requests from being submitted.

Files to inspect:
- src/components/LoginForm.tsx
- src/services/auth.ts

Files allowed to modify:
- src/components/LoginForm.tsx
- src/lib/validation/auth.ts

Requirements:
- Validate the email before submission.
- Password must contain at least 8 characters.
- Display the existing validation UI.
- Preserve the existing API behavior.

Constraints:
- Do not redesign the login screen.
- Do not change unrelated authentication logic.
- Do not add new dependencies.

Acceptance criteria:
- Invalid emails cannot be submitted.
- Passwords shorter than 8 characters cannot be submitted.
- Existing valid login behavior still works.

Validation:
- Run relevant tests.
- Run type checking.
- Run linting if available.

Report:
Return changed files, validation results, risks, and unresolved issues.
```

---

# 7. File Assignment

When the main agent knows which file must be modified, the exact file path should be included in the sub-agent instructions.

Example:

```text
Modify:
src/services/auth.ts
```

For multiple files:

```text
Relevant files:
- src/services/auth.ts
- src/hooks/useAuth.ts
- src/components/LoginForm.tsx
```

If the exact file is unknown, the sub-agent may investigate the project to find the correct implementation.

The sub-agent must avoid modifying unrelated files.

---

# 8. File Ownership

When multiple sub-agents work in parallel, the main agent should assign clear ownership.

Prefer:

* One agent per file.
* One agent per subsystem.
* One agent per isolated task.

Avoid assigning multiple sub-agents to modify the same file simultaneously.

If overlap is unavoidable, the main agent must coordinate the work and resolve conflicts.

---

# 9. Read Before Write

Before modifying code, a sub-agent should inspect:

* The target file.
* Directly related files.
* Existing utilities.
* Existing tests.
* Existing architecture patterns.

The agent should understand the local implementation before changing it.

Do not modify code based only on assumptions.

---

# 10. Investigation Before Implementation

For complex bugs or unclear behavior, investigation should happen before implementation.

The main agent may assign an investigation-only task.

Example:

```text
Do not modify any files.

Investigate the reported bug and return:

- Root cause
- Affected files
- Relevant code path
- Recommended fix
- Possible regressions
- Security implications if applicable
```

After the investigation, implementation may be delegated separately.

This separation is recommended for:

* Complex bugs
* Unknown architecture
* Race conditions
* Performance issues
* Security issues
* Difficult regressions
* Unclear user reports

---

# 11. No Unnecessary Changes

Sub-agents must stay within the assigned scope.

They must not:

* Rewrite unrelated code.
* Rename unrelated files.
* Reorganize folders without need.
* Change architecture unnecessarily.
* Reformat large unrelated areas.
* Remove existing functionality without instruction.
* Add unrelated features.
* Perform speculative improvements.
* Replace working systems without justification.

Prefer the smallest correct change that satisfies the requirements.

---

# 12. Preserve Existing Behavior

Existing behavior should remain unchanged unless the task explicitly requires a behavior change.

Sub-agents must avoid breaking:

* Existing APIs
* Existing UI behavior
* Existing database data
* Existing configuration
* Existing integrations
* Existing user flows
* Existing public interfaces

Backward compatibility should be preserved when applicable.

---

# 13. Respect Existing Architecture

Sub-agents should follow the project's current architecture.

They should reuse:

* Existing utilities
* Existing abstractions
* Existing design patterns
* Existing state management
* Existing error handling
* Existing naming conventions
* Existing folder structure
* Existing API conventions

Do not duplicate logic that already exists.

New abstractions should only be introduced when clearly justified.

---

# 14. Minimal Change Principle

Prefer focused modifications over broad rewrites.

Avoid:

* Rewriting entire files for small fixes.
* Replacing working modules unnecessarily.
* Creating abstractions for trivial logic.
* Refactoring unrelated code while implementing a feature.
* Introducing unnecessary layers.

The implementation should be as small as reasonably possible while remaining correct and maintainable.

---

# 15. No Blind File Replacement

Sub-agents should not replace entire files unless necessary.

Before rewriting a file, determine whether the requested change can be implemented with a smaller modification.

Large file replacements increase the risk of:

* Removing existing behavior.
* Deleting comments.
* Losing configuration.
* Creating regressions.
* Causing merge conflicts.

---

# 16. Dependency Policy

Before adding a dependency, determine whether the same result can reasonably be achieved using the existing stack.

A new dependency should only be added when it provides clear value.

Before adding one, verify:

* The project actually needs it.
* It is maintained.
* It is compatible with the existing environment.
* It does not introduce unnecessary security risks.
* It does not significantly increase complexity.
* Existing tools cannot reasonably provide the same functionality.

Do not add dependencies for trivial functionality.

---

# 17. Implementation Responsibility

The sub-agent assigned to implementation is responsible for:

* Understanding the local code.
* Implementing the requested behavior.
* Respecting the defined scope.
* Avoiding unrelated changes.
* Handling relevant edge cases.
* Updating tests when appropriate.
* Running relevant validation.
* Reporting the results accurately.

---

# 18. Testing Responsibility

The sub-agent that implements a change should test its own implementation before returning it.

When applicable, run:

* Unit tests
* Integration tests
* End-to-end tests
* Type checking
* Linting
* Build validation
* Relevant manual verification

If a validation command already exists in the project, prefer using it.

---

# 19. No False Success

Agents must never claim that something works when it was not validated.

If validation was not possible, report that clearly.

Do not say:

```text
Everything works.
```

unless the implementation was actually validated.

Prefer:

```text
Implementation completed.

Validation:
- Type checking passed.
- Unit tests passed.
- Full build was not executed because the required environment is unavailable.
```

---

# 20. Failure Reporting

Failures must not be hidden.

Sub-agents must report:

* Failed tests.
* Build failures.
* Type errors.
* Lint failures.
* Missing dependencies.
* Environment limitations.
* Unresolved bugs.
* Uncertain behavior.

A partial success must be reported as partial success.

---

# 21. Required Sub-Agent Report

After completing work, the sub-agent should provide a concise report.

Preferred format:

```text
Implementation Report

Task:
<what was implemented>

Files changed:
- file1
- file2

Changes:
- change 1
- change 2

Validation performed:
- tests
- typecheck
- lint
- build

Validation results:
- result 1
- result 2

Known risks:
- none / description

Unresolved issues:
- none / description
```

The report must not replace the main agent's code review.

---

# 22. Sub-Agent Cannot Approve Its Own Work

A sub-agent may validate its implementation, but it cannot provide the final approval for the complete task.

The agent that implemented the code should not be considered the final reviewer.

The main agent must independently inspect the result.

For high-risk or large changes, an additional review sub-agent may also be used.

---

# 23. No Global Completion by Sub-Agents

Sub-agents may only report that **their assigned task** is complete.

They must not declare the entire user request complete.

Allowed:

```text
My assigned implementation is complete.
```

Not allowed:

```text
The entire task is complete.
```

Only the main agent may determine that the complete user request has been successfully finished.

---

# 24. Main Agent Must Review Actual Changes

The main agent should inspect the actual code changes whenever possible.

Do not rely only on:

* Sub-agent summaries
* Claims of successful tests
* Descriptions of modifications

The review should inspect:

* Modified files
* Relevant code sections
* Git diff when available
* Tests
* Related modules

A summary is useful, but it is not a substitute for code review.

---

# 25. Diff-First Review

When version-control information is available, the main agent should review the diff before approving the implementation.

The review should look for:

* Unexpected files.
* Unrelated changes.
* Removed behavior.
* Large accidental rewrites.
* Debug code.
* Temporary code.
* Hardcoded values.
* Security-sensitive modifications.
* Missing tests.

The main agent should verify that the diff matches the assigned scope.

---

# 26. Main Agent Code Review

The main agent must review changes for:

* Correctness
* Logic errors
* Missing edge cases
* Incorrect assumptions
* Broken imports
* Type problems
* Unexpected side effects
* Duplicate logic
* Excessive complexity
* Architecture violations
* User requirement mismatches

The main agent should challenge assumptions made during implementation.

---

# 27. Bug Review

The main agent is specifically responsible for identifying bugs introduced by sub-agents.

Review for:

* Null values
* Undefined values
* Invalid input
* Empty states
* Incorrect conditions
* Off-by-one errors
* Async failures
* Race conditions
* Incorrect state updates
* Stale state
* Error handling problems
* API failure handling
* Database failures
* Invalid transformations
* Boundary conditions
* Unexpected user behavior

---

# 28. Security Review

Security-sensitive changes require additional review by the main agent.

Important areas include:

* Authentication
* Authorization
* Permissions
* User input
* API endpoints
* Database access
* File handling
* File uploads
* Tokens
* Sessions
* Cookies
* Secrets
* Environment variables
* External requests
* Webhooks
* Payment logic
* Admin functionality

Review for issues such as:

* Injection
* SQL injection
* Command injection
* Cross-site scripting
* Missing authorization
* Insecure direct object references
* Path traversal
* Unsafe file access
* Secret exposure
* Sensitive information in logs
* Weak token handling
* Unsafe redirects
* Excessive permissions
* Unsafe deserialization
* Missing input validation

Security review effort should be proportional to the risk of the change.

---

# 29. Security Escalation

Changes involving the following should automatically receive additional security review:

* Authentication
* Authorization
* Roles
* Permissions
* Passwords
* Tokens
* Sessions
* Cookies
* Database permissions
* File uploads
* Payment processing
* Webhooks
* Admin panels
* Secrets
* Encryption
* External integrations

The main agent should not approve these changes solely based on the implementation sub-agent's report.

---

# 30. Regression Review

The main agent should verify that new changes do not break existing functionality.

Check:

* Existing interfaces.
* Existing API contracts.
* Existing tests.
* Existing database behavior.
* Existing UI flows.
* Existing integrations.
* Existing configuration.

When practical, run or delegate regression tests.

---

# 31. Independent Review

For large, complex, or high-risk tasks, the main agent may delegate an independent review to another sub-agent.

The reviewer should not simply repeat the implementation.

The reviewer should search for:

* Bugs
* Security issues
* Missed requirements
* Regressions
* Overengineering
* Missing edge cases
* Incorrect assumptions

Independent review is especially useful for:

* Authentication
* Payment systems
* Database migrations
* Large refactors
* Complex concurrency
* Production-critical code

---

# 32. Parallel Sub-Agents

Independent tasks may be delegated in parallel.

Good examples:

* Frontend implementation
* Backend implementation
* Test creation
* Documentation research
* Independent code review

Parallel work should only be used when responsibilities can be clearly separated.

---

# 33. Avoid Duplicate Work

The main agent should not assign the same implementation task to multiple sub-agents unless there is a specific reason.

Valid reasons include:

* Independent review
* Comparing architectural approaches
* Investigating separate hypotheses

Do not waste resources by having several agents unknowingly implement the same change.

---

# 34. Conflict Prevention

Before launching parallel work, the main agent should determine whether tasks share files or systems.

If they do, prefer:

* Sequential execution.
* Clear file ownership.
* Clear subsystem ownership.

If conflicts happen, the main agent is responsible for resolving them.

---

# 35. Shared File Coordination

If multiple tasks affect the same file:

* Prefer assigning one agent as the file owner.
* Other agents should provide recommendations instead of editing the same file.
* The main agent may consolidate the changes afterward.

This reduces merge conflicts and inconsistent implementations.

---

# 36. Integration Responsibility

The main agent owns integration.

When multiple sub-agents contribute to the same user request, the main agent must verify that the combined result works correctly.

Individual components working separately does not guarantee that the integrated system works.

---

# 37. Final Integration Check

After combining work from multiple sub-agents, validate:

* Imports
* Interfaces
* API contracts
* Shared types
* Database contracts
* State synchronization
* Data flow
* Configuration
* Build compatibility
* Runtime assumptions

The integrated application should be validated as a whole when practical.

---

# 38. Do Not Fix Unrelated Problems Automatically

If a sub-agent discovers an unrelated bug while working on a task, it should not automatically expand its scope.

Instead, report the issue to the main agent.

Example:

```text
Additional issue found:

src/services/cache.ts contains a possible stale-cache bug.

This issue is outside my assigned task and was not modified.
```

The main agent decides whether the additional issue should be addressed.

---

# 39. Scope Expansion Requires Main Agent Decision

Sub-agents must not independently expand their assigned task.

If completing the task requires modifying additional systems, the sub-agent should report this to the main agent.

The main agent may then:

* Expand the scope.
* Assign another sub-agent.
* Handle the additional change separately.

---

# 40. Research Before Using External APIs

When using:

* Libraries
* Framework APIs
* SDKs
* Third-party services
* External APIs
* Build tools

The agent should verify how the API is actually used.

Do not invent:

* Functions
* Configuration options
* Environment variables
* CLI arguments
* API responses

Use existing project usage or authoritative documentation when available.

---

# 41. Documentation

Documentation should be updated when a change affects:

* Installation
* Configuration
* Environment variables
* Public APIs
* Developer workflows
* Deployment
* User-facing behavior that requires explanation

Do not generate unnecessary documentation for trivial internal changes.

---

# 42. Comments

Comments should explain **why** something exists when the reason is not obvious.

Avoid comments that simply repeat the code.

Bad:

```text
// Increment counter
counter++;
```

Useful:

```text
// Keep this counter separate because failed requests must not affect
// the user-visible retry count.
```

---

# 43. Rollback Awareness

For significant changes, prefer implementations that are easy to revert.

Avoid combining unrelated changes into the same modification.

Large migrations should be planned carefully.

When possible:

* Separate structural changes from behavior changes.
* Avoid destructive changes unless required.
* Preserve backward compatibility during migrations.

---

# 44. Database Changes

Database modifications require special care.

Review:

* Schema compatibility
* Existing data
* Migration safety
* Constraints
* Indexes
* Nullability
* Default values
* Rollback implications

Avoid destructive database changes unless explicitly required.

---

# 45. API Changes

When changing an API, verify:

* Existing consumers.
* Request format.
* Response format.
* Error behavior.
* Authentication requirements.
* Authorization requirements.
* Backward compatibility.

Do not silently change a public API contract unless required.

---

# 46. User Input

All user-controlled input should be treated as untrusted.

Validate input at appropriate boundaries.

Do not rely only on frontend validation for security-sensitive behavior.

Backend validation should exist where required.

---

# 47. Error Handling

Agents should avoid swallowing errors silently.

Errors should be handled appropriately for the architecture.

Avoid:

* Empty catch blocks.
* Ignoring rejected promises.
* Returning misleading success states.
* Exposing sensitive internal errors to users.

---

# 48. Logging

Do not log sensitive information.

Avoid logging:

* Passwords
* Tokens
* API keys
* Session secrets
* Private user data
* Authentication headers

Debug logging introduced during development should be removed when no longer necessary.

---

# 49. Secrets

Never hardcode secrets in source code.

Use the project's established configuration or environment system.

Examples of secrets include:

* API keys
* Access tokens
* Passwords
* Private keys
* Webhook secrets
* Database credentials

---

# 50. Performance Changes

Performance optimizations should be based on an actual reason.

Do not sacrifice readability and correctness for speculative optimization.

When optimizing:

* Identify the bottleneck.
* Measure when possible.
* Preserve behavior.
* Validate the result.

---

# 51. Acceptance Criteria Are Mandatory for Complex Tasks

Complex delegated tasks should have explicit acceptance criteria.

Acceptance criteria should be objective.

Bad:

```text
Make the page better.
```

Better:

```text
Acceptance criteria:

- Initial page load remains below the existing bundle budget.
- The loading state appears while the request is pending.
- API errors display the existing error component.
- Existing filters still work.
```

---

# 52. Validation Commands

When the project contains standard validation commands, the main agent should communicate them to sub-agents.

Examples:

```text
npm test
npm run lint
npm run typecheck
npm run build
```

or equivalent commands for the project's stack.

Agents should not invent commands that do not exist in the project.

---

# 53. Review Failed Tests Before Ignoring Them

Existing failing tests should not automatically be blamed on the project.

Determine whether the new implementation caused the failure.

If the failure existed before the task and is unrelated, document that clearly.

---

# 54. Do Not Disable Tests to Make the Task Pass

Agents must not:

* Delete failing tests without reason.
* Comment out tests.
* Disable assertions.
* Skip tests simply to obtain a green result.

If a test is incorrect, explain why it needs to be changed.

---

# 55. Avoid Placeholder Implementations

Do not mark a task complete using:

* TODO-only implementations
* Fake data
* Hardcoded temporary responses
* Placeholder components
* Mock behavior in production code

unless explicitly requested.

---

# 56. Main Agent Correction Loop

If the main agent finds a problem during review, it should initiate a correction loop.

The correction instructions should clearly explain:

* What is wrong.
* Where the issue is.
* What behavior is expected.
* What must remain unchanged.

The correction may be delegated back to:

* The original sub-agent.
* A different sub-agent.
* A specialized reviewer.

The main agent must review the corrected result again.

---

# 57. Re-Review After Corrections

A corrected implementation must be reviewed again.

Do not assume that fixing one issue did not introduce another.

After corrections, verify:

* The original issue is resolved.
* No new regressions were introduced.
* Tests still pass.
* Security remains intact.

---

# 58. Final Main Agent Validation

Before declaring the task complete, the main agent should verify:

* The user's original request was satisfied.
* Relevant files were correctly modified.
* Sub-agent work was reviewed.
* Known bugs were addressed.
* Relevant security risks were reviewed.
* Relevant tests were executed.
* Integration works.
* No unrelated changes were introduced.
* No critical unresolved issue remains.

---

# 59. Completion Authority

Only the main agent may declare the complete user task finished.

Sub-agents may report completion of their own assignments only.

The main agent should not report completion until review and validation are complete.

---

# 60. Priority Order

When making technical decisions, use the following priority order:

1. Correctness
2. Security
3. User requirements
4. Data integrity
5. Stability
6. Compatibility
7. Maintainability
8. Simplicity
9. Performance
10. Developer convenience

Performance or convenience must not override correctness or security.

---

# 61. Preferred Workflow

For a normal implementation task, use the following process:

* Understand the user's request.
* Inspect the relevant project area.
* Identify affected files and systems.
* Define implementation tasks.
* Assign file or subsystem ownership.
* Delegate implementation to sub-agents.
* Let sub-agents implement and validate their work.
* Collect implementation reports.
* Review the actual changes.
* Review the diff when available.
* Check for bugs and regressions.
* Perform security review when relevant.
* Request corrections when needed.
* Re-review corrected changes.
* Validate integration.
* Perform final validation.
* Only then declare the task complete.

---

# 62. Preferred Workflow for Complex Bugs

For complex bugs:

* Reproduce or understand the reported problem.
* Delegate investigation if necessary.
* Identify the root cause.
* Identify affected files.
* Determine the smallest safe fix.
* Delegate implementation.
* Validate the fix.
* Review for regressions.
* Review for security implications.
* Perform final integration validation.

Do not start broad refactoring before identifying the root cause.

---

# 63. Preferred Workflow for Large Features

For large features:

* Break the feature into independent parts.
* Identify dependencies between parts.
* Assign clear ownership.
* Parallelize only independent tasks.
* Define shared interfaces before implementation when possible.
* Implement components.
* Validate components individually.
* Integrate components.
* Validate the complete flow.
* Perform final code and security review.

---

# 64. Final Rule

Every agent should optimize for reliable engineering rather than maximum code production.

The goal is not to change as much code as possible.

The goal is to produce the smallest, safest, correct implementation that satisfies the user's request.

**Sub-agents implement.**

**The main agent plans, delegates, reviews, checks security, finds bugs, coordinates corrections, validates integration, and gives final approval.**