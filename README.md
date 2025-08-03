# Customer Claims Portal

## Requirements:

- Node.js ≥ 18
- npm

## High level overview

**Workflow alignment**
- The project demonstrates how to align a UI and a N8N workflow using webhooks, wait and respond-to-webhook nodes and the resumeUrl in order to create interaction cycles handing over control from an UI status workflow to N8N wait and respond-to webhook loops and vice versa.

**Components**
- index.html represents the UI
- index.js acts as a proxy-middleware webserver
- N8N acts as the backend

 
**Wait Nodes**
- wait nodes are similar to form nodes and human-in-the-loop nodes in n8n but they give more flexibility to design user interfaces in line with the ui-policies and ui-themes of a company

- form-submission node 
- human-in-the-loop nodes

- wait node

They are based on

- webhooks which are api-calls and act like a http-request as a basic api-call

**Pattern**
1. Initialization
Initialization by webhook node that when triggered by UI with the known webhook Url generates a unique process specific $execution.resumeUrl (in any case even when there is no wait node) and starts workflow 
Respond-to-webhook node sends resumeUrl back to the third party UI (maybe even first payload)

2. Loop:
wait-Node gets triggered by the UI sending the resumeUrl of the last respond-to-webhook node, receives input data from the UI and generates the resumeUrl for the next wait node (or is it generated once and will be consumed by the next active wait node)
N8N workflow nodes process input data and create the payload for the next respond-to-webhook node
respond-to-webhook Node sends back the payload for the UI and the resumeUrl to trigger the next wait node

3. Step out
after last respond-to-webhook node (confirmation everything went well or not) do something or nothing or receiving some last data from ui (send eMail but do not expect a confirmation) and step out after wait node

![N8N workflow cycles](docs/n8n-workflow-cycles.jpg)

![N8N workflow cycles planning](docs/n8n-workflow.jpg)

**Advantage of this workflow concept**
Because we have a single workflow we can access any data of any step even we would wait for months at some wait node for the workflow to be resumed.

## Tutorial and Documentation

This project follows the youtube tutorials of Bart Slodyczka

[https://www.youtube.com/watch?v=9Po584wKXAM](https://www.youtube.com/watch?v=9Po584wKXAM)
[https://www.youtube.com/watch?v=3hvNCeWDdKQ](https://www.youtube.com/watch?v=3hvNCeWDdKQ)

## Special attention

This error:

```
TypeError: Response body object should not be disturbed or locked
    at node:internal/deps/undici/undici:13510:13
```
means that the Express req stream is being read twice for the same request.

1. Double-check for global body parsers
Make sure you have no app.use(express.json()) or app.use(express.urlencoded()) anywhere in your code, even commented out or in other files.
2. Check for route-specific body parsers
Only /api/start-workflow should use express.json().
/api/resume-workflow should not use any body parser.

## .env
```
N8N_WEBHOOK_URL=your-initial-n8n-webhook-here (change this URL once N8N gets out of test mode and in production)
```

## git and github:
```
git init
git remote add origin https://github.com/yourusername/customer-claims-portal.git
git add .
git commit -m "Initial commit: Customer Claims Portal"
git branch -M main
git push -u origin main
```

## Run frontend locally
```
cd customer-claims-portal
npm install
npm run dev
```

Access frontend via [http://localhost:5000/](http://localhost:5000/)

## Run N8N workflow (test and production)

Be aware that in test mode you have to execute workflow manually for each test cycle
```
[N8N 2025-07-29 Customer Claims Portal](https://jn2atbn3.rpcld.cc/workflow/I4F2Ny5WAIfd85YW)
```
## Deployment
**Deployment**

**Run frontend in production**
```
Set N8N_WEBHOOK_URL using the Production webhook URL of the "N8N 2025-07-29 Customer Claims Portal" workflow

More instructions coming

```
**Run N8N in production**
```
Activate "N8N 2025-07-29 Customer Claims Portal"

```