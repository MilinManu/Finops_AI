"""Evidence-first project classification with optional local Ollama fallback."""

import json

import re

import unicodedata

import urllib.error

import urllib.request



OLLAMA_URL = "http://localhost:11434/api/chat"

OLLAMA_MODEL = "qwen2.5:3b"



APPLICATION_TYPES = {

    "E-Commerce", "Blog", "CRM", "Banking", "ERP", "Healthcare",

    "News Portal", "Portfolio", "Social Media", "Streaming",

}





def _normalize(value):

    value = unicodedata.normalize("NFKD", str(value or ""))

    value = "".join(ch for ch in value if not unicodedata.combining(ch))

    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()





def _project_evidence_text(project_facts):

    chunks = []
    # Repository identity is useful evidence (e.g. SuiteCRM), but never enough by itself.
    for key in ("project_root_name", "repository_name", "project_name"):
        value = project_facts.get(key)
        if value:
            chunks.append(str(value))

    for page in project_facts.get("html_content_signals") or []:

        if isinstance(page, dict):

            for key in ("title", "description", "headings", "text_excerpt"):

                value = page.get(key)

                if isinstance(value, list):

                    chunks.extend(str(v) for v in value)

                elif value:

                    chunks.append(str(value))



    for item in project_facts.get("project_text_signals") or []:

        if isinstance(item, dict):

            # File paths help identify models/views/routes, while text is bounded

            # by the static analyzer before it gets here.

            chunks.extend([str(item.get("file", "")), str(item.get("text_excerpt", ""))])



    for item in project_facts.get("evidence") or []:

        if isinstance(item, dict):

            chunks.extend([str(item.get("file", "")), str(item.get("fact", ""))])

        elif isinstance(item, str):

            chunks.append(item)



    for route in project_facts.get("api_endpoints") or []:

        if isinstance(route, dict):

            chunks.extend(str(route.get(key, "")) for key in ("path", "function", "method"))



    chunks.extend(str(x) for x in project_facts.get("frameworks") or [])

    chunks.extend(str(x) for x in project_facts.get("files_sample") or [])

    return _normalize(" ".join(chunks))





# Each signal group contributes at most once. This avoids counting repeated

# words as separate proof and reduces false positives from generic terms.

