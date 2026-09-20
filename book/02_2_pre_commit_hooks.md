#### Install Husky and lint-staged at the root

Navigate to the root directory where your .git folder lives and install the tools as dev dependencies:
```bash
npm install -D husky lint-staged
```

#### Initialize Husky
Run the initialization script to set up git hooks:
```bash
npx husky init
```
This creates a .husky/ directory and adds a "prepare": "husky" script to your root package.json.


Add a lint-staged configuration block to your root package.json. Scope the matching patterns to each sub-directory so they use their local configs:

* Option 1 : Block commit if any lint or formatting issue
```
  "lint-staged": {
    "frontend/**/*.{js,jsx,ts,tsx}": [
      "npm --prefix frontend run lint",
      "npm --prefix frontend run format:check"
    ],
    "backend/**/*.{js,ts}": [
      "npm --prefix backend run lint",
      "npm --prefix backend run format:check"
    ]
  },
```
* Option 2 : fix both automatic before commit, so it will automatic fix and formatted when we run commit command
```
  "lint-staged": {
    "frontend/**/*.{js,jsx,ts,tsx}": [
      "npm --prefix frontend run lint -- --fix",
      "npm --prefix frontend run format"
    ],
    "backend/**/*.{js,ts}": [
      "npm --prefix backend run lint -- --fix",
      "npm --prefix backend run format"
    ]
  },
```
* Option 3 : Mix settings block one and auto fix one, like block for lint but auto format when commit, so if no lint issue and only format issue then commit done

```
  "lint-staged": {
    "frontend/**/*.{js,jsx,ts,tsx}": [
      "npm --prefix frontend run lint",
      "npm --prefix frontend run format"
    ],
    "backend/**/*.{js,ts}": [
      "npm --prefix backend run lint",
      "npm --prefix backend run format"
    ]
  },
```

We will use Option 1 so user should know all lint issues and formatting issues, and fix themself.

#### Configure the pre-commit hook file
Open the generated .husky/pre-commit file and replace its contents with:
```
npx lint-staged
```