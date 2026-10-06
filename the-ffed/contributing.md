# Contributing to FfeD Quantum

Thank you for considering contributing to the FfeD Quantum project! We welcome contributions from the community and are grateful for your support.

## Table of Contents

1. [Code of Conduct](contributing.md#code-of-conduct)
2. [How to Contribute](contributing.md#how-to-contribute)
3. [Development Environment Setup](contributing.md#development-environment-setup)
4. [Submitting Changes](contributing.md#submitting-changes)
5. [Code Style](contributing.md#code-style)
6. [Testing](contributing.md#testing)
7. [Documentation](contributing.md#documentation)
8. [Issue Reporting](contributing.md#issue-reporting)
9. [Pull Request Process](contributing.md#pull-request-process)
10. [License](contributing.md#license)

## Code of Conduct

Please read and follow our [Code of Conduct](https://github.com/Celebrum/FfeD-Quantum/blob/main/CODE_OF_CONDUCT.md) to ensure a welcoming and respectful environment for all contributors.

## How to Contribute

There are several ways you can contribute to the FfeD Quantum project:

* **Report Bugs**: If you find a bug, please report it by creating an issue on GitHub.
* **Suggest Features**: If you have an idea for a new feature, please suggest it by creating an issue on GitHub.
* **Write Code**: If you want to contribute code, please follow the guidelines below.
* **Improve Documentation**: If you find any errors or omissions in the documentation, please submit a pull request with your improvements.

## Development Environment Setup

To set up your development environment, follow these steps:

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/Celebrum/FfeD-Quantum.git
    cd FfeD-Quantum
    ```
2.  **Set up the Conda environment**:

    ```bash
    conda env create -f environment.yml
    conda activate SeCuReDmE_env
    ```
3.  **Install additional dependencies**:

    ```bash
    pip install -r requirements.txt
    pip install -r requirements-dev.txt
    ```
4. **Set up Docker**:
   *   Build the Docker image:

       ```bash
       docker build -t ffed-quantum .
       ```
   *   Run the Docker container:

       ```bash
       docker run -p 8000:8000 ffed-quantum
       ```
5. **Set up `git-secret`**:
   * Install `git-secret`:
     *   **Windows**:

         ```powershell
         scoop install git-secret
         ```
     *   **macOS**:

         ```bash
         brew install git-secret
         ```
     *   **Linux**:

         ```bash
         sudo apt-get install git-secret
         ```
   *   Initialize `git-secret`:

       ```bash
       git secret init
       ```
   *   Add authorized users:

       ```bash
       git secret tell user@example.com
       ```
   *   Add secret files:

       ```bash
       git secret add path/to/your/secret_file
       ```
   *   Encrypt secrets:

       ```bash
       git secret hide
       ```

## Submitting Changes

1. **Fork the repository**: Click the "Fork" button at the top right corner of the repository page on GitHub.
2.  **Create a new branch**: Create a new branch for your changes.

    ```bash
    git checkout -b my-feature-branch
    ```
3. **Make your changes**: Make your changes to the codebase.
4.  **Commit your changes**: Commit your changes with a descriptive commit message.

    ```bash
    git commit -m "Add new feature"
    ```
5.  **Push your changes**: Push your changes to your forked repository.

    ```bash
    git push origin my-feature-branch
    ```
6. **Create a pull request**: Create a pull request from your forked repository to the main repository.

## Code Style

Please follow the code style guidelines below:

* **PEP 8**: Follow the PEP 8 style guide for Python code.
* **Black**: Use the Black code formatter to format your code.
* **Docstrings**: Use docstrings to document your code.

## Testing

Please ensure that your changes are thoroughly tested. Follow these steps to run the tests:

1.  **Set up the testing environment**:

    ```bash
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    pip install -r requirements-dev.txt
    ```
2.  **Run the tests**:

    ```bash
    pytest
    ```

## Documentation

Please ensure that your changes are well-documented. Update the `README.md` file and any other relevant documentation files as needed.

## Issue Reporting

If you find a bug or have a feature request, please create an issue on GitHub. Provide as much detail as possible to help us understand and address the issue.

## Pull Request Process

1. **Ensure your changes are thoroughly tested**: Run the tests and ensure that all tests pass.
2. **Ensure your changes are well-documented**: Update the `README.md` file and any other relevant documentation files as needed.
3. **Create a pull request**: Create a pull request from your forked repository to the main repository. Provide a descriptive title and description for your pull request.
4. **Address feedback**: Be responsive to feedback and make any necessary changes to your pull request.

## License

By contributing to the FfeD Quantum project, you agree that your contributions will be licensed under the MIT License.