APP_SIGNAL_GROUPS = {

    "Social Media": [

        (4, [r"\bsocial media\b", r"\bsocial network\b", r"\bsocial networking\b",

             r"\bfollow\b", r"\bfollowers\b", r"\bfollowing\b", r"\bunfollow\b",

             r"\bfollowercount\b", r"\bfollow relationship\b"]),

        (4, [r"\bnews feed\b", r"\bhome feed\b", r"\buser feed\b", r"\bfeed\b.{0,30}\bposts?\b",

             r"\bposts?\b.{0,30}\bfeed\b"]),

        (3, [r"\blike post\b", r"\blike and comment\b", r"\bpost likes?\b",

             r"\bcomment on posts?\b"]),

        (3, [r"\buser suggestions?\b", r"\bsearch users?\b", r"\bother profiles?\b",

             r"\buser profile\b", r"\bprofile page\b"]),

        (2, [r"\bdirect messages?\b", r"\bprivate messages?\b", r"\bfriend requests?\b"]),

    ],

    "Blog": [

        (4, [r"\bblog\b", r"\bblog posts?\b", r"\bpersonal blog\b", r"\bcontent publishing platform\b",

             r"\bghost\b", r"\bwordpress\b", r"\bjekyll\b", r"\bhugo\b"]),

        (3, [r"\bpublish(?:ing|ed)? articles?\b", r"\barticle editor\b", r"\bauthor biography\b",

             r"\barticles?\b", r"\bposts?\b", r"\bauthors?\b"]),

        (2, [r"\barticle categories\b", r"\bpost tags\b", r"\bmarkdown editor\b", r"\bcomments?\b"]),

    ],

    "E-Commerce": [

        (4, [r"\be[ -]?commerce\b", r"\bonline store\b", r"\bonline shop\b", r"\bshopping cart\b",

             r"\badd to cart\b", r"\bcheckout\b", r"\bshopping basket\b", r"\bbaskets?\b",

             r"\bshops?\b", r"\bstorefront\b"]),

        (4, [r"\bpayment gateway\b", r"\bprocess payment\b", r"\bpayment intent\b",

             r"\bpayments?\b", r"\bpricing\b"]),

        (3, [r"\bproduct catalog(?:ue)?\b", r"\binventory management\b", r"\border history\b",

             r"\bproducts?\b", r"\borders?\b", r"\border creator\b"]),

    ],

    "Healthcare": [

        (4, [r"\bhealthcare\b", r"\bhealth care\b", r"\bmedical\b", r"\bpatient records?\b",

             r"\bpatient portal\b", r"\bmedical clinic\b", r"\bhospital\b", r"\bmedical website\b",

             r"\bclinic website\b", r"\behr\b", r"\bemr\b"]),

        (3, [r"\bdoctor appointments?\b", r"\bappointment booking\b", r"\bmedical appointments?\b",

             r"\bprescriptions?\b", r"\bdiagnos(?:is|es)\b", r"\bdoctors?\b", r"\bpatients?\b"]),

        (2, [r"\bgynecology\b", r"\bgynaecology\b", r"\bgynakologie\b", r"\bgeburtshilfe\b",

             r"\bpap test\b", r"\bhpv diagnostics\b", r"\bsprechstunde\b", r"\barztpraxis\b"]),

    ],

    "Banking": [

        (4, [r"\bbanking\b", r"\bfintech\b", r"\bbank accounts?\b", r"\baccount balances?\b",

             r"\bbank transfers?\b", r"\bdigital banking\b", r"\bonline banking\b", r"\bmobile banking\b"]),

        (3, [r"\bloan applications?\b", r"\btransaction history\b", r"\bfinancial transactions?\b",

             r"\bfinancial services?\b", r"\bpayment methods?\b", r"\bpayment method\b",

             r"\bpayment platform\b", r"\bmake payments?\b", r"\baccept card payments?\b"]),

        (3, [r"\bcredit cards?\b", r"\bcredit card deals?\b", r"\bannual percentage rates?\b",

             r"\binterest rates?\b", r"\baccount statements?\b", r"\bbalance transfers?\b",

             r"\bbilling and invoicing\b", r"\bbilling \& invoicing\b"]),

        (2, [r"\bpayment security\b", r"\bsecure payments?\b", r"\btransactions?\b",

             r"\bpayment processing\b", r"\bfinancial life\b"]),

    ],

    "CRM": [

        (4, [r"\bcustomer relationship management\b", r"\bcrm\b", r"\bcustomer relationship platform\b"]),

        (3, [r"\blead management\b", r"\bmanage leads?\b", r"\bsales pipeline\b",

             r"\bdeal stages?\b", r"\bsales teams?\b", r"\bleads?\b"]),

        (2, [r"\bcustomer records?\b", r"\bcontact management\b", r"\bcontacts?\b",

             r"\bopportunities\b", r"\bdeals?\b", r"\bcustomers?\b", r"\btickets?\b"]),

    ],

    "ERP": [

        (4, [r"\benterprise resource planning\b", r"\berp system\b", r"\berp\b", r"\bsap\b"]),

        (3, [r"\bprocurement\b", r"\bpurchase orders?\b", r"\bwarehouse management\b",

             r"\binventory\b", r"\binvoices?\b", r"\baccounting\b"]),

        (2, [r"\baccounts payable\b", r"\baccounts receivable\b", r"\bsupply chain\b",

             r"\bgeneral ledger\b", r"\bpayroll\b", r"\bhuman resources\b"]),

    ],

    "News Portal": [

        (4, [r"\bnews portal\b", r"\bnews website\b", r"\bnewsroom\b", r"\bbreaking news\b",

             r"\bnewspaper\b", r"\bjournalism\b"]),

        (3, [r"\bnews articles?\b", r"\bjournalists?\b", r"\bheadlines?\b", r"\bpress release\b",

             r"\breporters?\b"]),

        (2, [r"\bworld news\b", r"\blatest news\b", r"\beditorial desk\b", r"\beditorial\b"]),

    ],

    "Portfolio": [

        (4, [r"\bdeveloper portfolio\b", r"\bportfolio website\b", r"\bdesign portfolio\b",

             r"\bpersonal portfolio\b", r"\bportfolio\b"]),

        (3, [r"\bproject showcase\b", r"\bselected projects\b", r"\bcase studies\b",

             r"\bmy projects?\b", r"\babout me\b"]),

        (2, [r"\bresume\b", r"\bcurriculum vitae\b", r"\bcv\b", r"\bpersonal website\b"]),

    ],

    "Streaming": [

        (4, [r"\bvideo streaming\b", r"\blive streaming\b", r"\bstreaming platform\b",

             r"\bvideo on demand\b", r"\bvod platform\b", r"\baudio streaming\b",

             r"\bmusic streaming\b", r"\bstreaming service\b"]),

        (3, [r"\bvideo player\b", r"\bmedia playback\b", r"\bwatch now\b",

             r"\bpodcasts?\b", r"\blivestream(?:ing)?\b"]),

        (2, [r"\bmedia catalog(?:ue)?\b", r"\btranscoding\b", r"\bhls\b", r"\bwebrtc\b"]),

    ],

}





