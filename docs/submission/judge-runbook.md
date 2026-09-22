# Clean-machine judge runbook — draft

Do not publish until every VERIFY marker is resolved.

## Requirements

- Node version from the committed version file
- Current Chrome and a supported desktop OS
- Sanity project ID or public dataset URL
- Optional provider account for live agent use

No personal credentials are included.

## Install

    git clone [VERIFY_REPOSITORY_URL]
    cd dev.to-challenge
    npm ci
    npm test
    npm run build

Load the unpacked extension from the documented build directory and start the local service with the verified root command.

## Five-minute path

1. Open a provided NASA source.
2. Open Orbit Companion in the side panel.
3. Ask for the simplified circular speed at 400 km.
4. Review the plan.
5. Run the bounded mission.
6. Inspect direct sources and counters.
7. Write a prediction and run the orbital laboratory.
8. Pause and inspect the numerical fallback.
9. Reload and verify mission restoration.
10. If both providers are available, switch provider and verify the same CCP mission resumes.

If live provider, Sanity or WebMCP access is unavailable, use a clearly labeled deterministic fixture. Never describe fixture replay as a live call.
