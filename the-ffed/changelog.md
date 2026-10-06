# Changelog

All notable changes to this project will be documented in this file.

## \[Unreleased]

### Added

* Initial setup of the repository with the following components:
  * `src` directory containing all source code files.
  * `README.md` file providing an overview and instructions for the project.
  * `Dockerfile` and `docker-compose.yml` for containerization.
  * `pyproject.toml` file to manage dependencies and project configuration.
  * `requirements.txt` and `requirements-dev.txt` for listing dependencies.
  * `.gitignore` file to exclude unnecessary files from version control.
  * `setup.py` file for packaging the module.
  * `tests` directory with unit tests.
  * `.github/dependabot.yml` file for GitHub-specific configurations, such as Dependabot.
  * `.devcontainer/devcontainer.json` file for development container configuration.
  * `.github/workflows/ci.yml` file to define the CI/CD pipeline.
  * `ffed/secure_config.py` file to handle secrets securely using `git-secret`.

### Changed

* Optimized the `Dockerfile` by using a minimal base image, combining `RUN` commands, and leveraging Docker's build cache.
* Fully configured the `pyproject.toml` file with all necessary dependencies and project metadata.
* Updated the `README.md` file to include detailed documentation covering all aspects of the project, including setup, usage, and contribution guidelines.
* Updated the `README.md` file to include instructions for setting up `git-secret` to manage sensitive information securely.
* Updated the `README.md` file to include instructions for setting up and using GitHub Actions for CI/CD.

### Fixed

* Added unit tests for the new features and configurations in `tests/test_core.py`.
* Added unit tests for handling secrets with `git-secret` in `tests/test_core.py`.

## \[0.1.0] - 2024-11-11

### Added

* Initial release of the FfeD Quantum project.