def classify_application_type(project_facts):

    """Return (category, confidence, evidence); category is None when ambiguous."""

    text = _project_evidence_text(project_facts)

    if not text:

        return None, "low", []



    scores = {}

    matched_groups = {}

    for category, groups in APP_SIGNAL_GROUPS.items():

        score = 0

        matches = []

        for weight, patterns in groups:

            found = []

            for pattern in patterns:

                match = re.search(pattern, text)

                if match:

                    found.append(match.group(0).strip())

            if found:

                score += weight

                matches.append(found[0])

        scores[category] = score

        matched_groups[category] = matches



    ranked = sorted(scores.items(), key=lambda pair: pair[1], reverse=True)

    best_type, best_score = ranked[0]

    second_score = ranked[1][1] if len(ranked) > 1 else 0



    # Require multiple independent signal groups and a meaningful lead.

    if best_score < 5 or len(matched_groups[best_type]) < 2:

        return None, "low", []

    if best_score - second_score < 2:

        return None, "low", []



    confidence = "high" if best_score >= 8 and best_score - second_score >= 4 else "medium"

    evidence = [

        f"{best_type} signal detected: {signal}"

        for signal in matched_groups[best_type]

    ]

    return best_type, confidence, evidence





def _base_analysis(project_facts, app_type=None, confidence="low", evidence=None):

    frameworks = project_facts.get("frameworks") or []

    endpoints = project_facts.get("api_endpoint_count") or 0

    dbs = project_facts.get("databases_detected") or []

    has_container = bool(

        project_facts.get("dockerfile_detected")

        or (project_facts.get("docker_compose_service_count") or 0) > 0

    )

    orchestrated = True if project_facts.get("kubernetes_detected") is True else (

        False if project_facts.get("kubernetes_detected") is False else None

    )

    if endpoints >= 15 or (len(frameworks) >= 3 and len(dbs) >= 2):

        complexity = "high"

    elif endpoints >= 4 or len(frameworks) >= 2 or len(dbs) >= 1:

        complexity = "medium"

    elif project_facts.get("files_scanned", 0) > 0:

        complexity = "low"

    else:

        complexity = "unknown"



    return {

        "application_type": app_type,

        "architecture_complexity": complexity,

        "database_intensity": "unknown",

        "background_processing": (

            bool(project_facts.get("background_workers_detected"))

            if "background_workers_detected" in project_facts else None

        ),

        "containerized": has_container,

        "orchestrated": orchestrated,

        "ml_workload_detected": bool(project_facts.get("ml_libraries_detected")),

        "expected_users_per_day": None,

        "concurrent_users": None,

        "deployment_region": None,

        "storage_required_gb": None,

        "traffic_pattern": None,

        "evidence": list(evidence or []),

        "unknown_fields": [

            field for field in (

                "expected_users_per_day", "concurrent_users", "deployment_region",

                "storage_required_gb", "traffic_pattern",

            )

        ] + (["application_type"] if app_type is None else []),

        "confidence": confidence,

    }





