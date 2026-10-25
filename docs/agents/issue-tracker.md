# Issue tracker: GitHub

Issues and specs for this project live in `Anoushka004/car-dealership-inventory` on GitHub. Use the `gh` CLI with `--repo Anoushka004/car-dealership-inventory` for issue operations. Always specify the repository explicitly, including from independent clones.

## Conventions

- Create an issue: `gh issue create --repo Anoushka004/car-dealership-inventory --title "..." --body "..."`.
- Read an issue: `gh issue view <number> --repo Anoushka004/car-dealership-inventory --json number,title,body,labels,comments`.
- List issues: `gh issue list --repo Anoushka004/car-dealership-inventory --state open --json number,title,body,labels,comments` with appropriate label and state filters.
- Comment: `gh issue comment <number> --repo Anoushka004/car-dealership-inventory --body "..."`.
- Apply or remove labels: `gh issue edit <number> --repo Anoushka004/car-dealership-inventory --add-label "..."` or `--remove-label "..."`.
- Close: `gh issue close <number> --repo Anoushka004/car-dealership-inventory --comment "..."`.
- Make an issue a sub-issue: use `gh issue create --parent <parent>` or `gh issue edit <parent> --add-sub-issue <child>` when supported. Otherwise, put `Part of #<parent>` in the child body.

## Pull requests as a triage surface

**PRs as a request surface: no.** Set this to `yes` if external PRs should enter the triage queue.

## Skill operations

- When a skill says to publish to the issue tracker, create a GitHub issue in this repository.
- When a skill says to fetch a ticket, read the specified issue with `gh issue view`.
- GitHub issues and PRs share a number space. Check the item type when a bare `#<number>` is ambiguous.

## Wayfinding

- **Map:** one issue labeled `wayfinder:map`, with Notes, Decisions-so-far, and Fog in its body.
- **Child ticket:** a sub-issue of the map, labeled `wayfinder:<type>` where type is `research`, `prototype`, `grilling`, or `task`. If sub-issues are unavailable, link it in a task list in the map and include `Part of #<map>` in the child body.
- **Blocking:** use GitHub issue dependencies when available. If unavailable, put `Blocked by: #<number>` near the top of the child body. A ticket is unblocked when all blockers are closed.
- **Frontier:** find the first open, unblocked, unassigned child in map order.
- **Claim:** assign the issue to the current developer before work.
- **Resolve:** comment with the answer, close the child, and append a short context pointer to the map's Decisions-so-far.

