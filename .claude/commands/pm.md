Enter plan mode (shift+tab until you see "plan mode on") if not already in it.

Read roadmap.md and PLAN.md. Then determine which mode to operate in:

## Mode 1: Sprint Check (after a sprint was just completed)

If the previous plan completed a sprint (sprint X) and no check has been done yet, the next step is a thorough review. Create a plan titled "Check of Sprint X" that covers:

- What was not completed?
- What was only half completed?
- Are there bugs with the implementation?
- What was not properly tested?
- What was not done according to best practices?
- What was half-assed?
- Were there features or bugs that were skipped because they were too complicated?
- Did tests not pass and were ignored?
- Thoroughly check everything EVERYTHING to make sure we are 110%.

Present this check plan for approval. Once approved, execute the review step by step, fixing any issues found with full TDD discipline.

## Mode 2: Normal Sprint Work (after a check was completed, or no check needed)

If the previous plan completed a check of a sprint, or if the current state is mid-sprint work:

1. Identify the highest priority incomplete sprint/task
2. Create a detailed plan in PLAN.md with:
   - Numbered steps
   - TDD approach for each step (what test to write, what to implement)
   - Explicit COMMIT markers
3. Present the plan to me for approval

## Execution

Once I approve, exit plan mode (shift+tab) and execute the plan step by step, following TDD strictly.

Do NOT start executing until I approve the plan.