def validate_workload_analysis(analysis: dict, project_facts: dict) -> dict:

    """Validate model output, then enforce reliable static facts and unknowns."""

    if not isinstance(analysis, dict):

        analysis = {}

    result = dict(analysis)



    inferred_type, rule_confidence, rule_evidence = classify_application_type(project_facts)

    model_type = result.get("application_type")

    if model_type not in APPLICATION_TYPES:

        model_type = None



    model_confidence = str(result.get("confidence", "low")).casefold()

    model_evidence = result.get("evidence")

    has_model_evidence = isinstance(model_evidence, list) and any(

        isinstance(item, dict) and str(item.get("quote", "")).strip()

        for item in model_evidence

    )

    if inferred_type and rule_confidence in {"medium", "high"}:

        # When independent static-signal groups agree with a meaningful margin,

        # prefer them over a model label. A merely verbatim quote is not proof

        # that the quote actually supports the model's chosen category.

        result["application_type"] = inferred_type

        result["confidence"] = rule_confidence

        result["evidence"] = list(model_evidence or []) + rule_evidence

    elif model_type and model_confidence in {"medium", "high"} and has_model_evidence:

        # Use Ollama only when deterministic signals cannot confidently decide.

        result["application_type"] = model_type

    else:

        result["application_type"] = None

        result["confidence"] = "low"

        result["evidence"] = []



    result["containerized"] = bool(

        project_facts.get("dockerfile_detected")

        or (project_facts.get("docker_compose_service_count") or 0) > 0

    )

    if project_facts.get("kubernetes_detected") is True:

        result["orchestrated"] = True

    elif project_facts.get("kubernetes_detected") is False:

        result["orchestrated"] = False

    if "background_workers_detected" in project_facts:

        result["background_processing"] = bool(project_facts["background_workers_detected"])

    if not project_facts.get("ml_libraries_detected"):

        result["ml_workload_detected"] = False



    # Static source code cannot prove real traffic, storage, region, or DB intensity.

    result["database_intensity"] = "unknown"

    for field in ("expected_users_per_day", "concurrent_users", "deployment_region",

                  "storage_required_gb", "traffic_pattern"):

        result[field] = None



    unknown = result.get("unknown_fields", [])

    if not isinstance(unknown, list):

        unknown = []

    for field in ("expected_users_per_day", "concurrent_users", "deployment_region",

                  "storage_required_gb", "traffic_pattern"):

        if field not in unknown:

            unknown.append(field)

    if result.get("application_type") is None:

        if "application_type" not in unknown:

            unknown.append("application_type")

    else:

        unknown = [field for field in unknown if field != "application_type"]

    result["unknown_fields"] = unknown

    if not isinstance(result.get("evidence"), list):

        result["evidence"] = []

    return result







