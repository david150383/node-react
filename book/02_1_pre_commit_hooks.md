This is where the [pre-commit](https://pre-commit.com/) framework comes in. It is a tool that manages these hooks for you. Instead of writing complex bash scripts, you just create a simple YAML configuration file. The framework reads this file, downloads the necessary tools, and runs them against your code right before a commit is created.

If your code has syntax errors, messy formatting, or unused variables, the hook blocks the commit entirely. This forces you to fix the issues locally, keeping your Git history clean and saving your cloud CI/CD pipeline from wasting time on simple typos.

### Configure the hooks

Create a file named `.pre-commit-config.yaml` in the root directory of your project. You are going to build this configuration step by step to cover both the Python backend and the Vue.js frontend.

First, let's configure the backend hooks. You will use a tool called [Ruff](https://docs.astral.sh/ruff/). Ruff is a modern, blazingly fast Python linter and formatter. It replaces older tools like Flake8, Black, and isort.

> [!TIP]
> The `rev` value in the configuration specifies the exact version of the tool you are installing. By the time you read this guide, newer versions of Ruff or ESLint will likely be available. It is always best practice to check their respective GitHub repositories and use the latest stable releases instead of strictly copying the version numbers shown below.

Add this block to your file:

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: "v0.15.12"
    hooks:
      - id: ruff
        name: ruff (lint)
        args: [--fix]
        files: ^backend/
      - id: ruff-format
        name: ruff (format)
        files: ^backend/
```

Here is what is happening:

- The `ruff` hook acts as a linter. By passing the `--fix` argument, you are telling Ruff not just to find errors, but to actively fix the ones it knows how to solve (like removing unused imports).
- The `ruff-format` hook enforces a strict visual style, ensuring your spacing and line lengths are perfectly consistent.
- The `files: ^backend/` line is important. It tells the framework to only run these Python tools on files inside your backend folder.

Next, you need to handle the frontend. You will use **ESLint** to catch logic bugs in your JavaScript and Vue files, and **Prettier** to handle the visual formatting.

Append this configuration to the same file:

```yaml
  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: "v9.39.1"
    hooks:
      - id: eslint
        name: eslint (frontend)
        files: ^frontend/.*\.(js|vue)$
        types: [file]
        args: [--fix, --config, frontend/eslint.config.js]
        additional_dependencies:
          - eslint@9.39.1
          - eslint-plugin-vue@10.6.2
          - eslint-config-prettier@10.1.8
          - globals@16.5.0
          - vue-eslint-parser@10.2.0

  - repo: local
    hooks:
      - id: prettier-frontend
        name: prettier (frontend)
        entry: npx prettier --write
        language: node
        language_version: system
        files: ^frontend/.*\.(js|vue|css|scss|html|json)$
        types_or: [javascript, vue, css, scss, html, json]
```

This section introduces a few advanced concepts:

- **Targeted arguments**: The ESLint hook uses the `--config` argument to point directly to your frontend's specific ESLint configuration file.
- **Additional dependencies**: Because ESLint needs to understand Vue's custom `.vue` file structure, you must explicitly provide plugins like `eslint-plugin-vue` and `vue-eslint-parser` so the hook runs correctly in its isolated environment.
- **The local repository**: Notice that Prettier is listed as a `local` repository instead of a GitHub URL. Sometimes, relying on the Node.js tools already installed on your system is much faster and more reliable than making the framework download a fresh copy. This hook simply runs `npx prettier --write` directly on your frontend assets.

Your complete `.pre-commit-config.yaml` file should now contain both the Python and JavaScript blocks perfectly integrated.

### Install and test the hooks

Your configuration file is complete, but right now, it is just a plain text file. You need to install the pre-commit framework so it can read your YAML file and link those tools to your Git repository.

Open your terminal on your **local computer** (do not SSH into your DigitalOcean droplet for this step). Ensure you are in the root directory of your project and activate your Python virtual environment.

```bash
# Create a virtual environment if you haven't already
python3 -m venv venv

# Activate it
source venv/bin/activate
```

Install the pre-commit package using `pip`.

```bash
pip install pre-commit
```

Next, tell the framework to read your `.pre-commit-config.yaml` file and install the hooks into your hidden `.git` directory.

```bash
pre-commit install
```

When you run this, the framework places a small script inside `.git/hooks/pre-commit`. This script acts as a trigger: from now on, whenever you type `git commit`, this script will intercept the commit process and run your linters and formatters first.

To verify that everything is working properly, you should manually trigger the hooks across your entire project right now.

```bash
pre-commit run --all-files
```

The first time you run this, it will take a minute or two because the framework has to download Ruff, ESLint, and the Node.js dependencies. Once it finishes, it will scan your files and output a checklist.

The output in your terminal should look similar to this:

```text
ruff (lint)........................................................Passed
ruff (format)......................................................Passed
eslint (frontend)..................................................Passed
prettier (frontend)................................................Passed
```

If a check fails, the framework will block the commit. It will often fix the formatting automatically for you, but you still need to stage the new changes (`git add .`) and run the commit command again.

