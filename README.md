# Turing-IA - GCP & Workspace Trial Period

Repository for the technical challenges of the GCP | Workspace trial period at Turing Inteligencia Artificial.

## Day 1 - GCP Infrastructure Setup

### Prerequisites

- A Google Cloud account with billing enabled
- `gcloud` CLI (or just the Cloud Console, which is what this project used)
- Node.js 22+ and npm
- A GitHub account

### Setup steps (reproducible walkthrough)

1. Create a new GCP project (`turing-ia-514921`).
2. Enable the required APIs: Cloud Storage, Cloud Functions, Cloud Pub/Sub, Cloud Logging, Cloud Resource Manager, Eventarc.
3. In IAM, grant a test principal the **Viewer** role (project-level) to simulate least-privilege access.
4. Create the Cloud Storage bucket (`turing-ia-bucket-test`) with:
   - Region: `us-central1`, Standard storage class
   - Uniform bucket-level access + public access prevention
   - A lifecycle rule: delete objects older than 30 days
   - Grant the same test principal **Storage Object Viewer** at the bucket level
5. Write the Cloud Function (`index.js` + `package.json`) and push it to this repository.
6. Connect this repository to Cloud Build (Triggers → Connect Repository → GitHub App).
7. Create a Cloud Build trigger on push to `main`, pointing to `cloudbuild.yaml`.
8. Grant `roles/pubsub.publisher` to the Cloud Storage service agent — required once per project for Storage-triggered Eventarc triggers.
9. Push to `main` → Cloud Build deploys the function automatically.
10. Validate end-to-end by uploading a file to the bucket and checking the function's logs.

### Screenshots

Cloud Function log after uploading a file ![alt text](success.png)

### Architecture

```
Cloud Storage bucket (turing-ia-bucket-test)
        │  object finalized event
        ▼
Eventarc trigger
        │
        ▼
Cloud Function (process-bucket-upload, Node.js 22, 2nd gen)
        │  extracts metadata (name, size, type, timestamp)
        ▼
Cloud Logging (structured JSON logs)
```

### Resources created

- **GCP Project:** `turing-ia-514921`
- **Bucket:** `turing-ia-bucket-test` (us-central1, Standard class, uniform access, public access prevention enabled)
  - Lifecycle rule: delete objects older than 30 days
  - Fine-grained access: a test principal holds project-level `Viewer` plus bucket-level `Storage Object Viewer`
- **Cloud Function:** `process-bucket-upload` — triggered by `google.cloud.storage.object.v1.finalized` on the bucket above

### CI/CD

Deployment is automated with a **Cloud Build trigger** connected to this GitHub repository: every push to `main` runs `cloudbuild.yaml`, which deploys the function via `gcloud functions deploy`.

### Local development

```bash
npm install
npm test        # runs unit tests (Node's built-in test runner)
```

### Manual end-to-end test

1. Upload any file to the `turing-ia-bucket-test` bucket.
2. Check **Cloud Functions → process-bucket-upload → Logs** — a structured log entry should appear with the file's metadata within a few seconds.

### Design decisions

- **`console.log` / `console.error` instead of a logging client library:** Cloud Functions/Cloud Run automatically capture stdout/stderr into Cloud Logging. Writing structured JSON with a `severity` field lets Cloud Logging parse and filter logs correctly without adding an extra dependency.
- **Least privilege:** the test IAM principal only has `Viewer` (project) and `Storage Object Viewer` (bucket) — read-only, following the principle of least privilege instead of granting Editor/Owner.
- **Node.js 22 runtime:** Node 18 and 20 are no longer supported for Cloud Functions 2nd gen at the time of this challenge; 22 is the current minimum available.

### Issues found and resolved

| Problem | Cause | Fix |
| --- | --- | --- |
| Build failed on `logs_bucket` config | Custom service account selected without a logging destination | Added `options: logging: CLOUD_LOGGING_ONLY` to `cloudbuild.yaml` |
| `nodejs18` / `nodejs20` rejected as runtime | Deprecated for Cloud Functions 2nd gen | Switched to `nodejs22` |
| Cloud Resource Manager API disabled | Not enabled by default on a new project | Enabled via Console |
| Eventarc API disabled | Not enabled by default on a new project | Enabled via Console |
| `storage.buckets.get` denied when creating the trigger | Cloud Storage's service agent lacked permission to publish events to Pub/Sub | Granted `roles/pubsub.publisher` to `service-<PROJECT_NUMBER>@gs-project-accounts.iam.gserviceaccount.com` |

## Repository structure

```
.
├── index.js          # Cloud Function source
├── package.json
├── cloudbuild.yaml    # CI/CD pipeline (Cloud Build)
├── test/
│   └── index.test.js  # Unit tests
└── README.md
```