### Catch errors early with pre-commit hooks
You have locked the door to your main branch, but you still need a gatekeeper to check what goes into your local commits.

Git has a built-in feature called [hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks). These are hidden scripts that run automatically when you perform actions like committing or pushing code. However, writing and managing custom shell scripts for every single developer on a project is a nightmare.

- **[pre-commit for python](02_1_pre_commit_hooks.md)**
- **[pre-commit for nodejs](02_2_pre_commit_hooks.md)**

### The emergency bypass

Pre-commit hooks are strict, which keeps your codebase clean. However, there might be a rare emergency where you absolutely must commit your code immediately, even if a linter is failing (for example, if you need to save a broken, work-in-progress state to a separate branch before switching tasks).

You can bypass the hooks entirely by adding the `--no-verify` flag to your commit command.

```bash
git commit -m "WIP: saving a broken state" --no-verify
```

Use this flag sparingly. Bypassing your local hygiene means those errors will be caught later by your cloud CI/CD pipeline, forcing you to fix them anyway.



### What is next?

Your local environment is now fully secure. By protecting your main branch and enforcing local pre-commit hooks, you have guaranteed that messy formatting and basic syntax errors never make it into your permanent Git history.

However, local checks only run on your specific laptop. To ensure absolute code quality, you need an isolated environment to verify the code automatically.

In the next subchapter, **Chapter 5.2: Continuous Integration**, you will take this automation to the cloud. You will configure [GitHub Actions](https://github.com/features/actions) to run these exact linting checks, alongside your unit tests, ensuring that no pull request can be merged unless the code passes all checks.

