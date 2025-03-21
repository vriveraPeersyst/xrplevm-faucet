# Gitflow Workflow

We follow the Gitflow branching model to streamline development and releases.

## Branch Structure

- **main:**  
  Production-ready code. Only release and hotfix branches are merged here.

- **develop:**  
  Integration branch where completed features and fixes are merged.

- **feature/<feature-name>:**  
  Branches for new features, created from **develop**:
  ```bash
  git flow feature start <feature-name>
  ```
  When complete, merge back into **develop**:
  ```bash
  git flow feature finish <feature-name>
  ```

- **release/<version>:**  
  Branches for preparing production releases. Created from **develop**:
  ```bash
  git flow release start 1.0.0
  ```
  After final tweaks and version updates, merge into both **main** and **develop**:
  ```bash
  git flow release finish 1.0.0
  ```

- **hotfix/<description>:**  
  For urgent production fixes. Branch off **main**:
  ```bash
  git flow hotfix start <description>
  ```
  After the fix, merge into both **main** and **develop**:
  ```bash
  git flow hotfix finish <description>
  ```

## Initialization

Initialize Gitflow in your repository:
```bash
git flow init
```
Follow the prompts (the defaults are typically fine).

This process ensures stable releases and smooth integration of new features and fixes.