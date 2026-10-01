# Corpus terminology and provenance cross-reference

Orbit research note, 2026-09-27. This derivative reference connects names to the evidence already imported in this knowledge base. It is not an independent primary source. References to Orbit's numbered notes summarize those bounded notes, not newly completed full-paper readings. Institutions and authors identify provenance, not software capabilities.

## Search and extraction

- **Exa Contents** retrieves page content from supplied URLs or document IDs; outputs include extracted highlights, page text and generated summaries. Source document `016bbda1-e308-4884-8da5-35324e1e6115`: https://exa.ai/docs/contents/quickstart
- Firecrawl's **/scrape endpoint** extracts content from one URL, including Markdown or HTML. Processing success and target-page HTTP status remain separate checks. Source document `7b280f1d-62e1-851a-a42c-4b7f507b6f89`: https://docs.firecrawl.dev/features/scrape
- **arxiv.org/html/2408.09869v5** is the versioned Docling Technical Report summarized by Orbit's R01 note. The report covers PDF layout, reading order, tables, optional OCR and document assembly. It is historical research, not current API documentation. Source document `a0715d30-43be-401d-a7e6-a9b71605de3e`: https://arxiv.org/html/2408.09869v5

## Research methodology and attribution

- The **PRISMA statement** is the broader reporting framework extended by PRISMA-S for search reporting. Orbit's S02 note describes a sixteen-item checklist and distinguishes complete reporting from complete retrieval. Source document `b3c9259d-10b9-435a-8787-9bd96b7f1713`: https://jmla.mlanet.org/ojs/jmla/article/view/962
- **Cochrane Handbook Chapter 13** addresses bias due to missing evidence in meta-analysis. Orbit's E02 note distinguishes unpublished studies or results from an empty search response. Source document `bffbba52-a616-45ad-a1f9-ebdd974c1c04`: https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-13
- The **FAIR Guiding Principles** concern findability, accessibility, interoperability and reuse of data and metadata. Orbit's E04 note distinguishes these properties from unrestricted access, factual truth and reuse permission. **Nature** is the publication website in this reference. Source document `84195d4f-7be5-4689-b509-bcd7271e027e`: https://www.nature.com/articles/sdata201618
- The **TARCiS Statement** describes terminology and guidance for applying and reporting citation searching. Orbit's S05 note covers backward, forward and iterative searches, seed references, deduplication and index coverage. The **University of Basel** library is the institutional host of this guidance. Source document `0380d0c9-5edb-4e8c-a1fc-df46a8d66d23`: https://ub.unibas.ch/en/university-medical-library/tarcis/
- **Marcia J. Bates** authored the 1989 berrypicking article summarized by Orbit's S04 note. Evolving queries and incremental discoveries are its conceptual contribution; it is not a validated automatic stopping rule. Source document `78fcbf2d-9f33-4622-af79-026927d43ca7`: https://pages.gseis.ucla.edu/faculty/bates/berrypicking.html
- **University of Washington** is an author affiliation in Orbit's QASPER and SciFact notes. QASPER concerns evidence-grounded research-paper questions; SciFact concerns support/refutation of claims against abstracts. The affiliation is provenance rather than a benchmark capability. Source documents `4062c901-663d-4629-b8e9-48eef157e761` and `e50b6ffe-0037-445e-bec5-c102c8a22d5b`: https://aclanthology.org/2021.naacl-main.365/ and https://aclanthology.org/2020.emnlp-main.609/

## Authoring and security

- **Sanity Studio** is the content-authoring application in the Astro quickstart. Schema definition and deployment supply the structured content/schema used by Context's GROQ mode. Source documents `f4349976-71da-4296-b35d-6ca76f14668f` and `ebfeb39b-5a13-461b-9b64-4581af116fdf`: https://www.sanity.io/docs/astro-quickstart/setting-up-your-studio and https://www.sanity.io/docs/ai/sanity-context
- **LangChain** appears in OWASP's framework-specific security examples. Input screening and sanitization in an example are individual controls, not proof of resistance to all prompt injection. Source document `95107813-abc3-8783-b983-a7f1b89e16cf`: https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html#langchain
- **Claude for Chrome** is the browser extension discussed in Anthropic's prompt-injection report. Training, classifiers and adversarial evaluations are described together with remaining risk. Source document `7cfb4431-0160-44d3-aa12-c0b366fec57e`: https://www.anthropic.com/research/prompt-injection-defenses