def _compact_model_context(project_facts, max_chars=14000):

    """Build a bounded, prioritized context; never serialize the whole scan report."""

    signals = list(project_facts.get("project_text_signals") or [])

    def rank(item):

        path = str(item.get("file", "")).casefold()

        name = path.rsplit("/", 1)[-1]

        if name.startswith("readme"):

            return 0

        if name in {"package.json", "pyproject.toml", "requirements.txt", "pom.xml", "cargo.toml", "go.mod", "composer.json", "gemfile"}:

            return 1

        if name in {"index.html", "app.py", "main.py", "app.vue", "app.jsx", "app.tsx", "main.js", "main.ts"}:

            return 2

        if any(part in path for part in ("/models/", "/routes/", "/controllers/", "/views/", "/components/", "/pages/", "/features/", "/api/")):

            return 3

        return 4

    signals.sort(key=rank)

    compact_signals = []

    used = 0

    for item in signals:

        if not isinstance(item, dict):

            continue

        path = str(item.get("file", ""))[:180]

        excerpt = re.sub(r"\s+", " ", str(item.get("text_excerpt", ""))).strip()

        excerpt = excerpt[:1600]

        room = max_chars - used - len(path) - 30

        if room <= 0:

            break

        excerpt = excerpt[:room]

        if excerpt:

            compact_signals.append({"file": path, "excerpt": excerpt})

            used += len(path) + len(excerpt) + 30

    pages = []

    for page in (project_facts.get("html_content_signals") or [])[:8]:

        if not isinstance(page, dict):

            continue

        pages.append({

            "file": str(page.get("file", ""))[:150],

            "title": str(page.get("title", ""))[:200],

            "description": [str(x)[:200] for x in (page.get("description") or [])[:2]],

            "headings": [str(x)[:150] for x in (page.get("headings") or [])[:8]],

            "text_excerpt": re.sub(r"\s+", " ", str(page.get("text_excerpt", "")))[:500],

        })

    endpoints = [

        {k: v for k, v in route.items() if k in {"method", "path", "function", "file"}}

        for route in (project_facts.get("api_endpoints") or [])

        if isinstance(route, dict) and not _is_test_path(str(route.get("file", "")))

    ][:25]

    return {

        "repository_name": project_facts.get("project_root_name"),

        "files_scanned": project_facts.get("files_scanned"),

        "scan_truncated": project_facts.get("file_scan_limit_reached", False),

        "languages": (project_facts.get("languages") or [])[:12],

        "frameworks": (project_facts.get("frameworks") or [])[:12],

        "databases": (project_facts.get("databases_detected") or [])[:8],

        "api_endpoint_count_non_test": len(endpoints),

        "api_endpoints_sample": endpoints,

        "dockerfile_detected": project_facts.get("dockerfile_detected"),

        "docker_compose_service_count": project_facts.get("docker_compose_service_count"),

        "kubernetes_detected": project_facts.get("kubernetes_detected"),

        "background_workers_detected": project_facts.get("background_workers_detected"),

        "ml_libraries_detected": (project_facts.get("ml_libraries_detected") or [])[:10],

        "html_pages": pages,

        "source_evidence": compact_signals,

    }





def _is_test_path(path):

    normalized = "/" + str(path).replace("\\", "/").casefold().strip("/") + "/"

    name = normalized.rsplit("/", 2)[-2] if normalized.endswith("/") else normalized.rsplit("/", 1)[-1]

    return any(part in normalized for part in ("/tests/", "/test/", "/__tests__/", "/fixtures/", "/mocks/")) or name.startswith("test_") or ".test." in name or ".spec." in name





def _has_grounded_model_evidence(analysis, compact_facts, expected_type=None):

    """Require exact source quotes and reject evidence that clearly supports another type.



    A single arbitrary quote is not enough. Prefer a quote set that independently

    supports the same category through static signals; otherwise require multiple

    grounded quotes from distinct non-test files for the local model's semantic

    interpretation to be considered.

    """

    evidence = analysis.get("evidence")

    if not isinstance(evidence, list) or not evidence:

        return False



    source_by_path = {}

    for item in compact_facts.get("source_evidence", []):

        if isinstance(item, dict):

            source_by_path[item.get("file", "")] = item.get("excerpt", "")

    for page in compact_facts.get("html_pages", []):

        if isinstance(page, dict):

            path = page.get("file", "")

            source_by_path[path] = " ".join([

                page.get("title", ""), *page.get("description", []),

                *page.get("headings", []), page.get("text_excerpt", "")

            ])



    grounded = []

    for item in evidence:

        if not isinstance(item, dict):

            continue

        path = str(item.get("file", ""))

        quote = str(item.get("quote", "")).strip()

        source = source_by_path.get(path, "")

        if (

            len(quote) >= 12

            and quote.casefold() in source.casefold()

            and not _is_test_path(path)

        ):

            grounded.append((path, quote))



    if not grounded:

        return False



    # If the cited fragments themselves strongly indicate a different category,

    # do not let an unrelated but verbatim quote validate the model's label.

    quote_facts = {

        "project_text_signals": [

            {"file": path, "text_excerpt": quote} for path, quote in grounded

        ],

        "frameworks": [],

        "files_sample": [],

        "evidence": [],

    }

    quoted_type, quoted_confidence, _ = classify_application_type(quote_facts)

    if quoted_type and quoted_confidence in {"medium", "high"}:

        return quoted_type == expected_type



    # When deterministic signals are inconclusive, require corroboration across

    # independent files rather than trusting one generic quote.

    distinct_paths = {path for path, _ in grounded}

    return len(distinct_paths) >= 2



