"""Kaggle-only, durable observations for the declared Orbit campaign.

The ledger contains public model outputs and observable tool calls, never private
reasoning. Corpus/references and worker credentials are supplied separately.
"""
from __future__ import annotations

import hashlib
import importlib.metadata
import inspect
import json
from pathlib import Path
import re
import threading
import time
import zipfile


def digest(value):
    encoded = value if isinstance(value, bytes) else json.dumps(value, sort_keys=True, ensure_ascii=False).encode()
    return hashlib.sha256(encoded).hexdigest()


def campaign_identity(config):
    operational={'resumeDatasetDir','resumeArchives','inputCorpusDir','inputReferenceDir',
                 'workerSecretName','quotaSnapshot','state','quotaChecked','modelsChecked',
                 'publicRelease','modelCallsExecuted','softwareTestsExecuted','pricingObservation'}
    return digest({key:value for key,value in config.items() if key not in operational})


def evaluation_frame(rows, configuration_sha, suite, model=None):
    """Give each SDK dataset row a stable identity across serial evaluations.

    SDK 0.6.1 uses the DataFrame index as Run.param_id. A fresh one-row frame
    with index zero otherwise reuses a prior completed Run_1 cache entry even
    when packet/mission parameters differ. No model request happens here.
    """
    import pandas as pd
    if not re.fullmatch(r'[0-9a-f]{64}', configuration_sha) or suite not in ('C','D','E'):
        raise RuntimeError('EVALUATION_CONFIGURATION_IDENTITY_REQUIRED')
    rows=list(rows)
    if not rows or any(not isinstance(row,dict) or '_id' in row for row in rows):
        raise RuntimeError('EVALUATION_PARAMETER_ROWS_INVALID')
    identifiers=[digest({'configuration':configuration_sha,'suite':suite,'model':model,'parameters':row})
                 for row in rows]
    if len(set(identifiers))!=len(identifiers):
        raise RuntimeError('DUPLICATE_EVALUATION_PARAMETER_IDENTITY')
    return pd.DataFrame(rows,index=identifiers)


def public_observation(value):
    if isinstance(value, dict):
        forbidden = {'token', 'controltoken', 'authorization', 'apikey', 'api_key', 'secret', 'credentials',
                     'reasoning_trace', 'reasoning_traces', 'chain_of_thought'}
        return {key: public_observation(item) for key, item in value.items()
                if str(key).lower() not in forbidden}
    if isinstance(value, (list, tuple)):
        return [public_observation(item) for item in value]
    if isinstance(value, str):
        return re.sub(r'(?i)(Bearer\s+\S+|(?:sk-|e2b_)[A-Za-z0-9_-]+|(?:token|key|secret)=\S+)',
                      '[REDACTED]', value)
    if value is None or isinstance(value, (int, float, bool)):
        return value
    return public_observation(str(value))


class QuotaBlocked(RuntimeError):
    pass


def failure_kind(error):
    message = str(error).lower()
    if any(term in message for term in ('quota', 'resource_exhausted', 'insufficient credit', 'budget exceeded')):
        return 'blocked-quota'
    # The observed provider 429 names model overload, not exhausted account
    # quota. Only that explicit response is retryable; an unknown 429 stays a
    # technical error. Quota markers above retain priority when both occur.
    if (re.search(r'(?<!\d)429(?!\d)', message)
            and re.search(r'\bmodel (?:is )?currently experiencing heavy load\b', message)):
        return 'transient-transport'
    if any(term in message for term in ('timeout', 'timed out', 'temporarily unavailable', 'connection reset', 'http 502', 'http 503')):
        return 'transient-transport'
    if any(term in message for term in ('tool invocation limit', 'max_tool_rounds')):
        return 'sdk-round-limit'
    return 'technical-error'


def safe_error(error):
    return {'errorType': type(error).__name__, 'failureKind': failure_kind(error),
            'message': public_observation(str(error))[-1800:]}


