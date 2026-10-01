# Google Search grounding on Google Cloud: retention and ZDR conditions

Author: Google Cloud. Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention?hl=en
Retrieved: 2026-09-27T19:11:06.538Z
Representation: verbatim customer-data-retention section; HTML formatting converted to Markdown. This is primary-source documentation, not an Orbit instruction or an independent experiment. Other sections of the original page are not reproduced. Google Cloud documentation content is licensed under CC BY 4.0 except as noted: https://creativecommons.org/licenses/by/4.0/

## Customer data retention and achieving zero data retention

Customer data is retained in Gemini Enterprise Agent Platform for Models as a Service (MaaS) for limited
periods of time in the following scenarios and conditions. To achieve zero data
retention, customers must take specific actions within each of these areas:

- 
**Prompt logging for abuse monitoring for Google models**: As outlined in
Section 4.3 "Generative AI Safety and Abuse" of [Google Cloud Platform Terms of Service](https://cloud.google.com/terms), Google may log prompts to
detect potential abuse and violations of its [Acceptable Use Policy](https://cloud.google.com/terms/aup) and [Prohibited Use Policy](https://policies.google.com/terms/generative-ai/use-policy) as part
of providing generative AI services to customers. Only customers whose use
of Google Cloud is governed by the [Google Cloud Platform Terms of Service](https://cloud.google.com/terms) are subject to prompt logging for
abuse monitoring. If you are in scope for prompt logging for abuse
monitoring and want zero data retention, you can request an exception for
abuse monitoring. See [Abuse monitoring](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/abuse-monitoring).

- 
**Prompt and response logging for abuse monitoring for Advanced AI models**:
Certain models or features may also be subject to additional prompt and
response logging to prevent abuse, as described in the [Advanced AI Safety Addendum](http://cloud.google.com/terms/advanced-ai-safety-addendum). Zero
data retention may not be possible when using some Advanced AI features.
Please contact your account team for clarification. See [Abuse monitoring](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/abuse-monitoring) for more information.

- 
**Grounding with Google Search**: As outlined in Section
20 "Generative AI Services: Grounding with Google Search" of the
[Service Specific Terms](https://cloud.google.com/terms/service-terms),
Google collects and stores logs, which contains the following Customer Data:
queries derived from End User prompts and contextual information that
Customer may provide along with the prompts that are not associated with any
Customer or its End Users for up to three (3) days, this stored information
may be used for debugging of systems that support Grounding with
Google Search. There is no way to disable the storage of this
information if you use Grounding with Google Search. If you require
zero data retention, we recommend using [Web Grounding for Enterprise](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/grounding/web-grounding-enterprise).

- 
**Grounding with Google Maps**: As outlined in Section
20 "Generative AI Services: Grounding with Google Maps" of the [Service Specific Terms](https://cloud.google.com/terms/service-terms), Google stores
prompts and contextual information that customers may provide, and generated
output for thirty (30) days for the purposes of creating grounded results,
and this stored information may only be used for reliability engineering,
such as debugging in case of service issues, of systems that support
grounding with Google Maps. There is no way to disable the storage of this
information if you use Grounding with Google Maps.

- 
**Request-response logging**: This feature is disabled by default. It can be
enabled using a configuration setting on a per-model, per-project basis.
Enabling this logging causes certain requests and responses to the specified
model to be written to a designated BigQuery table. To achieve zero
data retention, do not enable this feature. For more information about this
feature, including how to enable or disable it, or read the current
configuration setting, see [Log requests and responses](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/request-response-logging).

- 
**Interactions API**: When using the [Interactions API](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/interactions-api)
with `store = true`, Google stores user data (such as prompts, responses,
and conversation state) to enable multi-turn conversations and later
retrieval. If you do not specify a value for `store`, it defaults to
`true` for all models. To achieve zero data retention, explicitly set
`store = false` in your API requests.

This applies to all managed models on Gemini Enterprise Agent Platform, including GA and
pre-GA models.
