# The automation pipeline
Youtube Video : https://www.youtube.com/watch?v=wY5pQOTsGaA&t=24060s
Course handbook and documentation: https://github.com/ImadSaddik/FullStackDeploymentHandbook
Project source code: https://github.com/ImadSaddik/ImadSaddikWebsite

## Local hygiene

### Introduction

In the previous modules, you deployed your application manually. While this is a perfect way to understand how a Linux server works under the hood, doing it every time you write new code is tedious and risky. In this module, you will shift from manual server management to a continuous integration and continuous delivery (CI/CD) pipeline.

However, before you automate anything in the cloud, you must secure your local workflow. Catching a bug or a formatting error on your laptop takes seconds; catching it after it has been deployed to a server can take much longer to fix.

In this subchapter, we will focus on enforcing code quality at the source. This starts with protecting your primary branches and setting up [pre-commit hooks](https://pre-commit.com/) to automatically format your code before a commit is even created.

- **[Module 1: Protect the default branch](book/01_protect_the_default_branch.md)**

- **[Module 2: Catch errors early with pre-commit hooks](book/02_pre_commit_hooks.md)**

### What is next?

Your local environment is now fully secure. By protecting your main branch and enforcing local pre-commit hooks, you have guaranteed that messy formatting and basic syntax errors never make it into your permanent Git history.

However, local checks only run on your specific laptop. To ensure absolute code quality, you need an isolated environment to verify the code automatically.

In the next subchapter, **Module 3: Continuous Integration**, you will take this automation to the cloud. You will configure [GitHub Actions](https://github.com/features/actions) to run these exact linting checks, alongside your unit tests, ensuring that no pull request can be merged unless the code passes all checks.

- **[Module 3: Continuous integration & unit tests](book/03_continuous_integration_unit_tests.md)**

### What is next?

Your pipeline is now actively defending your codebase against formatting errors and broken logic.

In the next subchapter, **Module 4: Automated security scanning**, you will add security guardrails to your pipeline. You will configure automated tools to audit your third-party dependencies for known vulnerabilities and scan your source code for unsafe practices using [Static Application Security Testing](https://en.wikipedia.org/wiki/Static_application_security_testing) (SAST).

- **[Module 4: Automated security scanning](book/04_automated_security_scanning.md)**

### What is next?

Your pipeline is now extremely robust. It automatically audits your dependencies, scans your source code for bad practices, enforces strict formatting, and verifies your logic with unit tests. However, all of these checks are "static"; they look at the code while it is sitting still.

In **Module 5 Advanced testing & DAST**, you will take the pipeline to the next level. You will learn how to start your application inside the CI runner (including the Nodejs backend, the React frontend, and a temporary Meilisearch database). Once the app is running, you will execute Playwright End-to-End tests and use OWASP ZAP to dynamically attack your API, proving that your application is secure when it is fully alive.

- **[Module 5: Advanced testing & DAST](book/05_advanced_testing_dast.md)**

### What is next?

Congratulations! You have built a complete Continuous Integration pipeline. Every time you push code, GitHub Actions now starts your entire system to make sure your code is clean, works well, and is secure.

But right now, all of that checked code just sits in your repository. It is time to get it to your users.

In **Module 6: Continuous delivery**, you will connect GitHub to your live production server. You will learn how to safely save server keys using GitHub Secrets, package your final frontend files, and write a secure deployment script. Finally, you will set up automatic daily backups for your database and search engine so you can update your site with full confidence, knowing your data is always safe.