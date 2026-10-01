# Exercise — one source, one concept, one GROQ query

Status: prepared offline, not completed against the remote dataset.

## Goal

Create or inspect one structured source and retrieve only the fields needed for an orbital explanation.

## Safety boundary

- Never write credentials into repository files.
- Do not publish or deploy remote content when Sanity authentication is absent.
- A prepared query is not a live Sanity result.

## Exercise

1. Read the local source and concept schemas.
2. Identify title, URL, authority, accessed date, claim, units and qualifier.
3. In an authenticated development context, create a draft source for NASA-EARTH.
4. Keep it as a draft until attribution and values are reviewed.
5. In Vision, run:

    *[_type == "source" && _id == "orbit-source-nasa-earth"][0]{
      _id, title, url, publisher, observedAt, notes,
      "claims": *[_type == "claim" && references(^._id)]{
        statement, status, value, unit, qualifier
      }
    }


6. Confirm the result preserves units and the radius qualifier.
7. Explain why 6371 km and 6378.137 km can both be correct.
8. Record query, perspective, dataset, result shape and uncertainty.

## Offline alternative

Use fixtures/corpus/nasa-earth-parameters.v1.md and mark the receipt prepared_offline. Never mark it queried_from_sanity.

## Pass

The source, derived claim, unit and qualifier remain distinguishable; no secret is stored; the receipt states whether the result was offline, draft or published.