def require_configuration(config, suite):
    if not Path('/kaggle/working').is_dir():
        raise RuntimeError('KAGGLE_EXECUTION_REQUIRED')
    if not config.get('frozen'):
        raise RuntimeError('CAMPAIGN_MANIFEST_NOT_FROZEN')
    # SDK corrections have a separate, exact namespace so their checkpoints
    # cannot silently merge with the historical failed dispatch. Keep the
    # version allowlist explicit rather than accepting an arbitrary suffix.
    supported = {'orbit-kaggle-20261001-v2', 'orbit-kaggle-20261001-v2-sdkparams1',
                 'orbit-kaggle-20261001-v2-sdkparams2', 'orbit-kaggle-20261001-v2-nativebounds1',
                 'orbit-kaggle-20261003-final-e1', 'orbit-kaggle-20261003-final-d1'}
    if config.get('format') != 'orbit-kaggle-campaign-v2' or config.get('campaignId') not in supported:
        raise RuntimeError('CAMPAIGN_NAMESPACE_OR_VERSION_UNSUPPORTED')
    if suite not in ('C', 'D', 'E'):
        raise RuntimeError('CAMPAIGN_SUITE_UNSUPPORTED')
    if config.get('campaignId') in {'orbit-kaggle-20261001-v2-nativebounds1', 'orbit-kaggle-20261003-final-e1'} and suite != 'E':
        raise RuntimeError('E_NATIVE_BOUNDARY_SNAPSHOT_ONLY')
    if config.get('campaignId') == 'orbit-kaggle-20261003-final-d1':
        if suite != 'D':
            raise RuntimeError('D_CONTEXT_SNAPSHOT_ONLY')
        selected = config.get('contextCaseSelection')
        if (not isinstance(selected, list) or not 1 <= len(selected) <= 2
                or any(case not in ('provider', 'sanity') for case in selected)
                or len(set(selected)) != len(selected)
                or config.get('targets', {}).get('D', {}).get('trajectories') != 12 * len(selected)):
            raise RuntimeError('D_SELECTED_CONTEXT_TARGET_MISMATCH')
    if config.get('campaignId') == 'orbit-kaggle-20261003-final-e1':
        if (config.get('maxWorkers') != 8 or config.get('maxParallelTrajectories') != 8
                or config.get('maxHoldRequests') != 2 or config.get('maxTransientAttempts') != 2
                or config.get('targets', {}).get('E', {}).get('trajectories') != 144
                or not isinstance(config.get('modelDispatchAuthorized'), bool)):
            raise RuntimeError('E_FINAL_BUDGET_OR_AUTHORIZATION_MISMATCH')
    if config.get('executableSuites') and suite not in config['executableSuites']:
        raise RuntimeError('SUITE_NOT_ENABLED_IN_THIS_FROZEN_SNAPSHOT')
    observed = importlib.metadata.version('kaggle-benchmarks')
    if observed != config.get('sdkVersion'):
        raise RuntimeError('PINNED_KAGGLE_SDK_MISMATCH')
    if suite in ('D', 'E'):
        from kaggle_benchmarks.tools.native import native_tool_agent
        if 'max_tool_rounds' not in inspect.signature(native_tool_agent).parameters:
            raise RuntimeError('SDK_TOOL_ROUNDS_NOT_SUPPORTED')
    if config.get('maxNativeCalls') != 20 or config.get('maxDurationSeconds') != 480:
        raise RuntimeError('CAMPAIGN_BUDGET_MISMATCH')
    for name in ('corpusSha256', 'engineSourceSha256', 'harnessSha256', 'rulesSha256'):
        if not re.fullmatch(r'[0-9a-f]{64}', config.get(name, '')):
            raise RuntimeError('CAMPAIGN_FINGERPRINT_MISSING_' + name.upper())
    return observed


def load_verified_json(path, expected):
    data = Path(path).read_bytes()
    if digest(data) != expected:
        raise RuntimeError('INPUT_FINGERPRINT_MISMATCH')
    return json.loads(data)


def verify_scoped_views(public, original_access, input_directory):
    """Check retained spans against private originals before any model prompt."""
    directory=Path(input_directory).resolve()
    documents={row['id']:row for row in public['documents']}
    records=original_access['records']
    if len(records)!=48 or len({row['id'] for row in records})!=48:
        raise RuntimeError('REAL_ORIGINAL_IDENTITY_MISMATCH')
    for row in records:
        source_path=(directory/row['snapshotPath']).resolve()
        if not source_path.is_relative_to(directory): raise RuntimeError('UNSAFE_ORIGINAL_PATH')
        data=source_path.read_bytes()
        if len(data)>2*1024*1024 or digest(data)!=row['snapshotNormalizedTextSha256']:
            raise RuntimeError('PRIVATE_ORIGINAL_FINGERPRINT_MISMATCH')
        source=data.decode('utf-8')
        document=documents[row['id']]
        if document.get('originalSnapshotSha256')!=digest(data):
            raise RuntimeError('VIEW_ORIGINAL_IDENTITY_MISMATCH')
        if len(document['text'])>12000 or not document.get('excerptMap'):
            raise RuntimeError('SCOPED_VIEW_BOUND_OR_MAPPING_MISSING')
        previous_input=previous_original=0
        for span in document['excerptMap']:
            a,b=span['inputStartCharacter'],span['inputEndCharacter']
            c,d=span['originalStartCharacter'],span['originalEndCharacter']
            if not (previous_input<=a<b<=len(document['text']) and previous_original<=c<d<=len(source)):
                raise RuntimeError('SCOPED_VIEW_SPAN_INVALID')
            fragment=document['text'][a:b]
            if fragment!=source[c:d] or digest(fragment.encode())!=span['sha256']:
                raise RuntimeError('SCOPED_VIEW_CONTENT_MISMATCH')
            previous_input=b;previous_original=d
    return {'originalsVerified':len(records),'viewsVerified':len(records),'semanticReview':'not-established'}