def analyze_project_facts(project_facts: dict) -> dict:

    """

    Fast path: confidently classify with static evidence and skip Ollama.

    Ambiguous projects use Ollama as a fallback. Manual-input/Random Forest

    prediction is a separate endpoint and is not changed by this service.

    """

    rule_type, rule_confidence, rule_evidence = classify_application_type(project_facts)

    if rule_type and rule_confidence == "high":

        return _base_analysis(project_facts, rule_type, rule_confidence, rule_evidence)



    valid_types = ", ".join(sorted(APPLICATION_TYPES))

    # Strictly bounded context prevents large repositories from creating huge prompts.

    compact_facts = _compact_model_context(project_facts)

    prompt = f"""

You classify software repositories for a cloud cost analysis tool.

Choose exactly one best-supported label from this fixed list, or null if evidence is insufficient:

{valid_types}



Use repository purpose and behavior, not framework names alone. Evidence can come from project descriptions,

README text, manifest metadata, UI components, page copy, domain entities, routes, and service logic.

Different languages and architectures can implement the same application category. A frontend-only site

can be classified if its actual content supports a category. Do not require any particular filename or framework.

Do not classify from generic words alone. Ignore test-only examples, sample fixtures, unrelated dependencies,

and incidental keyword matches. When evidence conflicts, explain the conflict and lower confidence.



Return JSON with: application_type, architecture_complexity, database_intensity, background_processing,

containerized, orchestrated, ml_workload_detected, expected_users_per_day, concurrent_users,

deployment_region, storage_required_gb, traffic_pattern, evidence, unknown_fields, confidence.

For application_type, use one listed label or null. confidence must be low/medium/high.

For evidence, return up to 3 objects with keys "file" and "quote". Quotes must be short, verbatim substrings

from the supplied source evidence. Do not invent filenames or quotes. If no direct supporting quote exists,

return application_type=null and confidence=low.

Never infer actual traffic, users, concurrency, region, storage, CPU, RAM, or database intensity from code.

Keep those values null (database_intensity="unknown"). Docker Compose indicates containerization, not necessarily

orchestration. Do not treat a missing config as proof of absence unless the static report explicitly says false.



BOUNDED REPOSITORY EVIDENCE:

{json.dumps(compact_facts, ensure_ascii=False)}

"""

    payload = {

        "model": OLLAMA_MODEL,

        "messages": [

            {"role": "system", "content": "Classify software projects conservatively using evidence. Never fabricate measurements."},

            {"role": "user", "content": prompt},

        ],

        "format": "json",

        "stream": False,

        "options": {"temperature": 0},

    }

    request = urllib.request.Request(

        OLLAMA_URL, data=json.dumps(payload).encode("utf-8"),

        headers={"Content-Type": "application/json"}, method="POST",

    )

    try:

        with urllib.request.urlopen(request, timeout=60) as response:

            result = json.loads(response.read().decode("utf-8"))

        analysis = json.loads(result.get("message", {}).get("content", ""))

        if not isinstance(analysis, dict):

            raise ValueError("Ollama did not return a JSON object.")

        analysis = validate_workload_analysis(analysis, project_facts)

        # Do not accept a confident-looking label without grounded evidence.

        if analysis.get("application_type") and not _has_grounded_model_evidence(analysis, compact_facts, analysis.get("application_type")):

            if rule_type:

                return _base_analysis(project_facts, rule_type, rule_confidence, rule_evidence)

            analysis["application_type"] = None

            analysis["confidence"] = "low"

            analysis["evidence"] = []

            if "application_type" not in analysis.get("unknown_fields", []):

                analysis.setdefault("unknown_fields", []).append("application_type")

        return analysis



    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError, ValueError) as exc:

        print(f"[Ollama] Analysis failed: {type(exc).__name__}: {exc}")

        if isinstance(exc, urllib.error.HTTPError):

            print(f"[Ollama] HTTP status: {exc.code}")

            print(f"[Ollama] Response body: {exc.read().decode('utf-8', errors='replace')}")



        # Analysis should fail safely instead of leaving the UI spinning or returning a guessed label.

        if rule_type:

            return _base_analysis(project_facts, rule_type, rule_confidence, rule_evidence)

        return _base_analysis(

            project_facts,

            None,

            "low",

            ["Automatic classification could not be confirmed; review the project evidence."]

        )