class CampaignLedger:
    def __init__(self, config, suite):
        require_configuration(config, suite)
        if (config.get('campaignId') == 'orbit-kaggle-20261003-final-e1'
                and config.get('modelDispatchAuthorized') is not True):
            raise RuntimeError('E_FINAL_NATIVE_QUALIFICATION_REQUIRED_BEFORE_MODEL_DISPATCH')
        self.config = config
        self.suite = suite
        self.root = Path('/kaggle/working/orbit-campaign-v2') / suite
        self.root.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.dispatch_lock = threading.RLock()
        self.blocked = threading.Event()
        self.identity = campaign_identity(config)
        self.restore()

    def lot_allowed(self):
        windows=self.config.get('quotaSnapshot',[])
        reserve=self.config.get('maxLotReserveNanodollars')
        strategy=self.config.get('quotaPolicy',{}).get('unknownPricingStrategy')
        serial_provider_guard=strategy=='serial-provider-free-quota'
        parallel_provider_guard=(self.suite=='E' and strategy=='bounded-parallel-provider-free-quota'
            and isinstance(self.config.get('maxParallelTrajectories'),int)
            and not isinstance(self.config.get('maxParallelTrajectories'),bool)
            and 1<=self.config['maxParallelTrajectories']<=8)
        free_provider_guard=serial_provider_guard or parallel_provider_guard
        if not windows or (reserve is None and not free_provider_guard):
            raise QuotaBlocked('CURRENT_QUOTA_AND_EXPLICIT_DISPATCH_POLICY_REQUIRED')
        if reserve is not None and (not isinstance(reserve,int) or isinstance(reserve,bool) or reserve<=0):
            raise QuotaBlocked('INVALID_DECLARED_LOT_RESERVE')
        observed=[]; active=[]; versions={}
        for path in self.root.parent.rglob('*.json'):
            row=json.loads(path.read_text())
            if row.get('configurationSha256')!=self.identity: continue
            identity=(row.get('key'),row.get('attempt',0))
            if row.get('observedAtUnix',0)>=versions.get(identity,{}).get('observedAtUnix',0):
                versions[identity]=row
            if path.parent.parent==self.root.parent and row.get('state') in ('running','observing'):
                active.append(row.get('observedAtUnix',0))
        usage_seen=set()
        for row in versions.values():
            result=row.get('result') or {}
            phase=row.get('parameters',{}).get('phase')
            usages=([result['usage']] if row.get('suite')=='C' and phase in ('extraction','production') and 'usage' in result
                    else [result['usage']] if row.get('suite')=='D' and 'usage' in result
                    else [answer['usage'] for answer in result.get('answers',[]) if 'usage' in answer]
                    if row.get('suite')=='E' else [])
            for usage in usages:
                # Role checkpoints can be restored into a later attempt. Their
                # usage timestamp keeps the same paid observation from counting
                # twice, while historical failed attempts remain chargeable.
                usage_identity=(row.get('suite'),row.get('key'),usage.get('observedAtUnix'),digest(usage))
                if usage_identity in usage_seen: continue
                usage_seen.add(usage_identity)
                costs=[usage.get('input_tokens_cost_nanodollars'),usage.get('output_tokens_cost_nanodollars')]
                observed_at=usage.get('observedAtUnix',row.get('observedAtUnix',0))
                if any(value is None for value in costs):
                    if not free_provider_guard and any(observed_at>=window.get('observedAtUnix',0) for window in windows):
                        raise QuotaBlocked('OBSERVED_COST_UNAVAILABLE_REFRESH_QUOTA')
                    # Never turn unavailable cost into a reported zero. With
                    # explicit free-provider mode, dispatch is bounded by the
                    # fresh UI snapshot, batch size and real provider refusal.
                    continue
                observed.append((observed_at,sum(costs)))
        for window in windows:
            limit=window.get('limitNanodollars'); used=window.get('usedNanodollars'); reset=window.get('resetsAtUnix')
            captured=window.get('observedAtUnix')
            max_age=self.config.get('quotaPolicy',{}).get('maxSnapshotAgeSeconds')
            now=time.time()
            # A freshness horizon limits the life of this observation. It is
            # never advertised as a provider reset time. Unknown resets remain
            # null; a real API quota refusal still stops the whole campaign.
            if (not isinstance(limit,int) or isinstance(limit,bool) or limit<=0
                    or not isinstance(used,int) or isinstance(used,bool) or used<0
                    or not isinstance(captured,(int,float)) or captured>now
                    or not isinstance(max_age,int) or not 60<=max_age<=3600
                    or now-captured>max_age
                    or (reset is not None and (not isinstance(reset,(int,float)) or now>=reset))):
                raise QuotaBlocked('QUOTA_SNAPSHOT_INVALID_OR_EXPIRED')
            spent=sum(cost for observed_at,cost in observed if observed_at>=captured)
            reservation=reserve if reserve is not None else 0
            reserved=sum(reservation for observed_at in active if observed_at>=captured)
            if (used+spent)/limit>=0.85 or (used+spent+reserved+reservation)/limit>=0.89:
                raise QuotaBlocked('NO_NEW_LOT_AT_DECLARED_QUOTA_THRESHOLD')
        return True

    def restore(self):
        source=self.config.get('resumeDatasetDir')
        if not source:
            return
        directory=Path(source).resolve()
        if not directory.is_relative_to(Path('/kaggle/input').resolve()):
            raise RuntimeError('RESUME_INPUT_MUST_BE_KAGGLE_DATASET')
        archives=self.config.get('resumeArchives',{})
        if not archives:
            raise RuntimeError('RESUME_ARCHIVE_DIGESTS_REQUIRED')
        size=0
        for name,expected in archives.items():
            path=(directory/name).resolve()
            if not path.is_relative_to(directory): raise RuntimeError('UNSAFE_RESUME_ARCHIVE_PATH')
            data=path.read_bytes()
            if digest(data)!=expected: raise RuntimeError('RESUME_ARCHIVE_DIGEST_MISMATCH')
            with zipfile.ZipFile(path) as archive:
                for member in archive.infolist():
                    if not member.filename.endswith('.json') or 'attempts/' in member.filename:
                        continue
                    size+=member.file_size
                    if member.file_size>2*1024*1024 or size>128*1024*1024:
                        raise RuntimeError('RESUME_SIZE_BOUND_EXCEEDED')
                    row=json.loads(archive.read(member))
                    if row.get('suite')!=self.suite or row.get('configurationSha256')!=self.identity:
                        continue
                    parameters=row.get('parameters')
                    if not isinstance(parameters,dict) or row.get('key')!=self.key(parameters):
                        raise RuntimeError('RESUME_RECORD_IDENTITY_MISMATCH')
                    target=self.path(parameters)
                    if not target.exists():
                        target.write_text(json.dumps(public_observation(row),ensure_ascii=False,indent=2),encoding='utf-8')

    def key(self, parameters):
        return digest({'campaign': self.identity, 'suite': self.suite, 'parameters': parameters})

    def path(self, parameters):
        return self.root / (self.key(parameters) + '.json')

    def read(self, parameters):
        with self.lock:
            path = self.path(parameters)
            return json.loads(path.read_text()) if path.exists() else None

    def completed(self, parameters):
        row = self.read(parameters)
        return row if row and row['state'] == 'completed' else None

    def write(self, parameters, state, result=None, error=None):
        with self.lock:
            path = self.path(parameters)
            previous = self.read(parameters)
            if error is not None and result is None and previous:
                result = previous.get('result')
            attempt = previous.get('attempt', 0) if previous else 0
            if state == 'running':
                if previous and previous['state'] in ('running','observing'):
                    history=self.root/'attempts'; history.mkdir(exist_ok=True)
                    interrupted={**previous,'state':'interrupted','interruptionRecordedAtUnix':time.time()}
                    archived=history/(self.key(parameters)+'-'+str(attempt)+'-interrupted-'+str(time.time_ns())+'.json')
                    archived.write_text(json.dumps(public_observation(interrupted),ensure_ascii=False,indent=2),encoding='utf-8')
                attempt += 1
            row = {'key': self.key(parameters), 'campaignId': self.config['campaignId'],
                   'configurationSha256': self.identity, 'suite': self.suite,
                   'parameters': parameters, 'attempt': attempt, 'state': state,
                   'observedAtUnix': time.time(), 'result': result, 'error': error}
            temporary = path.with_suffix('.tmp')
            temporary.write_text(json.dumps(public_observation(row), ensure_ascii=False, indent=2), encoding='utf-8')
            temporary.replace(path)
            if state not in ('running', 'observing'):
                history = self.root / 'attempts'
                history.mkdir(exist_ok=True)
                archived = history / (self.key(parameters) + '-' + str(attempt) + '-' + str(time.time_ns()) + '.json')
                archived.write_bytes(path.read_bytes())
            return row

    def call(self, parameters, callback):
        # C generations and D trajectories can be scheduled concurrently by
        # the SDK. This lock preserves the declared single-dispatch policy.
        with self.dispatch_lock:
            return self._call_serial(parameters, callback)

    def _call_serial(self, parameters, callback):
        existing = self.completed(parameters)
        if existing:
            return existing['result']
        if self.blocked.is_set():
            self.write(parameters, 'blocked-quota', error={'failureKind': 'blocked-quota'})
            raise QuotaBlocked('CAMPAIGN_QUOTA_BLOCKED')
        previous = self.read(parameters)
        if previous and previous['state'] in ('invalid-output', 'sdk-round-limit'):
            raise RuntimeError('TERMINAL_OBSERVATION_RETAINED')
        if previous and previous['state'] in ('technical-error', 'transient-transport') and previous.get('attempt', 0) >= 2:
            raise RuntimeError('TRANSPORT_ATTEMPTS_EXHAUSTED')
        if previous and previous['state'] in ('running','observing') and previous.get('attempt',0)>=2:
            raise RuntimeError('INTERRUPTED_ATTEMPTS_EXHAUSTED')
        if previous and previous['state'] == 'technical-error':
            raise RuntimeError('TECHNICAL_FIX_REQUIRES_NEW_HARNESS_VERSION')
        self.begin(parameters)
        try:
            result = callback()
            self.write(parameters, 'completed', result=result)
            return result
        except Exception as error:
            state = failure_kind(error)
            self.write(parameters, state, error=safe_error(error))
            if state == 'blocked-quota':
                self.blocked.set()
                raise QuotaBlocked('CAMPAIGN_QUOTA_BLOCKED') from None
            raise

    def begin(self, parameters):
        """Reserve a conservative lot before dispatch; serialize in-process claims."""
        with self.lock:
            try:
                self.lot_allowed()
            except QuotaBlocked as error:
                self.blocked.set()
                self.write(parameters,'blocked-quota',error=safe_error(error))
                raise
            self.write(parameters,'running')

    def rows(self):
        """Only observations belonging to this immutable campaign identity."""
        return [row for path in self.root.glob('*.json')
                if (row:=json.loads(path.read_text())).get('configurationSha256')==self.identity]

    def accounting(self):
        rows = self.rows()
        counts = {}
        for row in rows:
            counts[row['state']] = counts.get(row['state'], 0) + 1
        historical={}
        for path in self.root.glob('*.json'):
            row=json.loads(path.read_text())
            if row.get('configurationSha256')!=self.identity:
                historical[row['state']]=historical.get(row['state'],0)+1
        return {'campaignId': self.config['campaignId'], 'suite': self.suite,
                'configurationSha256': self.identity, 'states': counts,
                'historicalStatesNotPooled':historical,
                'pricingObserved':self.config.get('pricingObservation') is not None,
                'lotReserveNanodollars':self.config.get('maxLotReserveNanodollars'),
                'unknownPricingStrategy':self.config.get('quotaPolicy',{}).get('unknownPricingStrategy'),
                'reasoningTracesExported': False}

    def archive(self):
        target = self.root.parent / ('000-orbit-' + self.suite.lower() + '-v2-observations.zip')
        with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(self.root.rglob('*.json')):
                archive.write(path, path.relative_to(self.root).as_posix())
        return target


def observed_usage(chat):
    usage = getattr(chat, 'usage', None)
    fields = ('input_tokens', 'output_tokens', 'input_tokens_cost_nanodollars',
              'output_tokens_cost_nanodollars', 'total_backend_latency_ms')
    return {'observedAtUnix':time.time(),**{name:usage.get(name) if isinstance(usage,dict)
        else getattr(usage,name,None) for name in fields}}


def context_digest(result):
    """Compare corpus content, without a changing network retrieval timestamp."""
    return digest({name: result.get(name) for name in ('state', 'knowledgeBase', 'source', 'content')})
